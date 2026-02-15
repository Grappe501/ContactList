import type { HandlerEvent } from "@netlify/functions";

export type RouteHandler = (event: HandlerEvent, params: Record<string, string>) => Promise<{ status: number; body: unknown }>;

type Route = {
  method: string;
  pattern: string; // e.g. /contacts/:id
  segments: string[];
  handler: RouteHandler;
};

export class SimpleRouter {
  private routes: Route[] = [];

  add(method: string, pattern: string, handler: RouteHandler) {
    const normalized = normalizePath(pattern);
    this.routes.push({
      method: method.toUpperCase(),
      pattern: normalized,
      segments: normalized.split("/").filter(Boolean),
      handler,
    });
  }

  async dispatch(method: string, path: string, event: HandlerEvent): Promise<{ status: number; body: unknown } | null> {
    const m = method.toUpperCase();
    const p = normalizePath(path);
    const segs = p.split("/").filter(Boolean);

    for (const r of this.routes) {
      if (r.method !== m) continue;
      if (r.segments.length !== segs.length) continue;

      const params: Record<string, string> = {};
      let ok = true;

      for (let i = 0; i < r.segments.length; i++) {
        const rs = r.segments[i];
        const ps = segs[i];
        if (rs.startsWith(":")) {
          params[rs.slice(1)] = decodeURIComponent(ps);
        } else if (rs !== ps) {
          ok = false;
          break;
        }
      }

      if (ok) return await r.handler(event, params);
    }

    return null;
  }
}

export function extractApiPath(netlifyPath: string): string {
  // Netlify event.path is like "/.netlify/functions/api/contacts"
  const idx = netlifyPath.indexOf("/.netlify/functions/api");
  if (idx >= 0) {
    const rest = netlifyPath.slice(idx + "/.netlify/functions/api".length);
    return normalizePath(rest || "/");
  }
  // Local/dev fallback: accept as-is
  return normalizePath(netlifyPath);
}

function normalizePath(p: string): string {
  if (!p) return "/";
  let out = p.trim();
  // remove query string if present
  const q = out.indexOf("?");
  if (q >= 0) out = out.slice(0, q);
  if (!out.startsWith("/")) out = "/" + out;
  if (out.length > 1 && out.endsWith("/")) out = out.slice(0, -1);
  return out;
}
