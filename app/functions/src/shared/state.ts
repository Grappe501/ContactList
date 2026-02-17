import { createHmac, randomBytes } from "crypto";
import { requireEnv } from "./env";

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlJson(obj: any): string {
  return b64url(Buffer.from(JSON.stringify(obj), "utf8"));
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

export function signState(payload: Record<string, any>): string {
  const key = requireEnv("TOKEN_ENCRYPTION_KEY");
  const p = { ...payload, nonce: b64url(randomBytes(16)), ts: Date.now() };
  const body = b64urlJson(p);
  const sig = b64url(createHmac("sha256", key).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyState(state: string, maxAgeMs = 10 * 60 * 1000): Record<string, any> {
  const key = requireEnv("TOKEN_ENCRYPTION_KEY");
  const parts = state.split(".");
  if (parts.length !== 2) throw new Error("Invalid state");
  const [body, sig] = parts;
  const exp = b64url(createHmac("sha256", key).update(body).digest());
  if (exp !== sig) throw new Error("Invalid state signature");
  const payload = JSON.parse(fromB64url(body).toString("utf8"));
  if (typeof payload.ts !== "number" || Date.now() - payload.ts > maxAgeMs) throw new Error("State expired");
  return payload;
}
