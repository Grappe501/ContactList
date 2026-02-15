import type { HandlerEvent } from "@netlify/functions";
import type { ErrorResponse } from "./errors";

export type JsonResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

export function getIncomingRequestId(event: HandlerEvent): string | null {
  return (event.headers["x-request-id"] ?? event.headers["X-Request-Id"] ?? null) as string | null;
}

export function newRequestId(): string {
  return `req_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function baseHeaders(requestId: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-request-id": requestId,
    // No-auth private link hardening (baseline). More in later overlay.
    "X-Robots-Tag": "noindex, nofollow",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  };
}

export function json(statusCode: number, body: unknown, requestId: string, extraHeaders?: Record<string, string>): JsonResponse {
  return {
    statusCode,
    headers: { ...baseHeaders(requestId), ...(extraHeaders ?? {}) },
    body: JSON.stringify(body),
  };
}

export function text(statusCode: number, body: string, requestId: string, extraHeaders?: Record<string, string>): JsonResponse {
  return {
    statusCode,
    headers: { ...baseHeaders(requestId), "Content-Type": "text/plain", ...(extraHeaders ?? {}) },
    body,
  };
}

export function error(statusCode: number, err: ErrorResponse, requestId: string, extraHeaders?: Record<string, string>): JsonResponse {
  return json(statusCode, err, requestId, extraHeaders);
}
