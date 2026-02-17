import React, { useEffect, useState } from "react";
import { apiGet, apiPut } from "../lib/api";

type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: "owner"|"admin"|"organizer"|"data_entry"|"viewer";
  status: "active"|"disabled";
  created_at: string;
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await apiGet<{ data: UserRow[] }>("/users?limit=500");
    setItems(res.data ?? []);
  }

  useEffect(() => { load().catch((e) => setMsg(String(e))); }, []);

  async function setRole(id: string, role: UserRow["role"]) {
    setMsg("Updating role…");
    await apiPut<any>(`/users/${id}/role`, { role });
    setMsg("Updated.");
    await load();
  }

  async function setStatus(id: string, status: UserRow["status"]) {
    setMsg("Updating status…");
    await apiPut<any>(`/users/${id}/status`, { status });
    setMsg("Updated.");
    await load();
  }

  return (
    <div>
      <h2>Admin — Users</h2>
      <p style={{ color: "#666" }}>
        Manage staff access and roles. Only owner/admin can access this page.
      </p>
      <div style={{ color: "#666" }}>{msg}</div>

      <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Email</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Name</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Role</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Status</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.id}>
              <td style={{ padding: 6 }}>{u.email}</td>
              <td style={{ padding: 6 }}>{u.display_name ?? ""}</td>
              <td style={{ padding: 6 }}>
                <select value={u.role} onChange={(e) => setRole(u.id, e.target.value as any)}>
                  <option value="owner">owner</option>
                  <option value="admin">admin</option>
                  <option value="organizer">organizer</option>
                  <option value="data_entry">data_entry</option>
                  <option value="viewer">viewer</option>
                </select>
              </td>
              <td style={{ padding: 6 }}>
                <select value={u.status} onChange={(e) => setStatus(u.id, e.target.value as any)}>
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
              </td>
              <td style={{ padding: 6, color: "#666" }}>{new Date(u.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
