#!/usr/bin/env bash
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-20
# Description  : First-initialization hook for the georesponse-db container.
#                The official postgres/postgis image runs every file in
#                /docker-entrypoint-initdb.d exactly once, when the data
#                volume is brand new. This script applies every
#                database/migrations/*.up.sql in ascending order, records
#                the resulting version in the same schema_migrations table
#                the golang-migrate CLI and the backend's start-up migrator
#                use, then loads database/seeds/*.sql so a fresh stack has
#                demo resources and login accounts. On later starts (an
#                existing volume) this does not run; the backend applies
#                any newer migrations itself at start-up.
#
# Changelog:
# - 1.0.0 (2026-09-20): Initial creation.

set -euo pipefail

MIGRATIONS_DIR="${GEORESPONSE_MIGRATIONS_DIR:-/georesponse/migrations}"
SEEDS_DIR="${GEORESPONSE_SEEDS_DIR:-/georesponse/seeds}"

run_sql_file() {
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -q -f "$1"
}

run_sql() {
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -q -c "$1"
}

echo "georesponse-init: applying migrations from ${MIGRATIONS_DIR}"

latest_version=0
while IFS= read -r file; do
    [ -n "$file" ] || continue
    base="$(basename "$file")"
    version="$((10#${base%%_*}))"
    echo "georesponse-init: applying ${base}"
    run_sql_file "$file"
    latest_version="$version"
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.up.sql' | sort)

run_sql "CREATE TABLE IF NOT EXISTS schema_migrations (version bigint NOT NULL PRIMARY KEY, dirty boolean NOT NULL);"
if [ "$latest_version" -gt 0 ]; then
    run_sql "DELETE FROM schema_migrations; INSERT INTO schema_migrations (version, dirty) VALUES (${latest_version}, false);"
    echo "georesponse-init: schema at version ${latest_version}"
fi

if [ -d "$SEEDS_DIR" ]; then
    echo "georesponse-init: loading seed data from ${SEEDS_DIR}"
    while IFS= read -r file; do
        [ -n "$file" ] || continue
        echo "georesponse-init: seeding $(basename "$file")"
        run_sql_file "$file"
    done < <(find "$SEEDS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)
fi

echo "georesponse-init: done"
