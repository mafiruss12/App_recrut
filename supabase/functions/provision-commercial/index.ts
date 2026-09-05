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

function createCode(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 100000000).padStart(8, '0');
}

async function fingerprint(code: string): Promise<string> {
  const pepper = Deno.env.get('CODE_PEPPER') ?? 'configure-a-real-code-pepper';
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${pepper}:${code}`));
  return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData } = await userClient.auth.getUser();
  if (!authData.user) return json({ error: 'Unauthorized' }, 401);

  const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: caller } = await adminClient.from('commerciaux').select('id,organization_id,role,is_active').eq('user_id', authData.user.id).maybeSingle();
  if (!caller || !caller.is_active || !['admin', 'manager', 'super_admin'].includes(caller.role)) return json({ error: 'Forbidden' }, 403);

  const body = await request.json();
  const organizationId = String(body.organization_id ?? '');
  if (!organizationId || (caller.role !== 'super_admin' && caller.organization_id !== organizationId)) return json({ error: 'Organisation non autorisée' }, 403);

  const phone = normalizePhone(String(body.phone ?? ''));
  const name = String(body.name ?? '').trim().slice(0, 255);
  if (!/^\+225\d{10}$/.test(phone) || !name) return json({ error: 'Numéro ivoirien et nom obligatoires' }, 400);

  let code = '';
  let codeFingerprint = '';
  let authUserId = '';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    code = createCode();
    codeFingerprint = await fingerprint(code);
    const { data: existing } = await adminClient.from('commerciaux').select('id').eq('access_code_fingerprint', codeFingerprint).maybeSingle();
    if (!existing) break;
  }

  const { data: createdAuth, error: authError } = await adminClient.auth.admin.createUser({
    phone,
    password: code,
    phone_confirm: true,
    user_metadata: { role: 'commercial', organization_id: organizationId },
  });
  if (authError || !createdAuth.user) return json({ error: authError?.message ?? 'Auth user creation failed' }, 400);
  authUserId = createdAuth.user.id;

  const { data: profile, error: profileError } = await adminClient.from('commerciaux').insert({
    user_id: authUserId,
    organization_id: organizationId,
    phone,
    access_code_fingerprint: codeFingerprint,
    name,
    cabinet: String(body.cabinet ?? '').trim().slice(0, 150),
    localite: String(body.localite ?? '').trim().slice(0, 150),
    role: 'commercial',
    is_active: true,
  }).select('id,user_id,organization_id,phone,name,localite,cabinet,partenaire,action,role,is_active,created_at,last_active_at').single();

  if (profileError || !profile) {
    await adminClient.auth.admin.deleteUser(authUserId);
    return json({ error: profileError?.message ?? 'Profile creation failed' }, 400);
  }

  return json({ profile, code });
});
