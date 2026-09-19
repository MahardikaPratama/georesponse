#!/usr/bin/env bash
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-20
# Description  : One-command local run for GeoResponse. Verifies Docker is
#                installed and running; creates .env, georesponse-fe/.env
#                and georesponse-be/.env from their .env.example files
#                only when the .env does not already exist (never
#                overwrites a developer's local values); builds and starts
#                the full stack (frontend, backend, PostgreSQL + PostGIS)
#                with `docker compose up --build`, waits until every
#                service reports healthy — the database schema is migrated
#                and seeded automatically along the way — and prints the
#                access URLs.
#
# Usage:
#   ./run.sh              # build, start in the background, print URLs
#   ./run.sh --foreground # same, but stay attached to the compose logs
#   ./run.sh --down       # stop the stack (keeps the database volume)
#
# Changelog:
# - 1.0.0 (2026-09-20): Initial creation.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${REPO_ROOT}"

MODE="detached"
case "${1:-}" in
    "") ;;
    --foreground|-f) MODE="foreground" ;;
    --down|-d)       MODE="down" ;;
    -h|--help)
        sed -n '/^# Usage:/,/^#$/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
        exit 0
        ;;
    *) echo "ERROR: unknown argument '$1' (try --help)." >&2; exit 2 ;;
esac

# --- 1. Docker available and running ------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: 'docker' is not on PATH." >&2
    echo "       Install Docker Desktop (https://www.docker.com/products/docker-desktop/) or Docker Engine + Compose plugin, then re-run ./run.sh." >&2
    exit 1
fi
if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Docker is installed but the daemon is not running (or this user cannot reach it)." >&2
    echo "       Start Docker Desktop / the docker service, then re-run ./run.sh." >&2
    exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
    echo "ERROR: 'docker compose' (Compose v2 plugin) is not available." >&2
    exit 1
fi

if [ "${MODE}" = "down" ]; then
    echo "=== Stopping GeoResponse (database volume is kept; use 'docker compose down -v' to drop it) ==="
    docker compose down --remove-orphans
    exit 0
fi

# --- 2. Environment files (create only if missing) ----------------------------
ensure_env() {
    local example="$1" target="$2"
    if [ -f "${target}" ]; then
        echo "env: ${target} already exists — left untouched."
    elif [ -f "${example}" ]; then
        cp "${example}" "${target}"
        echo "env: created ${target} from ${example}."
    else
        echo "WARN: ${example} not found; skipping ${target}." >&2
    fi
}
echo "=== GeoResponse: preparing environment files ==="
ensure_env ".env.example"                ".env"
ensure_env "georesponse-fe/.env.example" "georesponse-fe/.env"
ensure_env "georesponse-be/.env.example" "georesponse-be/.env"

# --- 3. Build and start ---------------------------------------------------------
echo "=== GeoResponse: building images and starting the stack ==="
if [ "${MODE}" = "foreground" ]; then
    print_urls() {
        echo ""
        echo "Frontend  → http://localhost:5173"
        echo "Backend   → http://localhost:8080/api/v1"
        echo "Health    → http://localhost:8080/health"
        echo ""
    }
    print_urls
    exec docker compose up --build
fi

docker compose up --build --detach --wait --wait-timeout 300

# --- 4. Access URLs -------------------------------------------------------------
cat <<EOF

=== GeoResponse is up ===

  Frontend  → http://localhost:5173
  Backend   → http://localhost:8080/api/v1
  Health    → http://localhost:8080/health

Demo login (local development only, from database/seeds): identifier "user-001",
password "ChangeMe123!" (administrator). See AKUN.md for the read-only account.

  Follow logs   → docker compose logs -f
  Stop          → ./run.sh --down        (or: docker compose down)
  Reset the DB  → docker compose down -v (drops the database volume; the next
                  ./run.sh re-creates, migrates and seeds it)
EOF
