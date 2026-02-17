# ContactList - Local Dev (Netlify)
# Requires netlify-cli
# Usage: .\scripts\02_local_dev.ps1
$ErrorActionPreference = "Stop"

Write-Host "Starting Netlify dev..."
# Uses netlify.toml build settings and routes functions
netlify dev
