#!/usr/bin/env bash
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-19
# Description  : Rolls back the most recently applied migration(s) using
#                golang-migrate's "down" mechanics. Accepts an optional
#                numeric argument for the number of migrations to roll
#                back (default: 1).
#
# Changelog:
# - 1.0.0 (2026-09-19): Initial creation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/../../database/migrations"

STEPS="${1:-1}"

if ! [[ "${STEPS}" =~ ^[0-9]+$ ]] || [ "${STEPS}" -lt 1 ]; then
    echo "ERROR: rollback step count must be a positive integer, got '${STEPS}'." >&2
    exit 1
fi

if ! command -v migrate >/dev/null 2>&1; then
    echo "ERROR: the 'migrate' CLI (golang-migrate) is not on PATH." >&2
    echo "Install it with:" >&2
    echo "  go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest" >&2
    echo "and ensure \$(go env GOPATH)/bin is on your PATH." >&2
    exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL is not set." >&2
    echo "Set it to a PostgreSQL connection string, e.g.:" >&2
    echo '  export DATABASE_URL="postgres://georesponse:georesponse_dev_password@localhost:5432/georesponse?sslmode=disable"' >&2
    exit 1
fi

echo "Rolling back ${STEPS} migration(s) using ${MIGRATIONS_DIR} ..."
migrate -path "${MIGRATIONS_DIR}" -database "${DATABASE_URL}" down "${STEPS}"

echo "Rollback complete."
