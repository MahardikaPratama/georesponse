<#
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Optional aggregate static-analysis pass via the
               sonar-scanner CLI. Windows PowerShell equivalent of
               sonar.sh. Not required to pass the merge gate
               (scripts/quality/check.ps1 is authoritative). Fails with
               a clear, actionable message rather than a stack trace
               when sonar-scanner, SONAR_TOKEN, or SONAR_HOST_URL are
               missing, since no SonarQube server is provisioned by
               default for this take-home.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
#>

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Join-Path $ScriptDir "..\.."

if (-not (Get-Command sonar-scanner -ErrorAction SilentlyContinue)) {
    Write-Host @"
SonarQube analysis was skipped: the 'sonar-scanner' CLI is not on PATH.

This project's SonarQube analysis (sonar-project.properties at the repo
root) is optional, aspirational extra assurance - it is NOT required to
pass the local quality gate (scripts\quality\check.ps1) or the merge
gate. No SonarQube server is provisioned for this take-home submission
by default.

To actually run it, you need one of:
  1. The sonar-scanner CLI, installed locally:
     https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/scanners/sonarscanner/
  2. The sonar-scanner-cli Docker image, e.g.:
     docker run --rm ``
       -e SONAR_HOST_URL=`$env:SONAR_HOST_URL ``
       -e SONAR_TOKEN=`$env:SONAR_TOKEN ``
       -v "`${PWD}:/usr/src" ``
       sonarsource/sonar-scanner-cli

...plus a running SonarQube server (self-hosted or SonarCloud) and the
following environment variables:
  SONAR_HOST_URL  - e.g. https://sonarcloud.io or your self-hosted URL
  SONAR_TOKEN     - a project or user analysis token

Exiting without error: this is an optional step, not a required gate.
"@
    exit 0
}

if (-not $env:SONAR_TOKEN -or -not $env:SONAR_HOST_URL) {
    Write-Host @"
SonarQube analysis was skipped: SONAR_TOKEN and/or SONAR_HOST_URL are not set.

sonar-scanner was found on PATH, but a scan cannot authenticate against a
SonarQube/SonarCloud server without both of:
  SONAR_HOST_URL  - e.g. https://sonarcloud.io or your self-hosted URL
  SONAR_TOKEN     - a project or user analysis token

Set both environment variables and re-run this script. This is an
optional step, not a required gate.

Exiting without error: this is an optional step, not a required gate.
"@
    exit 0
}

Write-Host "Running sonar-scanner against $($env:SONAR_HOST_URL) ..."
Push-Location $RepoRoot
try {
    & sonar-scanner "-Dsonar.host.url=$($env:SONAR_HOST_URL)" "-Dsonar.token=$($env:SONAR_TOKEN)"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "sonar-scanner failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}
