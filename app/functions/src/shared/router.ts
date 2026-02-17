export type RouteResult = { status: number; body: any };

// Your route handlers in routes/* are typed like (event, params: Record<string,string>) => ...
// So params MUST always be provided (never undefined).
export type RouteHandler = (event: any, params: Record<string, string>) => Promise<RouteResult> | RouteResult;

type Route = {
  method: string;
  pattern: string;
  parts: string[];
  handler: RouteHandler;
};

function splitPath(p: string): string[] {
  const s = (p || "/").replace(/\/+$/, "");
  return s.split("/").filter(Boolean);
}

function matchRoute(patternParts: string[], pathParts: string[]) {
  if (patternParts.length !== pathParts.length) return { ok: false as const, params: {} as Record<string, string> };

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i];
    const pv = pathParts[i];

    if (pp.startsWith(":")) {
      params[pp.slice(1)] = decodeURIComponent(pv);
      continue;
    }

    if (pp !== pv) return { ok: false as const, params: {} as Record<string, string> };
  }

  return { ok: true as const, params };
}

/**
 * Netlify function paths often look like:
 *  - "/.netlify/functions/index/contacts"
 *  - "/.netlify/functions/api/contacts"
 *  - "/api/contacts" (sometimes depending on proxy)
 *
 * This normalizes to an internal API path like:
 *  - "/contacts"
 */
export function extractApiPath(eventPath: string): string {
  const p = eventPath || "/";

  // Strip Netlify wrapper prefix
  const m = p.match(/\/\.netlify\/functions\/(api|index)(\/.*)?$/);
  if (m) return m[2] ? m[2] : "/";

  // Strip leading "/api" if present
  if (p === "/api") return "/";
  if (p.startsWith("/api/")) return p.slice(4);

  // Otherwise keep as-is
  return p.startsWith("/") ? p : `/${p}`;
}

export class SimpleRouter {
  private routes: Route[] = [];

  add(method: string, pattern: string, handler: RouteHandler) {
    const m = method.toUpperCase();
    const pat = pattern.startsWith("/") ? pattern : `/${pattern}`;
    const parts = splitPath(pat);
    this.routes.push({ method: m, pattern: pat, parts, handler });
  }

  async dispatch(method: string, path: string, event: any): Promise<RouteResult | null> {
    const m = String(method || "GET").toUpperCase();
    const p = path && path.startsWith("/") ? path : `/${path || ""}`;
    const pathParts = splitPath(p);

    for (const r of this.routes) {
      if (r.method !== m) continue;

      const { ok, params } = matchRoute(r.parts, pathParts);
      if (!ok) continue;

      // IMPORTANT: params is ALWAYS a Record<string,string>
      return await r.handler(event, params);
    }

    return null;
  }
}
