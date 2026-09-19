# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-19
# Description  : Applies all pending golang-migrate "up" migrations in
#                database/migrations/ against the database identified by
#                DATABASE_URL, per DATABASE_MIGRATIONS.md section 4.
#                Windows PowerShell equivalent of migrate.sh.
#
# Changelog:
# - 1.0.0 (2026-09-19): Initial creation.

$ErrorActionPreference = "Stop"

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

Write-Host "Applying pending migrations from $MigrationsDir ..."
& migrate -path $MigrationsDir -database $env:DATABASE_URL up
if ($LASTEXITCODE -ne 0) {
    Write-Error "migrate up failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

Write-Host "Migrations applied successfully."
