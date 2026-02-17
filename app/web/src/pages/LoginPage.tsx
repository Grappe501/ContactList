import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function loginPassword() {
    setMsg("Signing in…");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMsg(error ? error.message : "Signed in.");
  }

  async function sendMagicLink() {
    setMsg("Sending magic link…");
    const { error } = await supabase.auth.signInWithOtp({ email });
    setMsg(error ? error.message : "Check your email for the login link.");
  }

  return (
    <div style={{ maxWidth: 520, margin: "80px auto", border: "1px solid #ddd", padding: 16 }}>
      <h2>Sign in</h2>
      <p style={{ color: "#666" }}>
        This is a private campaign CRM. Sign in with your approved email.
      </p>

      <label>
        Email
        <input style={{ width: "100%" }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@campaign.org" />
      </label>

      <div style={{ height: 12 }} />

      <label>
        Password (optional)
        <input style={{ width: "100%" }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </label>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button disabled={!email.trim() || !password} onClick={loginPassword}>Sign in</button>
        <button disabled={!email.trim()} onClick={sendMagicLink}>Send magic link</button>
      </div>

      <p style={{ color: "#666", marginTop: 12 }}>{msg}</p>
    </div>
  );
}
