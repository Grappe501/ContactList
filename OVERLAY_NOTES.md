# Overlay 15 — Postgres RLS Policy Pack (Single-Tenant + Roles)
Generated: 2026-02-13T01:35:30.505025

Adds:
- Database migration enabling **Row Level Security (RLS)** for core tables.
- A strict policy model based on DB session variables:
  - `app.user_id` (UUID)
  - `app.role` (text role)
- A functions-side DB wrapper that sets those session variables **per request** inside a transaction.

Important:
- This is **single-tenant**. RLS is used for **role enforcement** and defense-in-depth.
- Overlay 13/14 already attach the authenticated user to the event; this overlay ensures DB sees it.

## Tables protected
- contacts
- notes
- tags
- contact_tags
- contact_sources
- import_batches
- duplicate_suggestions
- merge_history
- oauth_tokens (if present)

## Policy overview
Read:
- viewer+ can SELECT almost everything (campaign-wide), except oauth_tokens.

Write:
- owner/admin/organizer/data_entry can INSERT/UPDATE contacts/tags/notes
- only owner/admin can DELETE contacts and destructive operations

OAuth tokens:
- only owner/admin can read/write oauth_tokens

## New / Updated files
- app/db/migrations/0015_rls_policies.sql
- app/functions/src/shared/db.ts (updated wrapper with request-scoped transaction + set_config)
- app/functions/src/shared/withDb.ts (helper to run repository code under RLS context)

Apply:
1) Unzip into repo root
2) Apply migration `0015_rls_policies.sql`
3) Deploy functions
