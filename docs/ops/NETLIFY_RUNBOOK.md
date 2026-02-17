# Netlify Runbook

## Build settings
- `base`: `app`
- `publish`: `web/dist`
- `command`: `npm run build:all`
- Functions directory: `functions/dist`

## Environment variables
Configure all required vars (see `ENV_MATRIX.md`).

## Deploy process
1) Push to GitHub main
2) Netlify auto-builds and deploys
3) Verify:
   - `/.netlify/functions/api/health`
   - Dashboard loads with private key
   - Imports work (CSV/vCard/Google if configured)

## Logs and troubleshooting
- Netlify → Functions → Logs
- Common issues:
  - Missing env var: API will return 500 with env message.
  - CORS blocked: set `CORS_ALLOWED_ORIGINS`.
  - Google OAuth redirect mismatch: ensure `APP_BASE_URL` matches production and redirect URI is in Google Console.
