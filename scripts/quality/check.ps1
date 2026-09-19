<#
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Runs the full local quality gate mirroring CI_CD.md's
               pipeline stages and QUALITY_GATES.md's merge-gate
               criteria (G1-G7): frontend lint/type-check/build, backend
               gofmt/vet/build/test. Windows PowerShell equivalent of
               check.sh. Frontend gates are skipped with a clear message
               (not a hard failure) when npm is unavailable. Prints a
               pass/fail summary per gate and exits non-zero if any
               required gate fails.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
#>

# Intentionally not using $ErrorActionPreference = "Stop" globally: this
# script must keep running every gate even after one fails, so it can
# print a full pass/fail summary at the end (mirrors check.sh's approach
# of not using 'set -e').
$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Join-Path $ScriptDir "..\.."
$FeDir = Join-Path $RepoRoot "georesponse-fe"
$BeDir = Join-Path $RepoRoot "georesponse-be"

$GateStatus = [ordered]@{
    G1  = "SKIP"
    G2  = "SKIP"
    G3  = "SKIP"
    G4  = "SKIP"
    G5a = "SKIP"
    G5b = "SKIP"
    G5c = "SKIP"
    G6  = "SKIP"
    G7  = "SKIP"
}

function Invoke-Gate {
    param(
        [string]$Gate,
        [string]$Label,
        [string]$WorkingDir,
        [string]$Command,
        [string[]]$CommandArgs
    )
    Write-Host "--- $Gate : $Label ---"
    Push-Location $WorkingDir
    try {
        & $Command @CommandArgs
        if ($LASTEXITCODE -eq 0) {
            $GateStatus[$Gate] = "PASS"
        } else {
            $GateStatus[$Gate] = "FAIL"
        }
    } catch {
        Write-Host "ERROR running $Gate : $_"
        $GateStatus[$Gate] = "FAIL"
    } finally {
        Pop-Location
    }
}

$NpmAvailable = (Get-Command npm -ErrorAction SilentlyContinue) -and (Test-Path (Join-Path $FeDir "package.json"))
$GoAvailable = (Get-Command go -ErrorAction SilentlyContinue) -and (Test-Path (Join-Path $BeDir "go.mod"))

# --- G3 Frontend lint ---------------------------------------------------------
if ($NpmAvailable) {
    Invoke-Gate -Gate "G3" -Label "Frontend lint (npm run lint)" -WorkingDir $FeDir -Command "npm" -CommandArgs @("run", "lint")
} else {
    Write-Host "SKIP: G3 frontend lint (npm unavailable or georesponse-fe\package.json missing)"
}

# --- G4 Frontend type-check ---------------------------------------------------
if ($NpmAvailable) {
    Invoke-Gate -Gate "G4" -Label "Frontend type-check (npm run typecheck)" -WorkingDir $FeDir -Command "npm" -CommandArgs @("run", "typecheck")
} else {
    Write-Host "SKIP: G4 frontend type-check (npm unavailable or georesponse-fe\package.json missing)"
}

# --- G1 Frontend build ---------------------------------------------------------
if ($NpmAvailable) {
    Invoke-Gate -Gate "G1" -Label "Frontend build (npm run build)" -WorkingDir $FeDir -Command "npm" -CommandArgs @("run", "build")
} else {
    Write-Host "SKIP: G1 frontend build (npm unavailable or georesponse-fe\package.json missing)"
}

# --- G5a Backend format check --------------------------------------------------
if ($GoAvailable) {
    Write-Host "--- G5a : Backend format check (gofmt -l .) ---"
    Push-Location $BeDir
    try {
        $unformatted = & gofmt -l .
        if (-not $unformatted) {
            $GateStatus["G5a"] = "PASS"
        } else {
            Write-Host "The following files are not gofmt-formatted:"
            Write-Host $unformatted
            $GateStatus["G5a"] = "FAIL"
        }
    } finally {
        Pop-Location
    }

    # --- G5b Backend vet -------------------------------------------------------
    Invoke-Gate -Gate "G5b" -Label "Backend vet (go vet ./...)" -WorkingDir $BeDir -Command "go" -CommandArgs @("vet", "./...")

    # --- G5c Backend lint (golangci-lint, optional) -----------------------------
    if (Get-Command golangci-lint -ErrorAction SilentlyContinue) {
        Invoke-Gate -Gate "G5c" -Label "Backend lint (golangci-lint run)" -WorkingDir $BeDir -Command "golangci-lint" -CommandArgs @("run")
    } else {
        Write-Host "SKIP: G5c golangci-lint (not installed; optional per CODE_QUALITY.md section 4.2)"
    }
} else {
    Write-Host "SKIP: G5 backend static checks (go unavailable or georesponse-be\go.mod missing)"
}

# --- G2 Backend build -----------------------------------------------------------
if ($GoAvailable) {
    Invoke-Gate -Gate "G2" -Label "Backend build (go build ./...)" -WorkingDir $BeDir -Command "go" -CommandArgs @("build", "./...")
} else {
    Write-Host "SKIP: G2 backend build (go unavailable or georesponse-be\go.mod missing)"
}

# --- G7 Backend test -------------------------------------------------------------
if ($GoAvailable) {
    Invoke-Gate -Gate "G7" -Label "Backend test (go test ./...)" -WorkingDir $BeDir -Command "go" -CommandArgs @("test", "./...")
} else {
    Write-Host "SKIP: G7 backend test (go unavailable or georesponse-be\go.mod missing)"
}

# --- G6 Frontend test -------------------------------------------------------------
if ($NpmAvailable) {
    Invoke-Gate -Gate "G6" -Label "Frontend test (npm run test)" -WorkingDir $FeDir -Command "npm" -CommandArgs @("run", "test")
} else {
    Write-Host "SKIP: G6 frontend test (npm unavailable or georesponse-fe\package.json missing)"
}

Write-Host ""
Write-Host "=== Quality Gate Summary (QUALITY_GATES.md section 3) ==="
$OverallFail = $false
foreach ($gate in $GateStatus.Keys) {
    $status = $GateStatus[$gate]
    Write-Host ("{0,-4} {1}" -f $gate, $status)
    if ($status -eq "FAIL") {
        $OverallFail = $true
    }
}

if ($OverallFail) {
    Write-Host ""
    Write-Host "RESULT: FAIL - one or more required gates failed."
    exit 1
}

Write-Host ""
Write-Host "RESULT: PASS (gates marked SKIP were not run because their toolchain is unavailable in this environment)."
