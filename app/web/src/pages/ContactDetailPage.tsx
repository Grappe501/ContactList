import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";
import { qk } from "../lib/queryKeys";
import { formatApiError } from "../lib/errors";
import TagsPicker from "../components/TagsPicker";
import NotesTimeline from "../components/NotesTimeline";
import AiTagSuggest from "../components/AiTagSuggest";

type Bundle = {
  contact: any;
  sources: any[];
  tags: any[];
  notes: any[];
  duplicate_suggestions: any[];
  merge_history: any[];
};

export default function ContactDetailPage() {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: qk.contact(id ?? ""),
    enabled: Boolean(id),
    queryFn: () => apiGet<Bundle>(`/contacts/${id}`),
  });

  if (!id) return <div>Missing id</div>;
  if (isLoading) return <div>Loading…</div>;
  if (error) return <div style={{ color: "crimson" }}>{formatApiError(error)}</div>;

  return (
    <div>
      <h2>{data?.contact?.full_name ?? "Contact"}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <section style={{ border: "1px solid #ddd", padding: 12 }}>
          <h3>Tags</h3>
          <TagsPicker contactId={id} currentTags={data?.tags ?? []} />
        </section>
        <section style={{ border: "1px solid #ddd", padding: 12 }}>
          <h3>Notes</h3>
          <NotesTimeline contactId={id} notes={data?.notes ?? []} />
        </section>
      </div>

      <AiTagSuggest contactId={id} />

      <section style={{ marginTop: 12, border: "1px solid #ddd", padding: 12 }}>
        <h3>Sources (Provenance)</h3>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data?.sources ?? [], null, 2)}</pre>
      </section>
    </div>
  );
}
