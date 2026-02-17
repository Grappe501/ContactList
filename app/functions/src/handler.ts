import type { Handler, HandlerEvent } from "@netlify/functions";
import { router } from "./shared/router";
import { registerRoutes } from "./routes/_register";
import { ApiError } from "./shared/errors";
import { corsHeaders, securityHeaders, enforceBodySize, requirePrivateKey, rateLimit } from "./shared/security";

registerRoutes(router);

function json(status: number, body: any, headers: Record<string,string>) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

export const handler: Handler = async (event: HandlerEvent) => {
  const origin = (event.headers as any)?.origin ?? (event.headers as any)?.Origin ?? null;
  const cors = corsHeaders(origin);
  const sec = securityHeaders();

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { ...cors, ...sec }, body: "" };
  }

  // Compute path relative to function mount: "/.netlify/functions/api/<path>"
  const rawPath = event.path ?? "/";
  const idx = rawPath.indexOf("/.netlify/functions/api");
  const path = idx >= 0 ? rawPath.slice(idx + "/.netlify/functions/api".length) || "/" : rawPath;

  try {
    rateLimit(event);
    enforceBodySize(event);
    requirePrivateKey(event, path);

    const result = await router.handle(event.httpMethod, path, event);
    return json(result.status, result.body, { ...cors, ...sec });
  } catch (e: any) {
    const err = e instanceof ApiError ? e : new ApiError(500, "INTERNAL", String(e?.message ?? e));
    return json(err.httpStatus, { error: { code: err.code, message: err.message } }, { ...cors, ...sec });
  }
};
