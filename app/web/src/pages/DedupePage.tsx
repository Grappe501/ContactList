import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { Link } from "react-router-dom";

type Suggestion = any;

export default function DedupePage() {
  const [status, setStatus] = useState<"open"|"accepted"|"rejected">("open");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [msg, setMsg] = useState<string>("");

  async function refresh() {
    const res = await apiGet<{ data: Suggestion[] }>(`/dedupe/suggestions?status=${status}&limit=200`);
    setItems(res.data ?? []);
  }

  useEffect(() => { refresh().catch(() => {}); }, [status]);

  async function run() {
    setMsg("Running de-dupe…");
    const res = await apiPost<any>("/dedupe/run", { limit: 500 });
    setMsg(`Done. Created suggestions: ${res.created_suggestions}`);
    await refresh();
  }

  async function resolve(id: string, resolution: "accepted"|"rejected") {
    await apiPost<any>(`/dedupe/suggestions/${id}/resolve`, { resolution });
    await refresh();
  }

  async function merge(s: Suggestion) {
    setMsg("Merging…");
    const survivor = s.contact_id;
    const merged = s.possible_duplicate_contact_id;
    await apiPost<any>("/dedupe/merge", { survivor_contact_id: survivor, merged_contact_id: merged, suggestion_id: s.id, merged_by: "dashboard" });
    setMsg("Merged.");
    await refresh();
  }

  return (
    <div>
      <h2>De-dupe</h2>
      <p style={{ color: "#666" }}>
        Review duplicate suggestions and merge records. Start by running detection, then merge or reject.
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={run}>Run Detection</button>
        <label>
          Status:
          <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="open">open</option>
            <option value="accepted">accepted</option>
            <option value="rejected">rejected</option>
          </select>
        </label>
        <button onClick={refresh}>Refresh</button>
        <span style={{ color: "#666" }}>{msg}</span>
      </div>

      <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Score</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Match</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Contact</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Possible Duplicate</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Reason</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.id}>
              <td style={{ padding: 6 }}>{Math.round((s.score ?? 0) * 100)}%</td>
              <td style={{ padding: 6 }}>{s.match_type}</td>
              <td style={{ padding: 6 }}><Link to={`/contacts/${s.contact_id}`}>{s.contact_id.slice(0, 8)}…</Link></td>
              <td style={{ padding: 6 }}><Link to={`/contacts/${s.possible_duplicate_contact_id}`}>{s.possible_duplicate_contact_id.slice(0, 8)}…</Link></td>
              <td style={{ padding: 6, color: "#555" }}>{s.reason}</td>
              <td style={{ padding: 6 }}>
                {status === "open" ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => merge(s)}>Merge</button>
                    <button onClick={() => resolve(s.id, "rejected")}>Reject</button>
                  </div>
                ) : (
                  <button onClick={() => resolve(s.id, "open" as any)} disabled>Resolved</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
