import React, { useEffect, useState } from "react";
import { getPrivateKey, setPrivateKey, clearPrivateKey } from "../lib/privateKey";
import { apiGet } from "../lib/api";

export default function GatePage(props: { onUnlocked: () => void }) {
  const [key, setKey] = useState(getPrivateKey() ?? "");
  const [msg, setMsg] = useState("");

  async function test(k: string) {
    setMsg("Checking…");
    setPrivateKey(k);
    try {
      await apiGet<any>("/tags"); // any gated endpoint
      setMsg("Unlocked.");
      props.onUnlocked();
    } catch {
      clearPrivateKey();
      setMsg("Invalid key.");
    }
  }

  useEffect(() => {
    const sp = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
    const k = sp.get("k");
    if (k) {
      setKey(k);
      test(k).catch(() => {});
    }
  }, []);

  return (
    <div style={{ maxWidth: 520, margin: "80px auto", border: "1px solid #ddd", padding: 16 }}>
      <h2>Private Link Required</h2>
      <p style={{ color: "#666" }}>
        Enter your private link key to access this dashboard.
      </p>
      <label>
        Private key:
        <input style={{ width: "100%" }} value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste key…" />
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
        <button disabled={!key.trim()} onClick={() => test(key.trim())}>Unlock</button>
        <button onClick={() => { clearPrivateKey(); setKey(""); setMsg("Cleared."); }}>Clear</button>
        <span style={{ color: "#666" }}>{msg}</span>
      </div>
      <p style={{ marginTop: 12, color: "#999" }}>
        Tip: you can open a link like <code>#/?k=&lt;key&gt;</code> to auto-fill.
      </p>
    </div>
  );
}
