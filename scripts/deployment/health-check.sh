#!/usr/bin/env bash
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-20
# Description  : Verifies a deployed (or locally running) GeoResponse stack
#                is healthy: polls the backend's GET /health until it
#                returns 200 with "database":"ok", then polls the
#                frontend's root path until it returns 200. Exits non-zero
#                if either does not become healthy within the timeout, so
#                it can gate a deploy or a rollback decision.
#
# Usage:
#   scripts/deployment/health-check.sh [--backend-url <url>] [--frontend-url <url>] [--timeout <seconds>]
#
# Environment (used when the flags are absent):
#   BACKEND_URL   default http://localhost:8080
#   FRONTEND_URL  default http://localhost:5173
#   HEALTH_TIMEOUT default 90
#
# Changelog:
# - 1.0.0 (2026-09-20): Initial creation.

set -uo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
TIMEOUT="${HEALTH_TIMEOUT:-90}"

while [ $# -gt 0 ]; do
    case "$1" in
        --backend-url)  BACKEND_URL="$2"; shift 2 ;;
        --frontend-url) FRONTEND_URL="$2"; shift 2 ;;
        --timeout)      TIMEOUT="$2"; shift 2 ;;
        -h|--help)
            sed -n '/^# Usage:/,/^#$/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *) echo "ERROR: unknown argument '$1'." >&2; exit 2 ;;
    esac
done

if ! command -v curl >/dev/null 2>&1; then
    echo "ERROR: 'curl' is required but not on PATH." >&2
    exit 1
fi

# fetch <url> -> prints "<status>\n<body>"; never fails the script itself.
fetch() {
    curl -sS -m 5 -o /tmp/georesponse-health-body.$$ -w '%{http_code}' "$1" 2>/dev/null || echo "000"
}

wait_for() {
    local label="$1" url="$2" body_must_contain="${3:-}"
    local deadline=$(( $(date +%s) + TIMEOUT ))
    local status body
    echo "--- Waiting for ${label} at ${url} (timeout ${TIMEOUT}s) ---"
    while :; do
        status="$(fetch "${url}")"
        body="$(cat /tmp/georesponse-health-body.$$ 2>/dev/null || true)"
        if [ "${status}" = "200" ] && { [ -z "${body_must_contain}" ] || printf '%s' "${body}" | grep -q "${body_must_contain}"; }; then
            echo "OK: ${label} is healthy (HTTP ${status})${body:+: ${body}}"
            rm -f /tmp/georesponse-health-body.$$
            return 0
        fi
        if [ "$(date +%s)" -ge "${deadline}" ]; then
            echo "FAIL: ${label} did not become healthy within ${TIMEOUT}s (last HTTP ${status})${body:+: ${body}}" >&2
            rm -f /tmp/georesponse-health-body.$$
            return 1
        fi
        sleep 2
    done
}

echo "=== GeoResponse health check ==="
FAILED=0
wait_for "backend" "${BACKEND_URL%/}/health" '"database":"ok"' || FAILED=1
wait_for "frontend" "${FRONTEND_URL%/}/" || FAILED=1

if [ "${FAILED}" -ne 0 ]; then
    echo "=== Health check FAILED ===" >&2
    exit 1
fi
echo "=== Health check passed ==="
