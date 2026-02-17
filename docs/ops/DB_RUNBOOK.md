# Database Runbook (Neon Postgres)

## Connection
- Neon provides `DATABASE_URL` with SSL. Use it as-is in Netlify.
- For local migrations, install `psql` and set `DATABASE_URL` env var.

## Migrations
- Location: `app/db/migrations/*.sql`
- Migrations are written to be **idempotent** (safe to re-run).
- Apply order is filename sort (prefix with 4-digit sequence).

### Apply (Windows PowerShell)
```powershell
$env:DATABASE_URL="postgres://..."
.\scripts_db_migrate.ps1
```

## Backups
Neon supports point-in-time restore on paid tiers; regardless, do periodic exports:

### Logical export (contacts + tags + notes + sources)
Use a read-only export SQL or pg_dump:
```powershell
pg_dump $env:DATABASE_URL --format=custom --file=contactlist.backup
```

## Data retention and deletes
- Contacts may be soft-deleted via `deleted_at` when merges occur.
- Hard deletes should be avoided in production; prefer soft-delete + export for audit.

## Performance
- Ensure indexes exist on:
  - contacts(primary_email), contacts(primary_phone)
  - tags(name)
  - contact_tags(contact_id, tag_id)
  - contact_sources(import_batch_id, row_fingerprint)
  - duplicate_suggestions(status, score)
