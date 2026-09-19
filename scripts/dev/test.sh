#!/usr/bin/env bash
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-19
# Description  : Runs frontend tests (npm test) then backend tests
#                (go test ./...), per IMPLEMENTATION_CHECKLIST.md
#                section 3.4. Frontend tests are skipped with a clear
#                message when npm is unavailable, rather than failing the
#                whole script.
#
# Changelog:
# - 1.0.0 (2026-09-19): Initial creation.

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

if [ "${FAILED}" -ne 0 ]; then
    echo "=== Test run FAILED ==="
    exit 1
fi

echo "=== Test run passed ==="
