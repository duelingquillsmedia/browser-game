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

/**
 * Safe-to-display diagnostics for the "Configuration Needed" screen — no
 * secrets, just enough to tell at a glance whether the hosting env actually
 * has these vars, and to catch a truncated/malformed value without leaking
 * the whole key.
 */
export const supabaseConfigDebug = {
  mode: import.meta.env.MODE,
  urlPresent: Boolean(url),
  urlPreview: url ? `${url.slice(0, 24)}…` : "(not set)",
  publishableKeyPresent: Boolean(publishableKey),
  publishableKeyPreview: publishableKey ? `${publishableKey.slice(0, 14)}…` : "(not set)",
};

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  publishableKey || "placeholder-key"
);
