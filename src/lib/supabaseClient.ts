import { createBrowserClient } from '@supabase/ssr';

export const supabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

if (!supabaseConfigured) {
  console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set.');
}

const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export const supabase = createBrowserClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  { cookieOptions: { maxAge: SESSION_MAX_AGE_SECONDS } },
);
