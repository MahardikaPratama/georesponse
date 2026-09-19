<#
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Applies all pending golang-migrate "up" migrations in
               database/migrations/ against the database identified by
               DATABASE_URL. Windows PowerShell equivalent of migrate.sh.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
#>

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

# golang-migrate's -path flag builds a "file://" source URL by naively
# concatenating the scheme and the given path. An absolute Windows path like
# "D:\foo\bar" breaks that URL no matter how it's escaped (the drive letter's
# colon parses as a port, or the file driver mishandles the resulting
# leading-slash path) — so migrate is invoked with a relative "." path from
# inside the migrations directory instead, which sidesteps the drive letter
# entirely.
Write-Host "Applying pending migrations from $MigrationsDir ..."
Push-Location $MigrationsDir
try {
    & migrate -path . -database $env:DATABASE_URL up
    if ($LASTEXITCODE -ne 0) {
        Write-Error "migrate up failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}

Write-Host "Migrations applied successfully."
