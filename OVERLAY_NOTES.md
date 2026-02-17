# Overlay 11 — Private-Link Gate + Basic Hardening
Generated: 2026-02-13T01:04:17.268132

Goal:
- Add a **private-link gate** (shared secret) to the dashboard without implementing full auth.
- Apply baseline API hardening:
  - CORS allow-list
  - Security headers
  - Basic request size limits for uploads
  - Rate limiting (lightweight, stateless best-effort)
  - API key gating for all non-health endpoints
  - CSRF-safe design (no cookies required; header-based token)

## Private-link model
- User shares a URL like:
  `https://<site>.netlify.app/#/?k=<PRIVATE_LINK_KEY>`
- The SPA stores it in `localStorage`.
- All API calls include header: `x-contactlist-key: <PRIVATE_LINK_KEY>`

## Netlify env vars
Required:
- PRIVATE_LINK_KEY                 (a long random secret; rotate anytime)
Optional:
- CORS_ALLOWED_ORIGINS             (comma-separated, default uses APP_BASE_URL)
- REQUEST_BODY_MAX_BYTES           (default 5_000_000)
- RATE_LIMIT_RPM                   (default 120)

## Server enforcement
- Middleware blocks all endpoints except:
  - GET /health
  - GET /integrations/google/callback (must be reachable by Google redirect)
- Google callback bypass is limited to that single path.

## UI
- Landing gate screen if no key present or key invalid.
- "Logout" clears key.

Apply:
1) Unzip into repo root
2) Set env vars in Netlify:
   - PRIVATE_LINK_KEY
   - APP_BASE_URL
3) Deploy
