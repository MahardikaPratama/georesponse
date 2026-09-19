#!/usr/bin/env bash
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-19
# Description  : Runs frontend tests (npm test), backend tests
#                (go test ./...), and — when GEORESPONSE_API_URL points at
#                a running stack — the API integration tests under
#                tests/integration/. Frontend tests are skipped with a
#                clear message when npm is unavailable, rather than
#                failing the whole script.
#
# Changelog:
# - 1.0.0 (2026-09-19): Initial creation.
# - 1.1.0 (2026-09-20): Added the tests/integration/ suite, run only when
#                        GEORESPONSE_API_URL is set (it needs a live
#                        backend + database).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/../.."
FE_DIR="${REPO_ROOT}/georesponse-fe"
BE_DIR="${REPO_ROOT}/georesponse-be"

FAILED=0

echo "=== GeoResponse test run ==="

# --- Frontend tests ----------------------------------------------------------
if command -v npm >/dev/null 2>&1; then
    if [ -f "${FE_DIR}/package.json" ]; then
        echo "--- Frontend tests (npm test in georesponse-fe/) ---"
        if ! (cd "${FE_DIR}" && npm test); then
            echo "FAILED: frontend tests"
            FAILED=1
        fi
    else
        echo "SKIP: ${FE_DIR}/package.json not found; skipping frontend tests."
    fi
else
    echo "SKIP: 'npm' is not on PATH; skipping frontend tests."
fi

# --- Backend tests -------------------------------------------------------------
if command -v go >/dev/null 2>&1; then
    if [ -f "${BE_DIR}/go.mod" ]; then
        echo "--- Backend tests (go test ./... in georesponse-be/) ---"
        if ! (cd "${BE_DIR}" && go test ./...); then
            echo "FAILED: backend tests"
            FAILED=1
        fi
    else
        echo "SKIP: ${BE_DIR}/go.mod not found; skipping backend tests."
    fi
else
    echo "SKIP: 'go' is not on PATH; skipping backend tests."
fi

# --- Integration tests (need a running stack) --------------------------------
if [ -z "${GEORESPONSE_API_URL:-}" ]; then
    echo "SKIP: GEORESPONSE_API_URL is not set; skipping tests/integration/ (start the stack with ./run.sh and set GEORESPONSE_API_URL=http://localhost:8080 to run them)."
elif command -v go >/dev/null 2>&1 && [ -f "${REPO_ROOT}/tests/integration/go.mod" ]; then
    echo "--- Integration tests (go test ./... in tests/integration/ against ${GEORESPONSE_API_URL}) ---"
    if ! (cd "${REPO_ROOT}/tests/integration" && go test ./... -count=1); then
        echo "FAILED: integration tests"
        FAILED=1
    fi
fi

if [ "${FAILED}" -ne 0 ]; then
    echo "=== Test run FAILED ==="
    exit 1
fi

echo "=== Test run passed ==="
