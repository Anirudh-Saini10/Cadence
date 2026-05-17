import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Don't crash the bundle — surface a clear UI error in the auth screen instead.
  // eslint-disable-next-line no-console
  console.warn(
    "[cadence] Supabase env vars missing. Copy .env.example to .env and fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY."
  );
}

// Untyped client — we use hand-written Row types in @/types/database and cast
// .select() results explicitly. Avoids fighting supabase-js's strict generic
// inference for hand-typed schemas.
export const supabase = createClient(
  url ?? "http://localhost:54321",
  anonKey ?? "public-anon-key-missing",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const isSupabaseConfigured = Boolean(url && anonKey);
