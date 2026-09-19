#!/usr/bin/env bash
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-20
# Description  : Removes locally built GeoResponse images (every
#                georesponse-fe:* and georesponse-be:* tag) and the dangling
#                build layers they left behind, without touching unrelated
#                images, containers, or volumes on the machine. Stops the
#                compose stack's containers first so the images are not in
#                use. The database volume is kept unless --volumes is given.
#
# Usage:
#   scripts/docker/clean.sh [--volumes]
#
# Changelog:
# - 1.0.0 (2026-09-20): Initial creation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

REMOVE_VOLUMES=0
while [ $# -gt 0 ]; do
    case "$1" in
        --volumes) REMOVE_VOLUMES=1; shift ;;
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

echo "=== GeoResponse Docker clean-up ==="

echo "--- Stopping the compose stack (containers only) ---"
if [ "${REMOVE_VOLUMES}" -eq 1 ]; then
    (cd "${REPO_ROOT}" && docker compose down --remove-orphans --volumes) || true
else
    (cd "${REPO_ROOT}" && docker compose down --remove-orphans) || true
fi

echo "--- Removing georesponse-fe / georesponse-be images ---"
IMAGES="$(docker image ls --filter "reference=georesponse-fe" --filter "reference=georesponse-be" -q | sort -u)"
if [ -n "${IMAGES}" ]; then
    # shellcheck disable=SC2086
    docker image rm -f ${IMAGES}
else
    echo "No georesponse-fe / georesponse-be images found."
fi

echo "--- Pruning dangling build layers ---"
docker image prune -f --filter "dangling=true" >/dev/null
docker builder prune -f >/dev/null 2>&1 || true

echo "=== Clean-up complete ==="
