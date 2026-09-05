import { createClient } from '@supabase/supabase-js';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

/**
 * Only the public Supabase URL and anon key belong in a browser bundle.
 * The service-role key must never be added here or committed to the repository.
 */
export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY ?? '';
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Keep module imports safe when someone opens the UI before configuring .env.
const clientUrl = SUPABASE_URL || 'https://placeholder.supabase.co';
const clientKey = SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-application-name': 'k2l-recrut-pwa',
    },
  },
});

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  tablesReady: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return {
      connected: false,
      tablesReady: false,
      error: 'Supabase n’est pas configuré. Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const { error } = await supabase.from('clients').select('id').limit(1);
    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return {
          connected: true,
          tablesReady: false,
          error: 'Les tables Supabase ne sont pas encore créées. Appliquez le schéma SQL.',
        };
      }
      return { connected: false, tablesReady: false, error: error.message };
    }

    return { connected: true, tablesReady: true };
  } catch (error) {
    return {
      connected: false,
      tablesReady: false,
      error: error instanceof Error ? error.message : 'Connexion Supabase impossible.',
    };
  }
}
