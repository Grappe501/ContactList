# Incident Response

## Suspected key leak (PRIVATE_LINK_KEY)
1) Rotate `PRIVATE_LINK_KEY` in Netlify immediately.
2) Communicate new link to allowed users.
3) Review Netlify function logs for suspicious activity.
4) Consider rotating `RATE_LIMIT_RPM` down temporarily.

## OAuth token compromise (TOKEN_ENCRYPTION_KEY or DB leak)
1) Rotate `TOKEN_ENCRYPTION_KEY`.
2) Delete `oauth_tokens` row(s) to force reconnect.
3) Rotate Google OAuth Client Secret in Google Console.
4) Verify no unauthorized Google connections exist.

## Unexpected OpenAI billing spike
1) Rotate `OPENAI_API_KEY`.
2) Temporarily disable AI endpoints by removing `OPENAI_API_KEY` env var.
3) Review logs for which endpoints called.
4) Add stricter rate limit and caching in next release.

## Data corruption / accidental merges
1) Stop merges (communicate, rotate PRIVATE_LINK_KEY if needed)
2) Restore from Neon PITR or pg_dump backup.
3) Re-run migrations.
4) Run smoke tests.
