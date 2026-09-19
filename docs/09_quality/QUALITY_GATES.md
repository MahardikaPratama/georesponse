# Quality Gates

## 1. Purpose

This document defines the concrete, enforced pass/fail criteria a change must satisfy before it is merged into `main` or included in the final submission.

Where `CODE_QUALITY.md` explains the quality philosophy and `CODING_STANDARDS.md` defines line-level rules, this document is the checklist: binary, mechanical, and intended to be runnable locally before every commit that matters and before final submission.

---

## 2. How to Run the Gates

The gates in this document are intended to be run through the project's quality scripts rather than checked manually one by one:

| Script | Platform | Purpose |
|---|---|---|
| `scripts/quality/check.sh` | Linux/macOS/Git Bash | Runs the full local quality gate: build, lint, type-check, tests, formatting check. |
| `scripts/quality/check.ps1` | Windows PowerShell | Windows-native equivalent of `check.sh`. |
| `scripts/quality/sonar.sh` / `sonar.ps1` | Both | Optional aggregate static-analysis pass (see `CODE_QUALITY.md` §4.3). Not required to pass the gate; useful as an extra signal when time allows. |

Run the relevant `check.*` script before opening a pull request and again before final submission. A change that has not been run through the check script should not be considered ready for review.

---

## 3. Merge Gate — Pass/Fail Criteria

All of the following MUST pass before a change is merged to `main`.

| # | Gate | Criterion | Scope |
|---|---|---|---|
| G1 | Frontend build | `npm run build` (or equivalent Rspack build) completes without errors. | Frontend |
| G2 | Backend build | `go build ./...` completes without errors. | Backend |
| G3 | Frontend lint | ESLint reports 0 errors. Warnings should be resolved when practical but do not block by themselves unless they indicate a real bug. | Frontend |
| G4 | Frontend type-check | `tsc --noEmit` passes with 0 errors. | Frontend |
| G5 | Backend static checks | `gofmt -l .` reports no unformatted files; `go vet ./...` reports no issues. `golangci-lint run` (configured in `georesponse-be/.golangci.yml`) passes when the tool is installed — `check.sh`/`check.ps1` skip it otherwise, and CI does not run it. | Backend |
| G6 | Frontend tests | `vitest run` passes with 0 failing tests. | Frontend |
| G7 | Backend tests | `go test ./...` passes with 0 failing tests. | Backend |
| G8 | Business-rule coverage | Validation, domain/service logic, and status-change/relocation flows have direct test coverage (see §4). | Both |
| G9 | No merge artifacts | No unresolved merge-conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) anywhere in the diff. | Both |
| G10 | No secrets committed | No credentials, API keys, connection strings, or `.env` files with real values are present in the diff. | Both |
| G11 | Formatting applied | `gofmt` has been applied to all changed Go files; Prettier (`npm run format`, config in `georesponse-fe/.prettierrc.json`) and/or `npm run lint:fix` has been applied to all changed frontend files. | Both |

If a gate cannot be satisfied for a documented, time-boxed reason, the limitation must be recorded (e.g. in `LIMITATIONS.md` or an equivalent known-issues note) rather than silently skipped.

---

## 4. Coverage Expectation

GeoResponse does not mandate a single blanket coverage percentage — a fixed number (e.g. "80% everywhere") is not realistic across a small, time-boxed project and tends to produce padding rather than useful tests.

Instead, coverage is expected to be **risk-proportionate**:

- **Must be covered by tests:** input validation (coordinates, required fields, status values), resource creation/update/deletion business rules, status-change logic, relocation logic, and error-path handling for these flows (per `NON_FUNCTIONAL_REQUIREMENTS.md` NFR-REL-001–004, NFR-GEO-004).
- **Should be covered where practical:** API handlers for their success and primary failure paths, repository behavior where persistence logic is non-trivial.
- **Not required to be exhaustively covered:** purely presentational components with no branching logic, trivial getters/setters, generated or vendor code.

`go test ./... -cover` (CI runs it this way) and `vitest run --coverage` (needs the `@vitest/coverage-v8` provider, which is not installed by default — add it as a dev dependency when you want the report) are used to *observe* coverage and spot obviously untested business logic — not to chase a numeric target for its own sake.

---

## 5. Pre-Merge Checklist

Before merging or requesting review, confirm:

- [ ] `scripts/quality/check.sh` (or `check.ps1` on Windows) passes with no failures.
- [ ] Frontend build succeeds (`npm run build`).
- [ ] Backend build succeeds (`go build ./...`).
- [ ] ESLint reports 0 errors.
- [ ] `tsc --noEmit` reports 0 errors.
- [ ] `gofmt -l .` reports no files.
- [ ] `go vet ./...` reports no issues.
- [ ] `vitest run` passes.
- [ ] `go test ./...` passes.
- [ ] New/changed validation, domain logic, and relocation/status-change behavior has tests.
- [ ] No commented-out code or stray debug output remains.
- [ ] No unresolved `TODO` without context.
- [ ] No `.env`, credentials, or generated artifacts staged for commit (see `GIT_MANAGEMENT.md` §6).
- [ ] No merge-conflict markers remain in any file.

---

## 6. Submission Gate

In addition to the merge gate, the following apply once before the final take-home submission:

- [ ] All gates in §3 pass on the final state of `main`.
- [ ] The application builds and runs from a clean checkout following the documented setup steps.
- [ ] Documentation (`docs/`) reflects the actual implemented behavior, not an earlier plan.
- [ ] No debug-only code paths, seed-only test credentials in non-obvious places, or leftover scaffolding remain enabled by default.

---

## 7. Relationship to Other Documents

- `CODE_QUALITY.md` — the philosophy and tooling behind these gates.
- `CODING_STANDARDS.md` — the line-level rules that formatting/linting enforce.
- `QUALITY_GATES.md` (this document) — what must be true, mechanically, before merge.
- `PULL_REQUEST_GUIDELINES.md` — how the pre-merge checklist maps onto the PR review process.
- `NON_FUNCTIONAL_REQUIREMENTS.md` §15 (NFR-QUAL-001–005) — the requirements these gates satisfy.

---

A change that does not pass these gates is not ready to merge, regardless of how complete the underlying feature is.
