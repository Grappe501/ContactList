# Overlay 12 — Deployment Scripts + Ops Runbook
Generated: 2026-02-13T01:09:13.933831

Adds:
- PowerShell scripts for local setup, dev, build, and deployment workflows (Windows-first)
- Netlify config hardening and build settings
- Ops Runbook (enterprise-grade) including:
  - Environment variable matrix
  - Neon connection & migrations checklist
  - Netlify deployment checklist
  - Backup/export procedures
  - Rotation procedures (PRIVATE_LINK_KEY, TOKEN_ENCRYPTION_KEY, Google OAuth secrets, OpenAI key)
  - Incident response (leak, data corruption, unexpected billing, OAuth issues)
  - Observability guidance (Netlify function logs, request IDs)
  - QA/Smoke test playbook
  - Release process and versioning

This overlay does NOT implement new application features—only operational scaffolding.
