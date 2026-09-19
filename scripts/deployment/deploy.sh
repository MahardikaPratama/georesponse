#!/usr/bin/env bash
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-20
# Description  : Deploys (or redeploys) the georesponse-be and georesponse-fe
#                containers on the current Docker host using the compose
#                topology in docker-compose.yml. By default it builds the
#                images for the current commit (scripts/docker/build.sh),
#                then (re)starts only the two application services with
#                that tag, leaving georesponse-db running. Pass
#                --tag <tag> to deploy an already-built image tag instead
#                (the rollback path: point at the previous known-good tag),
#                and --no-build to skip building entirely. Afterwards run
#                scripts/deployment/health-check.sh to verify.
#
#                Migrations: the backend applies pending migrations itself
#                at start-up when APP_ENV=development. For any other
#                APP_ENV run scripts/database/migrate.sh before this script.
#
# Usage:
#   scripts/deployment/deploy.sh [--tag <tag>] [--no-build]
#
# Changelog:
# - 1.0.0 (2026-09-20): Initial creation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

TAG="${IMAGE_TAG:-}"
BUILD=1

while [ $# -gt 0 ]; do
    case "$1" in
        --tag)
            [ $# -ge 2 ] || { echo "ERROR: --tag requires a value." >&2; exit 2; }
            TAG="$2"
            BUILD=0
            shift 2
            ;;
        --no-build) BUILD=0; shift ;;
        --build) BUILD=1; shift ;;
        -h|--help)
            sed -n '/^# Usage:/,/^#$/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *) echo "ERROR: unknown argument '$1'." >&2; exit 2 ;;
    esac
done

if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: 'docker' is not on PATH." >&2
    exit 1
fi
if ! docker info >/dev/null 2>&1; then
    echo "ERROR: the Docker daemon is not running or not reachable." >&2
    exit 1
fi

if [ -z "${TAG}" ]; then
    TAG="$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || echo latest)"
fi

if [ ! -f "${REPO_ROOT}/.env" ]; then
    echo "WARN: ${REPO_ROOT}/.env not found; docker compose will fall back to the placeholder defaults in docker-compose.yml." >&2
    echo "      Copy .env.example to .env and set real values before deploying anywhere but a local machine." >&2
fi

echo "=== GeoResponse deploy (tag: ${TAG}) ==="

if [ "${BUILD}" -eq 1 ]; then
    "${SCRIPT_DIR}/../docker/build.sh" --tag "${TAG}"
else
    for image in georesponse-be georesponse-fe; do
        if ! docker image inspect "${image}:${TAG}" >/dev/null 2>&1; then
            echo "ERROR: image ${image}:${TAG} does not exist locally. Build it first (scripts/docker/build.sh --tag ${TAG}) or choose an existing tag." >&2
            exit 1
        fi
    done
fi

echo "--- Ensuring georesponse-db is up ---"
(cd "${REPO_ROOT}" && docker compose up -d georesponse-db)

echo "--- (Re)starting georesponse-be and georesponse-fe with tag ${TAG} ---"
(cd "${REPO_ROOT}" && IMAGE_TAG="${TAG}" docker compose up -d --no-build --force-recreate georesponse-be georesponse-fe)

echo "=== Deploy issued. Verify with: scripts/deployment/health-check.sh ==="
