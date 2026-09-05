import { createClient } from '@supabase/supabase-js';

// Project credentials provided by the user
export const SUPABASE_URL = 'https://wfeygwvvvyjomyahdgrc.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmZXlnd3Z2dnlqb215YWhkZ3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzODIwMzksImV4cCI6MjEwMzk1ODAzOX0._5X6_aUOYm6Id2S4l_67em0loXSF1qcwfR2b-B-2z_0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-application-name': 'k2l-recrut-pwa',
    },
  },
});

/**
 * Checks if Supabase connection is healthy and if tables are ready.
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  tablesReady: boolean;
  error?: string;
}> {
  try {
    const start = Date.now();
    const { data, error } = await supabase.from('clients').select('id').limit(1);
    const latency = Date.now() - start;

    if (error) {
      // If code is 42P01 (relation does not exist) or 404
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return {
          connected: true,
          tablesReady: false,
          error: 'Les tables Supabase ne sont pas encore créées (SQL à exécuter).',
        };
      }
      return { connected: false, tablesReady: false, error: error.message };
    }

    return { connected: true, tablesReady: true };
  } catch (err: any) {
    return {
      connected: false,
      tablesReady: false,
      error: err?.message || 'Connexion réseau impossible vers Supabase',
    };
  }
}
