# Overlay 01 — Phase-0 Scaffold
Generated: 2026-02-13T00:13:38.857038

Purpose:
- Create the full ContactList repo scaffold with **stubbed files** for all modules.
- No business logic implemented; only compilation/build wiring and placeholder exports.

Apply:
1) Unzip into ContactList repo root (overwrite ok).
2) `npm ci` inside `app/web` and `app/functions`.
3) Copy `ops/netlify.toml.template` into root `netlify.toml` if not present (this overlay includes a starter).
4) Push to GitHub, connect Netlify.
5) Next overlay should implement DB + API core per V3 spec.

Smoke tests:
- `cd app/web; npm run build`
- `cd app/functions; npm run build`
