# Database Design Notes (Enterprise)
Generated: 2026-02-13T00:10:10.009802

## Model
- Canonical editable: `contacts`
- Immutable imported/raw: `contact_sources`
- Provenance grouping: `import_batches`
- Many-to-many tagging: `tags`, `contact_tags`
- Append-only notes: `notes`
- Auditing: `activity_log`
- Dedupe pipeline artifacts: `duplicate_suggestions`
- Merge audit: `merges`
- OAuth storage: `oauth_tokens` (encrypted)

## PII stance
- DB stores PII; logs MUST redact.
- No RLS by default (single-tenant private tool), but can be added for multi-tenant enterprise version.

## Performance targets
- List contacts page < 300ms for typical queries on 25k contacts
- Import 10k CSV contacts within serverless timeouts by chunking (chunk size 250 default, configurable)

## Connection strategy
- Use Neon pooled connection string if available to avoid connection storms.
- Netlify functions must reuse a global pool when runtime reuses container.
