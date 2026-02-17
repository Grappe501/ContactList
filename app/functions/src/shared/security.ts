import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "./errors";
import { optionalEnv, requireEnv } from "./env";

const DEFAULT_MAX = 5_000_000; // 5MB
const DEFAULT_RPM = 120;

function allowedOrigins(): string[] {
  const raw = optionalEnv("CORS_ALLOWED_ORIGINS");
  if (raw) return raw.split(",").map((s) => s.trim()).filter(Boolean);
  const base = optionalEnv("APP_BASE_URL");
  return base ? [base.replace(/\/$/, "")] : ["*"];
}

export function corsHeaders(origin?: string | null) {
  const allow = allowedOrigins();
  const o = (origin ?? "").replace(/\/$/, "");
  const ok = allow.includes("*") || (o && allow.includes(o));
  const allowOrigin = ok ? (allow.includes("*") ? "*" : o) : (allow.includes("*") ? "*" : allow[0] ?? "");

  return {
    "Access-Control-Allow-Origin": allowOrigin || "*",
    "Access-Control-Allow-Headers": "content-type,x-contactlist-key",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  } as Record<string, string>;
}

export function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://api.openai.com https://oauth2.googleapis.com https://people.googleapis.com https://accounts.google.com; frame-ancestors 'none';",
  } as Record<string, string>;
}

export function enforceBodySize(event: HandlerEvent) {
  const max = Number(optionalEnv("REQUEST_BODY_MAX_BYTES") ?? DEFAULT_MAX);
  const len = Number((event.headers as any)?.["content-length"] ?? (event.headers as any)?.["Content-Length"] ?? 0);
  if (len && len > max) throw new ApiError(413, "PAYLOAD_TOO_LARGE", `Request body too large (> ${max} bytes)`);
}

export function isPublicPath(method: string, path: string): boolean {
  if (method === "GET" && path === "/health") return true;
  // Google OAuth redirect must be reachable
  if (method === "GET" && path === "/integrations/google/callback") return true;
  // Preflight allowed
  if (method === "OPTIONS") return true;
  return false;
}

export function requirePrivateKey(event: HandlerEvent, path: string) {
  if (isPublicPath(event.httpMethod, path)) return;

  const expected = requireEnv("PRIVATE_LINK_KEY");
  const got = (event.headers as any)?.["x-contactlist-key"] ?? (event.headers as any)?.["X-Contactlist-Key"] ?? (event.headers as any)?.["X-ContactList-Key"];
  if (!got || String(got) !== String(expected)) {
    throw new ApiError(401, "UNAUTHORIZED", "Missing or invalid private link key");
  }
}

// Stateless best-effort rate limit: token bucket per edge instance using globalThis memory.
// Not perfect, but blocks naive floods.
type Bucket = { tokens: number; lastRefill: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(event: HandlerEvent) {
  const rpm = Number(optionalEnv("RATE_LIMIT_RPM") ?? DEFAULT_RPM);
  const capacity = rpm;
  const refillPerMs = rpm / 60000;

  const ip = (event.headers as any)?.["x-nf-client-connection-ip"]
    ?? (event.headers as any)?.["x-forwarded-for"]
    ?? "unknown";
  const key = String(ip);

  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, lastRefill: now };
  const elapsed = now - b.lastRefill;
  b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerMs);
  b.lastRefill = now;

  if (b.tokens < 1) {
    buckets.set(key, b);
    throw new ApiError(429, "RATE_LIMITED", "Too many requests");
  }

  b.tokens -= 1;
  buckets.set(key, b);
}
