import type { RequestContext } from "./request";
import { optionalEnv } from "./env";

export function corsHeaders(ctx: RequestContext): Record<string, string> {
  const allow = optionalEnv("APP_BASE_URL");
  const origin = ctx.origin ?? "";
  // Strict allowlist: only allow configured base url. If not set, default deny (no CORS header).
  if (!allow) return {};
  if (origin && origin === allow) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Request-Id",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    };
  }
  return {};
}
