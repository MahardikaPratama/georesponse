#!/usr/bin/env bash
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-19
# Description  : Loads seed data from database/seeds/ into the database
#                identified by DATABASE_URL, after migrations have been
#                applied, per DATABASE_MIGRATIONS.md section 7. Seed files
#                are applied via `psql`, since it is the standard
#                PostgreSQL client for running plain SQL files and needs
#                no additional dependency beyond a PostgreSQL client
#                install (already assumed for local Postgres/PostGIS
#                development, per DATABASE_OPERATIONS.md section 3).
#
# Changelog:
# - 1.0.0 (2026-09-19): Initial creation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEEDS_DIR="${SCRIPT_DIR}/../../database/seeds"

if ! command -v psql >/dev/null 2>&1; then
    echo "ERROR: 'psql' is not on PATH." >&2
    echo "Install the PostgreSQL client tools, e.g.:" >&2
    echo "  - Debian/Ubuntu: sudo apt-get install postgresql-client" >&2
    echo "  - macOS (Homebrew): brew install libpq && brew link --force libpq" >&2
    echo "  - Windows: use scripts/database/seed.ps1, or install the PostgreSQL client from postgresql.org" >&2
    exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL is not set." >&2
    echo "Set it to a PostgreSQL connection string, e.g.:" >&2
    echo '  export DATABASE_URL="postgres://georesponse:georesponse_dev_password@localhost:5432/georesponse?sslmode=disable"' >&2
    exit 1
fi

shopt -s nullglob
seed_files=("${SEEDS_DIR}"/*.sql)
shopt -u nullglob

if [ "${#seed_files[@]}" -eq 0 ]; then
    echo "No seed files found in ${SEEDS_DIR}; nothing to do."
    exit 0
fi

# Sort so files apply in NNNN-prefixed order regardless of glob/filesystem order.
IFS=$'\n' seed_files=($(sort <<<"${seed_files[*]}"))
unset IFS

for seed_file in "${seed_files[@]}"; do
    echo "Applying seed file: ${seed_file}"
    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${seed_file}"
done

echo "Seed data applied successfully."
