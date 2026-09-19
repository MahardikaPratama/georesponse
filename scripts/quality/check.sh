#!/usr/bin/env bash
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-19
# Description  : Runs the full local quality gate mirroring the CI
#                pipeline's stages and merge-gate criteria (G1-G7):
#                frontend lint/type-check/build, backend
#                gofmt/vet/build/test. Frontend gates are skipped with a
#                clear message (not a hard failure) when npm is
#                unavailable. Prints a pass/fail summary per gate and
#                exits non-zero if any required gate fails.
#
# Changelog:
# - 1.0.0 (2026-09-19): Initial creation.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/../.."
FE_DIR="${REPO_ROOT}/georesponse-fe"
BE_DIR="${REPO_ROOT}/georesponse-be"

declare -A GATE_STATUS
GATE_STATUS=()

record() {
    local gate="$1"
    local status="$2"
    GATE_STATUS["${gate}"]="${status}"
}

run_gate() {
    local gate="$1"
    local label="$2"
    shift 2
    echo "--- ${gate}: ${label} ---"
    if "$@"; then
        record "${gate}" "PASS"
    else
        record "${gate}" "FAIL"
    fi
}

NPM_AVAILABLE=0
if command -v npm >/dev/null 2>&1 && [ -f "${FE_DIR}/package.json" ]; then
    NPM_AVAILABLE=1
fi

# --- G3 Frontend lint --------------------------------------------------------
if [ "${NPM_AVAILABLE}" -eq 1 ]; then
    run_gate "G3" "Frontend lint (npm run lint)" bash -c "cd '${FE_DIR}' && npm run lint"
else
    record "G3" "SKIP"
    echo "SKIP: G3 frontend lint (npm unavailable or georesponse-fe/package.json missing)"
fi

# --- G4 Frontend type-check --------------------------------------------------
if [ "${NPM_AVAILABLE}" -eq 1 ]; then
    run_gate "G4" "Frontend type-check (npm run typecheck)" bash -c "cd '${FE_DIR}' && npm run typecheck"
else
    record "G4" "SKIP"
    echo "SKIP: G4 frontend type-check (npm unavailable or georesponse-fe/package.json missing)"
fi

# --- G1 Frontend build --------------------------------------------------------
if [ "${NPM_AVAILABLE}" -eq 1 ]; then
    run_gate "G1" "Frontend build (npm run build)" bash -c "cd '${FE_DIR}' && npm run build"
else
    record "G1" "SKIP"
    echo "SKIP: G1 frontend build (npm unavailable or georesponse-fe/package.json missing)"
fi

GO_AVAILABLE=0
if command -v go >/dev/null 2>&1 && [ -f "${BE_DIR}/go.mod" ]; then
    GO_AVAILABLE=1
fi

# --- G5 Backend format check (gofmt -l) --------------------------------------
if [ "${GO_AVAILABLE}" -eq 1 ]; then
    echo "--- G5a: Backend format check (gofmt -l .) ---"
    UNFORMATTED="$(cd "${BE_DIR}" && gofmt -l .)"
    if [ -z "${UNFORMATTED}" ]; then
        record "G5a" "PASS"
    else
        echo "The following files are not gofmt-formatted:"
        echo "${UNFORMATTED}"
        record "G5a" "FAIL"
    fi

    # --- G5b Backend vet -----------------------------------------------------
    run_gate "G5b" "Backend vet (go vet ./...)" bash -c "cd '${BE_DIR}' && go vet ./..."

    # --- G5c Backend lint (golangci-lint, optional) --------------------------
    if command -v golangci-lint >/dev/null 2>&1; then
        run_gate "G5c" "Backend lint (golangci-lint run)" bash -c "cd '${BE_DIR}' && golangci-lint run"
    else
        record "G5c" "SKIP"
        echo "SKIP: G5c golangci-lint (not installed; this gate is optional)"
    fi
else
    record "G5a" "SKIP"
    record "G5b" "SKIP"
    record "G5c" "SKIP"
    echo "SKIP: G5 backend static checks (go unavailable or georesponse-be/go.mod missing)"
fi

# --- G2 Backend build ---------------------------------------------------------
if [ "${GO_AVAILABLE}" -eq 1 ]; then
    run_gate "G2" "Backend build (go build ./...)" bash -c "cd '${BE_DIR}' && go build ./..."
else
    record "G2" "SKIP"
    echo "SKIP: G2 backend build (go unavailable or georesponse-be/go.mod missing)"
fi

# --- G7 Backend test -----------------------------------------------------------
if [ "${GO_AVAILABLE}" -eq 1 ]; then
    run_gate "G7" "Backend test (go test ./...)" bash -c "cd '${BE_DIR}' && go test ./..."
else
    record "G7" "SKIP"
    echo "SKIP: G7 backend test (go unavailable or georesponse-be/go.mod missing)"
fi

# --- G6 Frontend test -----------------------------------------------------------
if [ "${NPM_AVAILABLE}" -eq 1 ]; then
    run_gate "G6" "Frontend test (npm run test)" bash -c "cd '${FE_DIR}' && npm run test"
else
    record "G6" "SKIP"
    echo "SKIP: G6 frontend test (npm unavailable or georesponse-fe/package.json missing)"
fi

echo ""
echo "=== Quality Gate Summary ==="
OVERALL_FAIL=0
for gate in G1 G2 G3 G4 G5a G5b G5c G6 G7; do
    status="${GATE_STATUS[${gate}]:-SKIP}"
    printf "%-4s %s\n" "${gate}" "${status}"
    if [ "${status}" = "FAIL" ]; then
        OVERALL_FAIL=1
    fi
done

if [ "${OVERALL_FAIL}" -ne 0 ]; then
    echo ""
    echo "RESULT: FAIL — one or more required gates failed."
    exit 1
fi

echo ""
echo "RESULT: PASS (gates marked SKIP were not run because their toolchain is unavailable in this environment)."
