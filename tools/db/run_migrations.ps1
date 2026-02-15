# ContactList DB Migration Runner
# Requires: psql in PATH, DATABASE_URL env var set
$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL env var is not set."
}

Write-Host "DATABASE_URL is set. Running migrations..."

$migs = @(
  ".\db\migrations\0001_init.sql",
  ".\db\migrations\0002_seed_tags.sql",
  ".\db\migrations\0003_indexes_search.sql"
)

foreach ($m in $migs) {
  if (-not (Test-Path $m)) { throw "Missing migration: $m" }
  Write-Host "Applying $m"
  psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f $m
}

# Optional pg_trgm
$opt = ".\db\migrations\0004_optional_pg_trgm.sql"
if (Test-Path $opt) {
  Write-Host "Optional migration available: $opt"
  Write-Host "Run it manually if desired:"
  Write-Host "  psql `"$env:DATABASE_URL`" -v ON_ERROR_STOP=1 -f $opt"
}

Write-Host "Migrations complete."
