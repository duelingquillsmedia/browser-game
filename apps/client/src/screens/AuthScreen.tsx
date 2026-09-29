import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../theme/aow-theme.css";
import "./AuthScreen.css";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

export interface AuthScreenProps {
  onBack: () => void;
}

export function AuthScreen({ onBack }: AuthScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setSubmitting(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) {
      setError(oauthError.message);
      setSubmitting(false);
    }
    // On success the browser navigates away to Google, so there's nothing
    // more to do here — App.tsx picks the session back up after the
    // redirect via supabase.auth.onAuthStateChange.
  }

  return (
    <div className="aow aow-auth">
      <div className="aow-auth-rings" />
      <button type="button" className="aow-auth-nav-link" onClick={onBack}>
        ‹ TITLE
      </button>

      <div className="aow-auth-content">
        <div className="aow-auth-divider">᛭ ᛭ ᛭</div>
        <h1 className="aow-auth-heading">Sign In</h1>
        <p className="aow-auth-subtitle">Continue with Google to create or access your account.</p>

        <button type="button" className="aow-auth-google-button" disabled={submitting} onClick={handleGoogleSignIn}>
          <GoogleIcon />
          {submitting ? "Redirecting…" : "Continue with Google"}
        </button>

        {error && <p className="aow-warning aow-auth-error">{error}</p>}
      </div>
    </div>
  );
}
