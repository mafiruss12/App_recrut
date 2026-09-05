import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function normalizePhone(value: string): string {
  let clean = value.replace(/\D/g, '');
  if (clean.startsWith('00225')) clean = clean.slice(5);
  else if (clean.startsWith('225') && clean.length > 10) clean = clean.slice(3);
  return clean.length === 10 ? `+225${clean}` : value.trim();
}

function temporaryPassword(): string {
  const values = new Uint32Array(3);
  crypto.getRandomValues(values);
  return `K2L-${values[0].toString(36)}-${values[1].toString(36)}${values[2].toString(36)}`.slice(0, 18);
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
  const { data: authData } = await userClient.auth.getUser();
  if (!authData.user) return json({ error: 'Unauthorized' }, 401);

  const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: caller } = await adminClient.from('commerciaux').select('role,is_active').eq('user_id', authData.user.id).maybeSingle();
  if (!caller || caller.role !== 'super_admin' || !caller.is_active) return json({ error: 'Super administrator required' }, 403);

  const body = await request.json();
  const organizationId = String(body.organization_id ?? '');
  const phone = normalizePhone(String(body.phone ?? ''));
  const name = String(body.name ?? '').trim().slice(0, 255);
  if (!organizationId || !/^\+225\d{10}$/.test(phone) || !name) return json({ error: 'Organisation, numéro et nom obligatoires' }, 400);

  const password = temporaryPassword();
  const { data: createdAuth, error: authError } = await adminClient.auth.admin.createUser({ phone, password, phone_confirm: true, user_metadata: { role: 'admin', organization_id: organizationId } });
  if (authError || !createdAuth.user) return json({ error: authError?.message ?? 'Auth user creation failed' }, 400);

  const { data: profile, error: profileError } = await adminClient.from('commerciaux').insert({ user_id: createdAuth.user.id, organization_id: organizationId, phone, name, role: 'admin', is_active: true }).select('id,user_id,organization_id,phone,name,localite,cabinet,partenaire,action,role,is_active,created_at,last_active_at').single();
  if (profileError || !profile) {
    await adminClient.auth.admin.deleteUser(createdAuth.user.id);
    return json({ error: profileError?.message ?? 'Profile creation failed' }, 400);
  }

  return json({ profile, temporary_password: password });
});
