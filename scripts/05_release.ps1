# ContactList - Release Checklist Helper
# This script prints the steps; it does not deploy automatically.
$ErrorActionPreference = "Stop"

Write-Host "Release steps:"
Write-Host "1) Run: .\scripts\03_build.ps1"
Write-Host "2) Run tests/lint (optional): npm --prefix app run lint ; npm --prefix app run test"
Write-Host "3) Ensure Netlify env vars are set (see docs/ops/ENV_MATRIX.md)"
Write-Host "4) Ensure Neon migrations applied (see docs/ops/DB_RUNBOOK.md)"
Write-Host "5) git status clean; commit; push"
Write-Host "6) Watch Netlify deploy logs"
Write-Host "7) Run smoke tests (docs/ops/SMOKE_TESTS.md)"
