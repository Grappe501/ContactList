import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../lib/api";

type Status = { connected: boolean; account_email: string | null; scopes: string[] };

export default function ImportGoogle() {
  const [status, setStatus] = useState<Status | null>(null);
  const [sourceLabel, setSourceLabel] = useState("Google Contacts");
  const [donorName, setDonorName] = useState<string>("");
  const [donorOrg, setDonorOrg] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  async function refreshStatus() {
    const s = await apiGet<Status>("/integrations/google/status");
    setStatus(s);
  }

  useEffect(() => {
    refreshStatus().catch(() => {});
  }, []);

  async function connect() {
    setMsg("Starting Google OAuth…");
    const res = await apiGet<{ auth_url: string }>("/integrations/google/start");
    window.location.href = res.auth_url;
  }

  async function sync() {
    setMsg("Syncing…");
    const res = await apiPost<any>("/integrations/google/sync", {
      source_label: sourceLabel,
      donor_name: donorName || null,
      donor_org: donorOrg || null,
      operator_label: "dashboard",
    });
    setMsg(`Synced: batch ${res.batch_id} (${res.processed_count}/${res.record_count})`);
  }

  return (
    <section style={{ border: "1px solid #ddd", padding: 12 }}>
      <h3>Google Contacts Import</h3>
      <p style={{ color: "#666" }}>
        Connect a Google account and import contacts via the Google People API. Tokens are encrypted in the database.
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        <div>Connection: {status?.connected ? "Connected" : "Not connected"}</div>

        <label>
          Source label (WHERE it came from):
          <input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} />
        </label>
        <label>
          Donated contacts from (name):
          <input value={donorName} onChange={(e) => setDonorName(e.target.value)} />
        </label>
        <label>
          Donated contacts from (org):
          <input value={donorOrg} onChange={(e) => setDonorOrg(e.target.value)} />
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={connect}>Connect Google</button>
          <button disabled={!status?.connected} onClick={sync}>Sync Google Contacts</button>
          <button onClick={refreshStatus}>Refresh</button>
          <span style={{ color: "#666" }}>{msg}</span>
        </div>

        <details>
          <summary>Required Netlify env vars</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>
{`APP_BASE_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
TOKEN_ENCRYPTION_KEY
DATABASE_URL`}
          </pre>
        </details>
      </div>
    </section>
  );
}
