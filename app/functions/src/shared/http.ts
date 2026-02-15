import type { HandlerEvent } from "@netlify/functions";

export function withRequestId(event: HandlerEvent): string {
  // Prefer Netlify headers if present; otherwise generate a simple one.
  const incoming = event.headers["x-request-id"] || event.headers["X-Request-Id"];
  return incoming ?? `req_${Math.random().toString(36).slice(2)}`;
}

export function json(statusCode: number, body: unknown, reqId?: string) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...(reqId ? { "x-request-id": reqId } : {}),
    },
    body: JSON.stringify(body),
  };
}

export function notFound(reqId: string) {
  return json(404, { error: { code: "NOT_FOUND", message: "Not found", request_id: reqId } }, reqId);
}
