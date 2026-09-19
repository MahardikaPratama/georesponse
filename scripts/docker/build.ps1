<#
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-20
Description  : Builds the georesponse-fe and georesponse-be images from
               their Dockerfiles with the project's naming convention:
               <name>:<tag> plus <name>:latest, where <tag> defaults to
               the current git short SHA (immutable per build) and can be
               overridden with -Tag or $env:IMAGE_TAG. Frontend build
               arguments (API_BASE_URL, MAP_TILE_URL, LOG_LEVEL) are read
               from the environment, or from the root .env if present.
               PowerShell twin of build.sh.

Usage:
  scripts\docker\build.ps1 [-Tag <tag>] [-FeOnly] [-BeOnly]

Changelog:
- 1.0.0 (2026-09-20): Initial creation.
#>

[CmdletBinding()]
param(
    [string]$Tag = $env:IMAGE_TAG,
    [switch]$FeOnly,
    [switch]$BeOnly
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "ERROR: 'docker' is not on PATH. Install Docker Desktop first."
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Tag)) {
    Push-Location $RepoRoot
    try {
        $Tag = (& git rev-parse --short HEAD 2>$null)
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($Tag)) { $Tag = "dev" }
    }
    finally { Pop-Location }
}

# Frontend build arguments: environment wins, then the root .env, then the
# same defaults docker-compose.yml uses.
$dotenv = @{}
$envFile = Join-Path $RepoRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { return }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { return }
        $dotenv[$line.Substring(0, $idx).Trim()] = $line.Substring($idx + 1).Trim()
    }
}
function Get-Setting([string]$name, [string]$fallback) {
    $fromEnv = [Environment]::GetEnvironmentVariable($name)
    if (-not [string]::IsNullOrWhiteSpace($fromEnv)) { return $fromEnv }
    if ($dotenv.ContainsKey($name) -and -not [string]::IsNullOrWhiteSpace($dotenv[$name])) { return $dotenv[$name] }
    return $fallback
}
$ApiBaseUrl = Get-Setting "API_BASE_URL" "http://localhost:8080/api/v1"
$MapTileUrl = Get-Setting "MAP_TILE_URL" ""
$LogLevel = Get-Setting "LOG_LEVEL" "debug"

Write-Host "=== GeoResponse image build (tag: $Tag) ==="

if (-not $FeOnly) {
    Write-Host "--- Building georesponse-be:$Tag ---"
    & docker build -t "georesponse-be:$Tag" -t "georesponse-be:latest" (Join-Path $RepoRoot "georesponse-be")
    if ($LASTEXITCODE -ne 0) { Write-Error "docker build (backend) failed with exit code $LASTEXITCODE."; exit $LASTEXITCODE }
}

if (-not $BeOnly) {
    Write-Host "--- Building georesponse-fe:$Tag ---"
    & docker build `
        --build-arg "API_BASE_URL=$ApiBaseUrl" `
        --build-arg "MAP_TILE_URL=$MapTileUrl" `
        --build-arg "LOG_LEVEL=$LogLevel" `
        -t "georesponse-fe:$Tag" -t "georesponse-fe:latest" (Join-Path $RepoRoot "georesponse-fe")
    if ($LASTEXITCODE -ne 0) { Write-Error "docker build (frontend) failed with exit code $LASTEXITCODE."; exit $LASTEXITCODE }
}

Write-Host "=== Build complete ==="
& docker image ls --filter "reference=georesponse-*" --format "table {{.Repository}}`t{{.Tag}}`t{{.Size}}`t{{.CreatedSince}}"
