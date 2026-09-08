import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://wfeygwvvvyjomyahdgrc.supabase.co';

export const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmZXlnd3Z2dnlqb215YWhkZ3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzODIwMzksImV4cCI6MjEwMzk1ODAzOX0._5X6_aUOYm6Id2S4l_67em0loXSF1qcwfR2b-B-2z_0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  tablesReady: boolean;
  latencyMs?: number;
}> {
  const t0 = performance.now();
  try {
    const { error } = await supabase.from('commerciaux').select('id', { count: 'exact', head: true });
    const latencyMs = Math.round(performance.now() - t0);
    if (error) return { connected: false, tablesReady: false, latencyMs };
    return { connected: true, tablesReady: true, latencyMs };
  } catch {
    return { connected: false, tablesReady: false };
  }
}
