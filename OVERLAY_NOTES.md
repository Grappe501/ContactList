# Overlay 02 — Database Core
Generated: 2026-02-13T00:21:17.375611

Purpose:
- Add the canonical Postgres migration set and operational scripts for Neon.
- Establish performance indexes and optional fuzzy-search extension.

Files added/updated:
- `db/migrations/0001_init.sql`
- `db/migrations/0002_seed_tags.sql`
- `db/migrations/0003_indexes_search.sql`
- `db/migrations/0004_optional_pg_trgm.sql` (optional)
- `db/README_DB.md`
- `tools/db/run_migrations.ps1`
- `tools/db/verify_db.ps1`

Apply:
1) Unzip into ContactList root (overwrite allowed).
2) Ensure `DATABASE_URL` is set in your PowerShell session.
3) Run:
   - `powershell -ExecutionPolicy Bypass -File .\tools\db\run_migrations.ps1`
4) Verify:
   - `powershell -ExecutionPolicy Bypass -File .\tools\db\verify_db.ps1`

Smoke tests:
- `psql "$env:DATABASE_URL" -c "\dt"` should show tables.
- `psql "$env:DATABASE_URL" -c "select count(*) from tags;"` should be >= 10.

Notes:
- `0004_optional_pg_trgm.sql` is optional; run only if you want fuzzy name search acceleration.
