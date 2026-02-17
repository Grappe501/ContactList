import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function getNextPath() {
  const url = new URL(window.location.href);
  const next = url.searchParams.get("next");
  // only allow internal redirects
  if (next && next.startsWith("/")) return next;
  return "/contacts";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const nextPath = useMemo(() => getNextPath(), []);

  // If already logged in, bounce to app
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace(nextPath);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) window.location.replace(nextPath);
    });

    return () => sub.subscription.unsubscribe();
  }, [nextPath]);

  async function loginPassword() {
    try {
      setBusy(true);
      setMsg("Signing in…");
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setMsg(error.message);
      else setMsg("Signed in. Redirecting…");
    } finally {
      setBusy(false);
    }
  }

  async function sendMagicLink() {
    try {
      setBusy(true);
      setMsg("Sending magic link…");
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // where the magic link will return to
          emailRedirectTo: `${window.location.origin}${nextPath}`,
        },
      });
      setMsg(error ? error.message : "Check your email for the login link.");
    } finally {
      setBusy(false);
    }
  }

  async function signInGoogle() {
    try {
      setBusy(true);
      setMsg("Opening Google sign-in…");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${nextPath}`,
        },
      });
      if (error) setMsg(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "80px auto", border: "1px solid #ddd", padding: 16 }}>
      <h2>Sign in</h2>
      <p style={{ color: "#666" }}>
        This is a private campaign CRM. Sign in to continue.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={signInGoogle} disabled={busy}>
          Sign in with Google
        </button>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <label>
        Email
        <input
          style={{ width: "100%" }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@campaign.org"
          autoComplete="email"
        />
      </label>

      <div style={{ height: 12 }} />

      <label>
        Password (optional)
        <input
          style={{ width: "100%" }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </label>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button disabled={busy || !email.trim() || !password} onClick={loginPassword}>
          Sign in
        </button>
        <button disabled={busy || !email.trim()} onClick={sendMagicLink}>
          Send magic link
        </button>
      </div>

      {!!msg && <p style={{ color: "#666", marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
