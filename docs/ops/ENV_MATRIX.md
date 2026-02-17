# Environment Variable Matrix

These environment variables must be configured in **Netlify** (Site settings → Environment variables).

## Required (Production)
| Variable | Where used | Description | Example |
|---|---|---|---|
| DATABASE_URL | functions | Neon Postgres connection string | `postgres://...` |
| APP_BASE_URL | functions | Public base URL for OAuth redirect and CORS defaults | `https://example.netlify.app` |
| PRIVATE_LINK_KEY | functions + web | Shared secret for dashboard access | random 40+ chars |
| TOKEN_ENCRYPTION_KEY | functions | Encrypts OAuth refresh/access tokens and signed state | random 40+ chars |
| OPENAI_API_KEY | functions | AI tagging + rerank | `sk-...` |
| GOOGLE_CLIENT_ID | functions | Google People OAuth | `...apps.googleusercontent.com` |
| GOOGLE_CLIENT_SECRET | functions | Google People OAuth | `...` |

## Optional
| Variable | Default | Purpose |
|---|---|---|
| CORS_ALLOWED_ORIGINS | `APP_BASE_URL` | Comma-separated list of allowed origins |
| REQUEST_BODY_MAX_BYTES | `5000000` | Payload limit for API requests |
| RATE_LIMIT_RPM | `120` | Best-effort per-IP rate limit |
| OPENAI_MODEL_TAGGING | `gpt-5.2` | Model for tag suggestion |
| OPENAI_MODEL_RERANK | `gpt-5.2` | Model for AI rerank |
| OPENAI_BASE_URL | `https://api.openai.com/v1` | OpenAI API base |
| GOOGLE_OAUTH_REDIRECT_PATH | `/.netlify/functions/api/integrations/google/callback` | Override redirect path |

## Secret Rotation Notes
- Rotating `PRIVATE_LINK_KEY` instantly locks out old links.
- Rotating `TOKEN_ENCRYPTION_KEY` invalidates existing encrypted tokens/state; reconnect Google after rotation.
- Rotating `OPENAI_API_KEY` affects AI endpoints only.
- Rotating Google OAuth secrets requires updating in Google Cloud Console and Netlify.
