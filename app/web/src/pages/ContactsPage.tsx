import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "../lib/api";
import { qk } from "../lib/queryKeys";
import { Link } from "react-router-dom";
import { formatApiError } from "../lib/errors";

type Contact = {
  id: string;
  full_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  city: string | null;
  state: string | null;
};

export default function ContactsPage() {
  const [q, setQ] = useState("");
  const [aiQ, setAiQ] = useState("");
  const [aiResults, setAiResults] = useState<Contact[] | null>(null);
  const [aiMsg, setAiMsg] = useState("");

  // qk.contacts expects a Record<string, unknown>, not a string
  const paramsObj: Record<string, unknown> = { q };

  const { data, isLoading, error } = useQuery({
    queryKey: qk.contacts(paramsObj),
    queryFn: () => apiGet<{ data: Contact[] }>(`/contacts?q=${encodeURIComponent(q)}`),
  });

  async function runAiSearch() {
    setAiMsg("AI searching…");
    const res = await apiPost<{ contacts: Contact[]; model: string | null; reranked: boolean }>(
      "/ai/contacts/search_ai",
      { query: aiQ, limit: 50 }
    );
    setAiResults(res.contacts ?? []);
    setAiMsg(res.reranked ? `AI reranked (${res.model})` : "Returned DB results (no rerank needed)");
  }

  return (
    <div>
      <h2>Contacts</h2>

      <section style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
        <h3>Standard Search</h3>
        <input
          placeholder="Search name/email/phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
        <h3>AI Search + Sort</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            style={{ flex: 1 }}
            placeholder="Describe who you’re looking for…"
            value={aiQ}
            onChange={(e) => setAiQ(e.target.value)}
          />
          <button disabled={!aiQ.trim()} onClick={runAiSearch}>
            AI Search
          </button>
          <span style={{ color: "#666" }}>{aiMsg}</span>
        </div>

        {aiResults ? (
          <div style={{ marginTop: 8 }}>
            <small style={{ color: "#666" }}>AI results (ordered):</small>
            <ul>
              {aiResults.map((c) => (
                <li key={c.id}>
                  <Link to={`/contacts/${c.id}`}>{c.full_name}</Link>{" "}
                  <small style={{ color: "#666" }}>
                    {c.primary_email ?? ""} {c.primary_phone ?? ""} {c.city ?? ""} {c.state ?? ""}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {isLoading ? <div>Loading…</div> : null}
      {error ? <div style={{ color: "crimson" }}>{formatApiError(error)}</div> : null}

      <ul>
        {(data?.data ?? []).map((c) => (
          <li key={c.id}>
            <Link to={`/contacts/${c.id}`}>{c.full_name}</Link>{" "}
            <small style={{ color: "#666" }}>
              {c.primary_email ?? ""} {c.primary_phone ?? ""}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}
