# ContactList - Build All
$ErrorActionPreference = "Stop"
npm --prefix app/functions ci
npm --prefix app/web ci
npm --prefix app run build:all
Write-Host "Build complete."
