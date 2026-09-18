import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";

export interface AuthScreenProps {
  onAuthenticated: () => void;
}

type Mode = "sign-in" | "sign-up";

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode() {
    setMode((m) => (m === "sign-in" ? "sign-up" : "sign-in"));
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      if (mode === "sign-up") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (data.session) {
          onAuthenticated();
        } else {
          setInfo("Account created — check your email to confirm it, then sign in.");
          setMode("sign-in");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onAuthenticated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen auth-screen">
      <h1>{mode === "sign-in" ? "Welcome Back" : "Create an Account"}</h1>
      <p className="subtitle">
        {mode === "sign-in" ? "Sign in to see your heroes." : "One account, every hero you forge in Eridan."}
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? "Please wait…" : mode === "sign-in" ? "Sign In" : "Sign Up"}
        </button>
      </form>

      <button type="button" className="ghost" onClick={switchMode}>
        {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
