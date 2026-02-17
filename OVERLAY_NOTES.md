# Overlay 07 — vCard Import Engine
Generated: 2026-02-13T00:42:53.752828

Purpose:
- Implement vCard (.vcf) import pipeline with:
  - Server-side vCard parsing (VCARD 2.1/3.0/4.0 best-effort)
  - Preview endpoint: show parsed cards + inferred mapping to canonical fields
  - Commit endpoint: creates import batch + contacts + provenance (contact_sources)
  - Note extraction: NOTE -> contacts.metadata.custom_fields.note or Notes (optional: kept in custom_fields for now)
  - Row/card fingerprinting for idempotent ingestion within batch

Endpoints added (relative to `/.netlify/functions/api`):
- POST /imports/vcard/preview
- POST /imports/vcard/commit

Payload shapes:
- preview: { file_name?, vcard_text OR vcard_base64, source_label? }
- commit:  { file_name?, vcard_text OR vcard_base64, source_type='vcard', source_label, donor_name?, donor_org?, operator_label?, defaults? }

Apply:
1) Unzip into ContactList root.
2) `cd app\functions; npm ci; npm run build`
3) `cd ..\web; npm ci; npm run build`

Smoke tests:
- Use Imports page -> vCard Import -> Preview -> Commit
