# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-19
# Description  : Rolls back the most recently applied migration(s) using
#                golang-migrate's "down" mechanics, per
#                DATABASE_MIGRATIONS.md section 4. Accepts an optional
#                numeric argument for the number of migrations to roll
#                back (default: 1). Windows PowerShell equivalent of
#                rollback.sh.
#
# Changelog:
# - 1.0.0 (2026-09-19): Initial creation.

param(
    [Parameter(Position = 0)]
    [int]$Steps = 1
)

$ErrorActionPreference = "Stop"

if ($Steps -lt 1) {
    Write-Error "ERROR: rollback step count must be a positive integer, got '$Steps'."
    exit 1
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MigrationsDir = Join-Path $ScriptDir "..\..\database\migrations"
$MigrationsDir = (Resolve-Path $MigrationsDir).Path

if (-not (Get-Command migrate -ErrorAction SilentlyContinue)) {
    Write-Error @"
ERROR: the 'migrate' CLI (golang-migrate) is not on PATH.
Install it with:
  go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest
and ensure the Go bin directory (go env GOPATH)\bin is on your PATH.
"@
    exit 1
}

if (-not $env:DATABASE_URL) {
    Write-Error @"
ERROR: DATABASE_URL is not set.
Set it to a PostgreSQL connection string, e.g.:
  `$env:DATABASE_URL = "postgres://georesponse:georesponse_dev_password@localhost:5432/georesponse?sslmode=disable"
"@
    exit 1
}

Write-Host "Rolling back $Steps migration(s) using $MigrationsDir ..."
& migrate -path $MigrationsDir -database $env:DATABASE_URL down $Steps
if ($LASTEXITCODE -ne 0) {
    Write-Error "migrate down failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

Write-Host "Rollback complete."
