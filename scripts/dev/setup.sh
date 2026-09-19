#!/usr/bin/env bash
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-19
# Description  : One-shot local dev environment bootstrap: installs
#                frontend and backend dependencies, then applies database
#                migrations and seed data if a database is configured, per
#                IMPLEMENTATION_CHECKLIST.md section 3.4. Degrades
#                gracefully (prints a clear skip message rather than
#                failing) when npm, Go modules, or DATABASE_URL/migrate
#                are not available.
#
# Changelog:
# - 1.0.0 (2026-09-19): Initial creation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/../.."
FE_DIR="${REPO_ROOT}/georesponse-fe"
BE_DIR="${REPO_ROOT}/georesponse-be"

echo "=== GeoResponse dev environment setup ==="

# --- Frontend dependencies -------------------------------------------------
if command -v npm >/dev/null 2>&1; then
    if [ -f "${FE_DIR}/package.json" ]; then
        echo "--- Installing frontend dependencies (npm install in georesponse-fe/) ---"
        (cd "${FE_DIR}" && npm install)
    else
        echo "SKIP: ${FE_DIR}/package.json not found; skipping frontend dependency install."
    fi
else
    echo "SKIP: 'npm' is not on PATH; skipping frontend dependency install."
    echo "      Install Node.js (https://nodejs.org/) to enable this step."
fi

# --- Backend dependencies ---------------------------------------------------
if command -v go >/dev/null 2>&1; then
    if [ -f "${BE_DIR}/go.mod" ]; then
        echo "--- Installing backend dependencies (go mod download in georesponse-be/) ---"
        (cd "${BE_DIR}" && go mod download)
    else
        echo "SKIP: ${BE_DIR}/go.mod not found; skipping backend dependency download."
    fi
else
    echo "SKIP: 'go' is not on PATH; skipping backend dependency download."
    echo "      Install Go (https://go.dev/dl/) to enable this step."
fi

# --- Database migrations + seed --------------------------------------------
if [ -z "${DATABASE_URL:-}" ]; then
    echo "SKIP: DATABASE_URL is not set; skipping migrations and seed data."
    echo "      Set DATABASE_URL and re-run this script (or run"
    echo "      scripts/database/migrate.sh and scripts/database/seed.sh directly)"
    echo "      once a database is available."
elif ! command -v migrate >/dev/null 2>&1; then
    echo "SKIP: the 'migrate' CLI is not on PATH; skipping migrations and seed data."
    echo "      Install it with: go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
else
    echo "--- Running database migrations ---"
    "${SCRIPT_DIR}/../database/migrate.sh"

    echo "--- Loading seed data ---"
    "${SCRIPT_DIR}/../database/seed.sh"
fi

echo "=== Setup complete ==="
