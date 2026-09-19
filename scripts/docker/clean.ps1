<#
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-20
Description  : Removes locally built GeoResponse images (every
               georesponse-fe:* and georesponse-be:* tag) and the dangling
               build layers they left behind, without touching unrelated
               images, containers, or volumes on the machine. Stops the
               compose stack's containers first so the images are not in
               use. The database volume is kept unless -Volumes is given.
               PowerShell twin of clean.sh.

Usage:
  scripts\docker\clean.ps1 [-Volumes]

Changelog:
- 1.0.0 (2026-09-20): Initial creation.
#>

[CmdletBinding()]
param(
    [switch]$Volumes
)

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "ERROR: 'docker' is not on PATH."
    exit 1
}

Write-Host "=== GeoResponse Docker clean-up ==="

Write-Host "--- Stopping the compose stack (containers only) ---"
Push-Location $RepoRoot
try {
    if ($Volumes) { & docker compose down --remove-orphans --volumes }
    else { & docker compose down --remove-orphans }
}
finally { Pop-Location }

Write-Host "--- Removing georesponse-fe / georesponse-be images ---"
$images = @(& docker image ls --filter "reference=georesponse-fe" --filter "reference=georesponse-be" -q | Sort-Object -Unique)
if ($images.Count -gt 0) {
    & docker image rm -f @images
}
else {
    Write-Host "No georesponse-fe / georesponse-be images found."
}

Write-Host "--- Pruning dangling build layers ---"
& docker image prune -f --filter "dangling=true" | Out-Null
& docker builder prune -f | Out-Null

Write-Host "=== Clean-up complete ==="
exit 0
