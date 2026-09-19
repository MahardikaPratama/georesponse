#!/usr/bin/env bash
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-19
# Description  : Optional aggregate static-analysis pass via the
#                sonar-scanner CLI, per CODE_QUALITY.md section 4.3 and
#                QUALITY_GATES.md section 2. Not required to pass the
#                merge gate (scripts/quality/check.sh is authoritative).
#                Fails with a clear, actionable message rather than a
#                stack trace when sonar-scanner, SONAR_TOKEN, or
#                SONAR_HOST_URL are missing, since no SonarQube server is
#                provisioned by default for this take-home.
#
# Changelog:
# - 1.0.0 (2026-09-19): Initial creation.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/../.."

if ! command -v sonar-scanner >/dev/null 2>&1; then
    cat >&2 <<'EOF'
SonarQube analysis was skipped: the 'sonar-scanner' CLI is not on PATH.

This project's SonarQube analysis (sonar-project.properties at the repo
root) is optional, aspirational extra assurance per CODE_QUALITY.md
section 4.3 — it is NOT required to pass the local quality gate
(scripts/quality/check.sh) or the merge gate (QUALITY_GATES.md). No
SonarQube server is provisioned for this take-home submission by default.

To actually run it, you need one of:
  1. The sonar-scanner CLI, installed locally:
     https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/scanners/sonarscanner/
  2. The sonar-scanner-cli Docker image, e.g.:
     docker run --rm \
       -e SONAR_HOST_URL="$SONAR_HOST_URL" \
       -e SONAR_TOKEN="$SONAR_TOKEN" \
       -v "$(pwd):/usr/src" \
       sonarsource/sonar-scanner-cli

...plus a running SonarQube server (self-hosted or SonarCloud) and the
following environment variables:
  SONAR_HOST_URL  - e.g. https://sonarcloud.io or your self-hosted URL
  SONAR_TOKEN     - a project or user analysis token

Exiting without error: this is an optional step, not a required gate.
EOF
    exit 0
fi

if [ -z "${SONAR_TOKEN:-}" ] || [ -z "${SONAR_HOST_URL:-}" ]; then
    cat >&2 <<'EOF'
SonarQube analysis was skipped: SONAR_TOKEN and/or SONAR_HOST_URL are not set.

sonar-scanner was found on PATH, but a scan cannot authenticate against a
SonarQube/SonarCloud server without both of:
  SONAR_HOST_URL  - e.g. https://sonarcloud.io or your self-hosted URL
  SONAR_TOKEN     - a project or user analysis token

Set both environment variables and re-run this script. This is an
optional step (CODE_QUALITY.md section 4.3), not a required gate.

Exiting without error: this is an optional step, not a required gate.
EOF
    exit 0
fi

echo "Running sonar-scanner against ${SONAR_HOST_URL} ..."
(cd "${REPO_ROOT}" && sonar-scanner \
    "-Dsonar.host.url=${SONAR_HOST_URL}" \
    "-Dsonar.token=${SONAR_TOKEN}")
