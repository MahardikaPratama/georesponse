<#
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-20
Description  : Verifies a deployed (or locally running) GeoResponse stack
               is healthy: polls the backend's GET /health until it
               returns 200 with "database":"ok", then polls the frontend's
               root path until it returns 200. Exits non-zero if either
               does not become healthy within the timeout, so it can gate
               a deploy or a rollback decision. PowerShell twin of
               health-check.sh.

Usage:
  scripts\deployment\health-check.ps1 [-BackendUrl <url>] [-FrontendUrl <url>] [-TimeoutSeconds <n>]

Environment (used when the parameters are absent):
  BACKEND_URL    default http://localhost:8080
  FRONTEND_URL   default http://localhost:5173
  HEALTH_TIMEOUT default 90

Changelog:
- 1.0.0 (2026-09-20): Initial creation.
#>

[CmdletBinding()]
param(
    [string]$BackendUrl = $(if ($env:BACKEND_URL) { $env:BACKEND_URL } else { "http://localhost:8080" }),
    [string]$FrontendUrl = $(if ($env:FRONTEND_URL) { $env:FRONTEND_URL } else { "http://localhost:5173" }),
    [int]$TimeoutSeconds = $(if ($env:HEALTH_TIMEOUT) { [int]$env:HEALTH_TIMEOUT } else { 90 })
)

$ErrorActionPreference = "Continue"

function Wait-ForHealthy {
    param([string]$Label, [string]$Url, [string]$BodyMustContain = "")

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    Write-Host "--- Waiting for $Label at $Url (timeout ${TimeoutSeconds}s) ---"
    while ($true) {
        $status = 0
        $body = ""
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            $status = [int]$response.StatusCode
            $body = [string]$response.Content
        }
        catch {
            if ($_.Exception.Response) {
                try { $status = [int]$_.Exception.Response.StatusCode } catch { $status = 0 }
            }
        }

        if ($status -eq 200 -and ($BodyMustContain -eq "" -or $body.Contains($BodyMustContain))) {
            $suffix = if ($body) { ": $($body.Trim())" } else { "" }
            Write-Host "OK: $Label is healthy (HTTP $status)$suffix"
            return $true
        }
        if ((Get-Date) -ge $deadline) {
            Write-Host "FAIL: $Label did not become healthy within ${TimeoutSeconds}s (last HTTP $status)" -ForegroundColor Red
            return $false
        }
        Start-Sleep -Seconds 2
    }
}

Write-Host "=== GeoResponse health check ==="
$ok = $true
if (-not (Wait-ForHealthy -Label "backend" -Url ($BackendUrl.TrimEnd("/") + "/health") -BodyMustContain '"database":"ok"')) { $ok = $false }
if (-not (Wait-ForHealthy -Label "frontend" -Url ($FrontendUrl.TrimEnd("/") + "/"))) { $ok = $false }

if (-not $ok) {
    Write-Host "=== Health check FAILED ===" -ForegroundColor Red
    exit 1
}
Write-Host "=== Health check passed ==="
exit 0
