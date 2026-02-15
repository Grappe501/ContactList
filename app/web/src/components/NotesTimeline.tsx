import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../lib/api";
import { qk } from "../lib/queryKeys";
import { formatApiError } from "../lib/errors";

type Note = { id: string; note_type: string; body: string; created_at: string };

export default function NotesTimeline(props: { contactId: string; notes: Note[] }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [noteType, setNoteType] = useState<Note["note_type"]>("general");

  const add = useMutation({
    mutationFn: async () => apiPost(`/contacts/${props.contactId}/notes`, { note_type: noteType, body }),
    onSuccess: async () => {
      setBody("");
      await qc.invalidateQueries({ queryKey: qk.contact(props.contactId) });
    },
  });

  return (
    <div>
      {add.error ? <div style={{ color: "crimson" }}>{formatApiError(add.error)}</div> : null}

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
          <option value="general">general</option>
          <option value="call">call</option>
          <option value="meeting">meeting</option>
          <option value="donation">donation</option>
          <option value="volunteer">volunteer</option>
          <option value="follow_up">follow_up</option>
          <option value="other">other</option>
        </select>
        <input style={{ flex: 1 }} placeholder="Add a note..." value={body} onChange={(e) => setBody(e.target.value)} />
        <button disabled={!body.trim() || add.isPending} onClick={() => add.mutate()}>
          Add
        </button>
      </div>

      <ul>
        {props.notes.map((n) => (
          <li key={n.id}>
            <small>
              {new Date(n.created_at).toLocaleString()} — {n.note_type}
            </small>
            <div>{n.body}</div>
          </li>
        ))}
        {props.notes.length === 0 ? <li style={{ color: "#666" }}>No notes</li> : null}
      </ul>
    </div>
  );
}
