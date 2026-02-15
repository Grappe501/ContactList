# ContactList DB Verification
$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL env var is not set."
}

Write-Host "Verifying tables..."
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -c "\dt"

Write-Host "Verifying seed tags..."
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -c "select name, category from tags order by name;"

Write-Host "Verifying core constraints..."
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -c "select count(*) as contacts_count from contacts;"
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -c "select count(*) as batches_count from import_batches;"

Write-Host "DB verification complete."
