import type { HandlerEvent } from "@netlify/functions";

/**
 * Minimal request context used across handlers.
 * NOTE: No PII should be logged. Use redaction helpers in logger.
 */
export type RequestContext = {
  requestId: string;
  startMs: number;
  method: string;
  path: string;
  origin: string | null;
  ipHash: string;
};

function simpleHash(input: string): string {
  // Non-cryptographic, stable enough for rate limit bucketing.
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `h_${(h >>> 0).toString(16)}`;
}

export function buildContext(event: HandlerEvent, requestId: string): RequestContext {
  const startMs = Date.now();
  const method = event.httpMethod.toUpperCase();
  // Netlify gives a full path like "/.netlify/functions/api/contacts"
  const path = event.path;
  const origin = (event.headers["origin"] ?? event.headers["Origin"] ?? null) as string | null;

  const rawIp =
    (event.headers["x-nf-client-connection-ip"] ??
      event.headers["x-forwarded-for"] ??
      "0.0.0.0") as string;

  const ip = rawIp.split(",")[0].trim();
  const ipHash = simpleHash(ip);

  return { requestId, startMs, method, path, origin, ipHash };
}
