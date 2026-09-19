<#
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-20
Description  : One-command local run for GeoResponse on Windows. Verifies
               Docker is installed and running; creates .env,
               georesponse-fe\.env and georesponse-be\.env from their
               .env.example files only when the .env does not already
               exist (never overwrites a developer's local values); builds
               and starts the full stack (frontend, backend, PostgreSQL +
               PostGIS) with `docker compose up --build`, waits until every
               service reports healthy — the database schema is migrated
               and seeded automatically along the way — and prints the
               access URLs. PowerShell twin of run.sh.

Usage:
  .\run.ps1              # build, start in the background, print URLs
  .\run.ps1 -Foreground  # same, but stay attached to the compose logs
  .\run.ps1 -Down        # stop the stack (keeps the database volume)

Changelog:
- 1.0.0 (2026-09-20): Initial creation.
#>

[CmdletBinding()]
param(
    [switch]$Foreground,
    [switch]$Down
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $RepoRoot
try {
    # --- 1. Docker available and running ---------------------------------------
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "ERROR: 'docker' is not on PATH. Install Docker Desktop (https://www.docker.com/products/docker-desktop/), then re-run .\run.ps1."
        exit 1
    }
    & docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "ERROR: Docker is installed but the daemon is not running. Start Docker Desktop, then re-run .\run.ps1."
        exit 1
    }
    & docker compose version *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "ERROR: 'docker compose' (Compose v2 plugin) is not available."
        exit 1
    }

    if ($Down) {
        Write-Host "=== Stopping GeoResponse (database volume is kept; use 'docker compose down -v' to drop it) ==="
        & docker compose down --remove-orphans
        exit $LASTEXITCODE
    }

    # --- 2. Environment files (create only if missing) -------------------------
    function Ensure-EnvFile([string]$Example, [string]$Target) {
        if (Test-Path $Target) {
            Write-Host "env: $Target already exists - left untouched."
        }
        elseif (Test-Path $Example) {
            Copy-Item $Example $Target
            Write-Host "env: created $Target from $Example."
        }
        else {
            Write-Warning "$Example not found; skipping $Target."
        }
    }
    Write-Host "=== GeoResponse: preparing environment files ==="
    Ensure-EnvFile ".env.example" ".env"
    Ensure-EnvFile "georesponse-fe\.env.example" "georesponse-fe\.env"
    Ensure-EnvFile "georesponse-be\.env.example" "georesponse-be\.env"

    # --- 3. Build and start -----------------------------------------------------
    Write-Host "=== GeoResponse: building images and starting the stack ==="
    if ($Foreground) {
        Write-Host ""
        Write-Host "Frontend  -> http://localhost:5173"
        Write-Host "Backend   -> http://localhost:8080/api/v1"
        Write-Host "Health    -> http://localhost:8080/health"
        Write-Host ""
        & docker compose up --build
        exit $LASTEXITCODE
    }

    & docker compose up --build --detach --wait --wait-timeout 300
    if ($LASTEXITCODE -ne 0) {
        Write-Error "docker compose up failed with exit code $LASTEXITCODE. Inspect with: docker compose logs"
        exit $LASTEXITCODE
    }

    # --- 4. Access URLs ---------------------------------------------------------
    Write-Host ""
    Write-Host "=== GeoResponse is up ==="
    Write-Host ""
    Write-Host "  Frontend  -> http://localhost:5173"
    Write-Host "  Backend   -> http://localhost:8080/api/v1"
    Write-Host "  Health    -> http://localhost:8080/health"
    Write-Host ""
    Write-Host 'Demo login (local development only, from database\seeds): identifier "user-001",'
    Write-Host 'password "ChangeMe123!" (administrator). See AKUN.md for the read-only account.'
    Write-Host ""
    Write-Host "  Follow logs   -> docker compose logs -f"
    Write-Host "  Stop          -> .\run.ps1 -Down        (or: docker compose down)"
    Write-Host "  Reset the DB  -> docker compose down -v (drops the database volume; the next"
    Write-Host "                   .\run.ps1 re-creates, migrates and seeds it)"
}
finally {
    Pop-Location
}
