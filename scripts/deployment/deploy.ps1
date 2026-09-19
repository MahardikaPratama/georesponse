<#
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-20
Description  : Deploys (or redeploys) the georesponse-be and georesponse-fe
               containers on the current Docker host using the compose
               topology in docker-compose.yml. By default it builds the
               images for the current commit (scripts\docker\build.ps1),
               then (re)starts only the two application services with
               that tag, leaving georesponse-db running. Pass -Tag <tag>
               to deploy an already-built image tag instead (the rollback
               path: point at the previous known-good tag), and -NoBuild
               to skip building entirely. Afterwards run
               scripts\deployment\health-check.ps1 to verify.
               PowerShell twin of deploy.sh.

               Migrations: the backend applies pending migrations itself
               at start-up when APP_ENV=development. For any other
               APP_ENV run scripts\database\migrate.ps1 before this script.

Usage:
  scripts\deployment\deploy.ps1 [-Tag <tag>] [-NoBuild]

Changelog:
- 1.0.0 (2026-09-20): Initial creation.
#>

[CmdletBinding()]
param(
    [string]$Tag = $env:IMAGE_TAG,
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "ERROR: 'docker' is not on PATH."
    exit 1
}
& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Error "ERROR: the Docker daemon is not running or not reachable."
    exit 1
}

$build = -not $NoBuild
if ($PSBoundParameters.ContainsKey("Tag") -and -not [string]::IsNullOrWhiteSpace($Tag)) {
    # An explicit tag means "deploy what is already built" (rollback path).
    $build = $false
}
if ([string]::IsNullOrWhiteSpace($Tag)) {
    Push-Location $RepoRoot
    try {
        $Tag = (& git rev-parse --short HEAD 2>$null)
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($Tag)) { $Tag = "latest" }
    }
    finally { Pop-Location }
}

if (-not (Test-Path (Join-Path $RepoRoot ".env"))) {
    Write-Warning "$RepoRoot\.env not found; docker compose will fall back to the placeholder defaults in docker-compose.yml."
    Write-Warning "Copy .env.example to .env and set real values before deploying anywhere but a local machine."
}

Write-Host "=== GeoResponse deploy (tag: $Tag) ==="

if ($build) {
    & (Join-Path $ScriptDir "..\docker\build.ps1") -Tag $Tag
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
else {
    foreach ($image in @("georesponse-be", "georesponse-fe")) {
        & docker image inspect "${image}:$Tag" *> $null
        if ($LASTEXITCODE -ne 0) {
            Write-Error "ERROR: image ${image}:$Tag does not exist locally. Build it first (scripts\docker\build.ps1 -Tag $Tag) or choose an existing tag."
            exit 1
        }
    }
}

Push-Location $RepoRoot
try {
    Write-Host "--- Ensuring georesponse-db is up ---"
    & docker compose up -d georesponse-db
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host "--- (Re)starting georesponse-be and georesponse-fe with tag $Tag ---"
    $env:IMAGE_TAG = $Tag
    & docker compose up -d --no-build --force-recreate georesponse-be georesponse-fe
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally { Pop-Location }

Write-Host "=== Deploy issued. Verify with: scripts\deployment\health-check.ps1 ==="
