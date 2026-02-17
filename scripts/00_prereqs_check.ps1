# ContactList - Prereqs Check (Windows)
# Requires: git, node>=20, npm, netlify-cli(optional), psql(optional), python(optional)
$ErrorActionPreference = "Stop"

Write-Host "Checking prerequisites..."

function Check-Cmd($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) { Write-Warning "$name not found"; return $false }
  Write-Host "$name: $($cmd.Source)"
  return $true
}

$ok = $true
$ok = (Check-Cmd git) -and $ok
$ok = (Check-Cmd node) -and $ok
$ok = (Check-Cmd npm) -and $ok

if (Check-Cmd netlify) {
  netlify --version
} else {
  Write-Host "netlify-cli not installed. Install with: npm i -g netlify-cli"
}

if (Check-Cmd psql) {
  psql --version
} else {
  Write-Host "psql not installed (optional). You can still run migrations via Neon console or a docker psql."
}

if (-not $ok) {
  Write-Error "Missing required tools. Install the missing prerequisites and re-run."
}

Write-Host "OK"
