/** Client Supabase service_role — serveur uniquement */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getServiceClient(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://wfeygwvvvyjomyahdgrc.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let clean = String(rawPhone).replace(/[^0-9]/g, '');
  if (clean.startsWith('00225')) clean = clean.substring(5);
  else if (clean.startsWith('225') && clean.length > 8) clean = clean.substring(3);
  return clean;
}

export async function resolveSession(
  sb: SupabaseClient,
  token: string | undefined
): Promise<{ id: string; role: string; name: string; phone: string } | null> {
  if (!token) return null;
  const { data } = await sb
    .from('commerciaux')
    .select('id, role, name, phone, session_token, session_expires_at, is_active')
    .eq('session_token', token)
    .maybeSingle();
  if (!data || !data.is_active) return null;
  if (data.session_expires_at && new Date(data.session_expires_at).getTime() < Date.now()) {
    return null;
  }
  return {
    id: data.id,
    role: data.role || 'commercial',
    name: data.name || '',
    phone: data.phone || '',
  };
}
