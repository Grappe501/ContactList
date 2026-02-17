# ContactList - Clone and Initialize
# Usage:
#   .\scripts\01_clone_and_init.ps1 -RepoUrl https://github.com/<org>/<repo>.git -Folder ContactList
param(
  [Parameter(Mandatory=$true)][string]$RepoUrl,
  [Parameter(Mandatory=$true)][string]$Folder
)
$ErrorActionPreference = "Stop"

Write-Host "Cloning repo..."
git clone $RepoUrl $Folder
Set-Location $Folder

Write-Host "Installing dependencies..."
npm --prefix app/functions ci
npm --prefix app/web ci

Write-Host "Done. Next: configure env vars in Netlify + Neon, then run dev."
