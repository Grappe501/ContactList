import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../lib/api";
import { qk } from "../lib/queryKeys";
import { formatApiError } from "../lib/errors";

type Tag = { id: string; name: string; category?: string | null };

export default function TagsPicker(props: { contactId: string; currentTags: Tag[] }) {
  const qc = useQueryClient();

  const { data: allTags } = useQuery({
    queryKey: qk.tags(),
    queryFn: () => apiGet<{ data: Tag[] }>("/tags"),
  });

  const assign = useMutation({
    mutationFn: async (tagId: string) =>
      apiPost<{ assigned: boolean }>(`/contacts/${props.contactId}/tags`, { tag_ids: [tagId], assigned_by: "manual", confidence: 1 }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.contact(props.contactId) });
    },
  });

  const remove = useMutation({
    mutationFn: async (tagId: string) => apiDelete<{ removed: boolean }>(`/contacts/${props.contactId}/tags/${tagId}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.contact(props.contactId) });
    },
  });

  const currentIds = new Set(props.currentTags.map((t) => t.id));

  return (
    <div>
      {assign.error ? <div style={{ color: "crimson" }}>{formatApiError(assign.error)}</div> : null}
      {remove.error ? <div style={{ color: "crimson" }}>{formatApiError(remove.error)}</div> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {props.currentTags.map((t) => (
          <button key={t.id} onClick={() => remove.mutate(t.id)}>
            {t.name} ✕
          </button>
        ))}
        {props.currentTags.length === 0 ? <span style={{ color: "#666" }}>No tags</span> : null}
      </div>

      <div>
        <label>
          Add tag:{" "}
          <select
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) assign.mutate(v);
              e.currentTarget.value = "";
            }}
          >
            <option value="">Select…</option>
            {(allTags?.data ?? []).filter((t) => !currentIds.has(t.id)).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
