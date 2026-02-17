import { getAccessToken } from "./auth";

const API_BASE = "/.netlify/functions/api";

async function handle(resp: Response) {
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(t || `HTTP ${resp.status}`);
  }
  const ct = resp.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return await resp.json();
  return await resp.text();
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { ...(await authHeaders()) },
  });
  return await handle(resp);
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: JSON.stringify(body),
  });
  return await handle(resp);
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: JSON.stringify(body),
  });
  return await handle(resp);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { ...(await authHeaders()) },
  });
  return await handle(resp);
}
