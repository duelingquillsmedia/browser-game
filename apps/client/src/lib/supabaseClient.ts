import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * False when the env vars aren't set (e.g. a fresh checkout without
 * apps/client/.env). Checked by App.tsx before anything tries to use
 * `supabase`, so a missing config shows a clear message instead of a
 * blank page — this file must never throw at import time, since that
 * happens before React has mounted anything to catch it.
 */
export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  publishableKey || "placeholder-key"
);
