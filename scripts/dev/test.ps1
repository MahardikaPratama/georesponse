<#
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Runs frontend tests (npm test) then backend tests
               (go test ./...). Windows PowerShell equivalent of
               test.sh. Frontend tests are skipped with a clear message
               when npm is unavailable, rather than failing the whole
               script.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
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

if ($Failed) {
    Write-Host "=== Test run FAILED ==="
    exit 1
}

Write-Host "=== Test run passed ==="
