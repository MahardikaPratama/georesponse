<#
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : One-shot local dev environment bootstrap: installs
               frontend and backend dependencies, then applies database
               migrations and seed data if a database is configured.
               Windows PowerShell equivalent of setup.sh. Degrades
               gracefully (prints a clear skip message rather than
               failing) when npm, Go modules, or DATABASE_URL/migrate
               are not available.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
#>

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Join-Path $ScriptDir "..\.."
$FeDir = Join-Path $RepoRoot "georesponse-fe"
$BeDir = Join-Path $RepoRoot "georesponse-be"

Write-Host "=== GeoResponse dev environment setup ==="

# --- Frontend dependencies ---------------------------------------------------
if (Get-Command npm -ErrorAction SilentlyContinue) {
    if (Test-Path (Join-Path $FeDir "package.json")) {
        Write-Host "--- Installing frontend dependencies (npm install in georesponse-fe/) ---"
        Push-Location $FeDir
        try {
            npm install
            if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE" }
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "SKIP: $FeDir\package.json not found; skipping frontend dependency install."
    }
} else {
    Write-Host "SKIP: 'npm' is not on PATH; skipping frontend dependency install."
    Write-Host "      Install Node.js (https://nodejs.org/) to enable this step."
}

# --- Backend dependencies -----------------------------------------------------
if (Get-Command go -ErrorAction SilentlyContinue) {
    if (Test-Path (Join-Path $BeDir "go.mod")) {
        Write-Host "--- Installing backend dependencies (go mod download in georesponse-be/) ---"
        Push-Location $BeDir
        try {
            go mod download
            if ($LASTEXITCODE -ne 0) { throw "go mod download failed with exit code $LASTEXITCODE" }
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "SKIP: $BeDir\go.mod not found; skipping backend dependency download."
    }
} else {
    Write-Host "SKIP: 'go' is not on PATH; skipping backend dependency download."
    Write-Host "      Install Go (https://go.dev/dl/) to enable this step."
}

# --- Database migrations + seed -----------------------------------------------
if (-not $env:DATABASE_URL) {
    Write-Host "SKIP: DATABASE_URL is not set; skipping migrations and seed data."
    Write-Host "      Set DATABASE_URL and re-run this script (or run"
    Write-Host "      scripts\database\migrate.ps1 and scripts\database\seed.ps1 directly)"
    Write-Host "      once a database is available."
} elseif (-not (Get-Command migrate -ErrorAction SilentlyContinue)) {
    Write-Host "SKIP: the 'migrate' CLI is not on PATH; skipping migrations and seed data."
    Write-Host "      Install it with: go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
} else {
    Write-Host "--- Running database migrations ---"
    & (Join-Path $ScriptDir "..\database\migrate.ps1")
    if ($LASTEXITCODE -ne 0) { throw "migrate.ps1 failed with exit code $LASTEXITCODE" }

    Write-Host "--- Loading seed data ---"
    & (Join-Path $ScriptDir "..\database\seed.ps1")
    if ($LASTEXITCODE -ne 0) { throw "seed.ps1 failed with exit code $LASTEXITCODE" }
}

Write-Host "=== Setup complete ==="
