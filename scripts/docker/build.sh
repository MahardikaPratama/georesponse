#!/usr/bin/env bash
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-20
# Description  : Builds the georesponse-fe and georesponse-be images from
#                their Dockerfiles with the project's naming convention:
#                <name>:<tag> plus <name>:latest, where <tag> defaults to
#                the current git short SHA (immutable per build) and can be
#                overridden with --tag <tag> or IMAGE_TAG. Frontend build
#                arguments (API_BASE_URL, MAP_TILE_URL, LOG_LEVEL) are read
#                from the environment, or from the root .env if present.
#
# Usage:
#   scripts/docker/build.sh [--tag <tag>] [--fe-only|--be-only]
#
# Changelog:
# - 1.0.0 (2026-09-20): Initial creation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

BUILD_FE=1
BUILD_BE=1
TAG="${IMAGE_TAG:-}"

while [ $# -gt 0 ]; do
    case "$1" in
        --tag)
            [ $# -ge 2 ] || { echo "ERROR: --tag requires a value." >&2; exit 2; }
            TAG="$2"
            shift 2
            ;;
        --fe-only) BUILD_BE=0; shift ;;
        --be-only) BUILD_FE=0; shift ;;
        -h|--help)
            sed -n '/^# Usage:/,/^#$/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *) echo "ERROR: unknown argument '$1'." >&2; exit 2 ;;
    esac
done

if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: 'docker' is not on PATH. Install Docker Desktop / Docker Engine first." >&2
    exit 1
fi

if [ -z "${TAG}" ]; then
    TAG="$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || echo dev)"
fi

# Frontend build arguments: environment wins, then the root .env, then the
# same defaults docker-compose.yml uses.
if [ -f "${REPO_ROOT}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "${REPO_ROOT}/.env"
    set +a
fi
API_BASE_URL="${API_BASE_URL:-http://localhost:8080/api/v1}"
MAP_TILE_URL="${MAP_TILE_URL:-}"
LOG_LEVEL="${LOG_LEVEL:-debug}"

echo "=== GeoResponse image build (tag: ${TAG}) ==="

if [ "${BUILD_BE}" -eq 1 ]; then
    echo "--- Building georesponse-be:${TAG} ---"
    docker build \
        -t "georesponse-be:${TAG}" \
        -t "georesponse-be:latest" \
        "${REPO_ROOT}/georesponse-be"
fi

if [ "${BUILD_FE}" -eq 1 ]; then
    echo "--- Building georesponse-fe:${TAG} ---"
    docker build \
        --build-arg "API_BASE_URL=${API_BASE_URL}" \
        --build-arg "MAP_TILE_URL=${MAP_TILE_URL}" \
        --build-arg "LOG_LEVEL=${LOG_LEVEL}" \
        -t "georesponse-fe:${TAG}" \
        -t "georesponse-fe:latest" \
        "${REPO_ROOT}/georesponse-fe"
fi

echo "=== Build complete ==="
docker image ls --filter "reference=georesponse-*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"
