# ContactList - Run DB Migrations
# Usage:
#   $env:DATABASE_URL="postgres://..."
#   .\scripts\04_db_migrate.ps1
$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) { throw "DATABASE_URL not set" }

Write-Host "Running SQL migrations (idempotent)..."
Get-ChildItem -Path app/db/migrations -Filter "*.sql" | Sort-Object Name | ForEach-Object {
  Write-Host "Applying $($_.Name)..."
  psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $_.FullName
}
Write-Host "Migrations complete."
