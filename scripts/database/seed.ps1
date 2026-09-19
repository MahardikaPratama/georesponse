<#
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Loads seed data from database/seeds/ into the database
               identified by DATABASE_URL, after migrations have been
               applied. Seed files are applied via `psql`, since it is
               the standard PostgreSQL client for running plain SQL
               files and needs no additional dependency beyond a
               PostgreSQL client install. Windows PowerShell equivalent
               of seed.sh.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
#>

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SeedsDir = Join-Path $ScriptDir "..\..\database\seeds"
$SeedsDir = (Resolve-Path $SeedsDir).Path

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Error @"
ERROR: 'psql' is not on PATH.
Install the PostgreSQL client tools, e.g.:
  - Windows: install the PostgreSQL client from https://www.postgresql.org/download/windows/
    (or via 'choco install postgresql' / 'winget install PostgreSQL.PostgreSQL')
  - or use scripts/database/seed.sh under Git Bash / WSL if psql is available there.
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

$seedFiles = Get-ChildItem -Path $SeedsDir -Filter "*.sql" | Sort-Object Name

if ($seedFiles.Count -eq 0) {
    Write-Host "No seed files found in $SeedsDir; nothing to do."
    exit 0
}

foreach ($seedFile in $seedFiles) {
    Write-Host "Applying seed file: $($seedFile.FullName)"
    & psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $seedFile.FullName
    if ($LASTEXITCODE -ne 0) {
        Write-Error "psql failed applying $($seedFile.Name) with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    }
}

Write-Host "Seed data applied successfully."
