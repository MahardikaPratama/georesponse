<#
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Runs frontend tests (npm test), backend tests
               (go test ./...), and - when GEORESPONSE_API_URL points at
               a running stack - the API integration tests under
               tests\integration\. Windows PowerShell equivalent of
               test.sh. Frontend tests are skipped with a clear message
               when npm is unavailable, rather than failing the whole
               script.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
- 1.1.0 (2026-09-20): Added the tests\integration\ suite, run only when
                       GEORESPONSE_API_URL is set (it needs a live
                       backend + database).
#>

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Join-Path $ScriptDir "..\.."
$FeDir = Join-Path $RepoRoot "georesponse-fe"
$BeDir = Join-Path $RepoRoot "georesponse-be"

$Failed = $false

Write-Host "=== GeoResponse test run ==="

# --- Frontend tests ------------------------------------------------------------
if (Get-Command npm -ErrorAction SilentlyContinue) {
    if (Test-Path (Join-Path $FeDir "package.json")) {
        Write-Host "--- Frontend tests (npm test in georesponse-fe/) ---"
        Push-Location $FeDir
        try {
            npm test
            if ($LASTEXITCODE -ne 0) {
                Write-Host "FAILED: frontend tests"
                $Failed = $true
            }
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "SKIP: $FeDir\package.json not found; skipping frontend tests."
    }
} else {
    Write-Host "SKIP: 'npm' is not on PATH; skipping frontend tests."
}

# --- Backend tests ---------------------------------------------------------------
if (Get-Command go -ErrorAction SilentlyContinue) {
    if (Test-Path (Join-Path $BeDir "go.mod")) {
        Write-Host "--- Backend tests (go test ./... in georesponse-be/) ---"
        Push-Location $BeDir
        try {
            go test ./...
            if ($LASTEXITCODE -ne 0) {
                Write-Host "FAILED: backend tests"
                $Failed = $true
            }
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "SKIP: $BeDir\go.mod not found; skipping backend tests."
    }
} else {
    Write-Host "SKIP: 'go' is not on PATH; skipping backend tests."
}

# --- Integration tests (need a running stack) ----------------------------------
$IntegrationDir = Join-Path $RepoRoot "tests\integration"
if (-not $env:GEORESPONSE_API_URL) {
    Write-Host "SKIP: GEORESPONSE_API_URL is not set; skipping tests\integration\ (start the stack with .\run.ps1 and set `$env:GEORESPONSE_API_URL = 'http://localhost:8080' to run them)."
} elseif ((Get-Command go -ErrorAction SilentlyContinue) -and (Test-Path (Join-Path $IntegrationDir "go.mod"))) {
    Write-Host "--- Integration tests (go test ./... in tests/integration/ against $env:GEORESPONSE_API_URL) ---"
    Push-Location $IntegrationDir
    try {
        go test ./... -count=1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "FAILED: integration tests"
            $Failed = $true
        }
    } finally {
        Pop-Location
    }
}

if ($Failed) {
    Write-Host "=== Test run FAILED ==="
    exit 1
}

Write-Host "=== Test run passed ==="
