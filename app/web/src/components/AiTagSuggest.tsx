import React, { useState } from "react";
import { apiPost } from "../lib/api";

type Suggestion = { name: string; confidence: number; reason: string };

export default function AiTagSuggest(props: { contactId: string }) {
  const [suggested, setSuggested] = useState<Suggestion[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setMsg("Asking AI…");
    try {
      const res = await apiPost<{ suggested: Suggestion[]; model: string }>("/ai/tags/suggest", { contact_id: props.contactId });
      setSuggested(res.suggested ?? []);
      setMsg(res.suggested?.length ? `Suggested by ${res.model}` : "No suggestions.");
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!suggested.length) return;
    setBusy(true);
    setMsg("Applying tags…");
    try {
      const names = suggested.map((s) => s.name);
      const res = await apiPost<any>("/ai/tags/apply", { contact_id: props.contactId, tag_names: names });
      setMsg(`Applied: ${res.assigned}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ border: "1px solid #ddd", padding: 12, marginTop: 12 }}>
      <h3>AI Tagging</h3>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button disabled={busy} onClick={run}>AI Suggest Tags</button>
        <button disabled={busy || suggested.length === 0} onClick={apply}>Apply Suggested Tags</button>
        <span style={{ color: "#666" }}>{msg}</span>
      </div>

      {suggested.length ? (
        <ul>
          {suggested.map((s) => (
            <li key={s.name}>
              <b>{s.name}</b> — {Math.round(s.confidence * 100)}% — <span style={{ color: "#555" }}>{s.reason}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
