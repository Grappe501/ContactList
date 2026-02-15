import React from "react";
import type { ContactListItem } from "../lib/dto";

export type ContactsTableProps = {
  rows: ContactListItem[];
  sort: { key: "name" | "created_at" | "updated_at"; order: "asc" | "desc" };
  onSortChange: (next: ContactsTableProps["sort"]) => void;
  onRowClick: (id: string) => void;
  isLoading: boolean;
};

export default function ContactsTable(props: ContactsTableProps) {
  return (
    <div style={{ border: "1px solid #ddd", padding: 8 }}>
      {props.isLoading ? <div>Loading…</div> : null}
      <table width="100%">
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Email</th>
            <th align="left">Phone</th>
            <th align="left">Tags</th>
            <th align="left">Sources</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((r) => (
            <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => props.onRowClick(r.id)}>
              <td>{r.full_name}</td>
              <td>{r.primary_email ?? ""}</td>
              <td>{r.primary_phone ?? ""}</td>
              <td>{r.tag_names?.slice(0, 2).join(", ")}</td>
              <td>{r.source_types?.join(", ")}</td>
            </tr>
          ))}
          {props.rows.length === 0 && !props.isLoading ? (
            <tr>
              <td colSpan={5}>No results</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
