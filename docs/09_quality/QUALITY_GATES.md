# Quality Gates

## 1. Purpose

This document defines the pass/fail checks a change must satisfy before it
is merged into `main` or included in the final submission, and the
commands that run them. The reasoning behind the tools is in
`CODE_QUALITY.md`; line-level rules are in
`docs/05_engineering/CODING_STANDARDS.md`.

---

## 2. How to Run the Gates

Run the gates through the quality scripts rather than one by one:

| Script | Platform | Purpose |
| --- | --- | --- |
| `scripts/quality/check.sh` | Linux/macOS/Git Bash | Runs G1 to G7: builds, ESLint, type-check, `gofmt` and `go vet` (plus `golangci-lint` when installed), and tests. Gates whose toolchain is missing are reported as SKIP. |
| `scripts/quality/check.ps1` | Windows PowerShell | Windows equivalent of `check.sh`. |
| `scripts/quality/sonar.sh` / `sonar.ps1` | Both | Optional aggregate static analysis (`CODE_QUALITY.md` section 4.3). Not part of the gate. |

Run the `check.*` script before opening a pull request and again before
final submission. G8 to G11 are not automated by the script and are checked
by reviewing the diff. CI runs the same commands as separate steps
(`docs/11_devops/CI_CD.md` section 4).

---

## 3. Merge Gate: Pass/Fail Criteria

All of the following must pass before a change is merged to `main`.

| # | Gate | Criterion | Scope |
| --- | --- | --- | --- |
| G1 | Frontend build | `npm run build` (Rspack) completes without errors. | Frontend |
| G2 | Backend build | `go build ./...` completes without errors. | Backend |
| G3 | Frontend lint | `npm run lint` (ESLint) reports 0 errors. Resolve warnings when practical; they block only if they indicate a real bug. | Frontend |
| G4 | Frontend type-check | `npm run typecheck` (`tsc --noEmit`) reports 0 errors. | Frontend |
| G5 | Backend static checks | `gofmt -l .` lists no files and `go vet ./...` reports no issues. `golangci-lint run` (configured in `georesponse-be/.golangci.yml`) must pass when installed; the check scripts skip it otherwise, and CI does not run it. | Backend |
| G6 | Frontend tests | `npm run test` (`vitest run`) passes with 0 failing tests. | Frontend |
| G7 | Backend tests | `go test ./...` passes with 0 failing tests. | Backend |
| G8 | Business-rule coverage | The behavior listed in `docs/05_engineering/TESTING_STRATEGY.md` section 6 has direct tests. | Both |
| G9 | No merge artifacts | No conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) in the diff. | Both |
| G10 | No secrets committed | No credentials, API keys, connection strings, or `.env` files with real values in the diff (`docs/10_git/GIT_MANAGEMENT.md` section 7). | Both |
| G11 | Formatting applied | `gofmt` applied to changed Go files; `npm run format` (Prettier) applied to changed frontend files, verifiable with `npm run format:check`. | Both |

If a gate cannot be satisfied for a documented, time-boxed reason, record
the gap in `docs/01_product/SCOPE.md` section 11 (Implementation Status at
Submission) instead of skipping it silently.

---

## 4. Coverage Expectation

There is no blanket coverage percentage. On a small, time-boxed project a
fixed number tends to produce padding rather than useful tests, so
coverage follows risk:

- **Must be covered:** the list in
  `docs/05_engineering/TESTING_STRATEGY.md` section 6.
- **Should be covered where practical:** API handlers for their success
  and primary failure paths, and repository behavior where persistence
  logic is non-trivial.
- **Not required:** purely presentational components with no branching,
  trivial getters and setters, generated or vendor code.

`go test ./... -cover` (CI runs it this way) and `vitest run --coverage`
are used to observe coverage and spot untested business logic, not to
chase a number. The frontend coverage report needs the
`@vitest/coverage-v8` provider, which is not installed by default; add it
as a dev dependency when you want the report.

---

## 5. Submission Gate

Before the final take-home submission, in addition to the merge gate:

- [ ] All gates in section 3 pass on the final state of `main`.
- [ ] The application builds and runs from a clean checkout using the
      setup steps in the root `README.md`.
- [ ] Documentation under `docs/` reflects the implemented behavior, not
      an earlier plan.
- [ ] No debug-only code paths, seed-only test credentials in non-obvious
      places, or leftover scaffolding remain enabled by default.

---

## 6. Related Documents

- `CODE_QUALITY.md`: the philosophy and tooling behind these gates.
- `docs/12_workflow/DEFINITION_OF_DONE.md`: the full checklist for a
  finished unit of work.
- `docs/10_git/PULL_REQUEST_GUIDELINES.md`: how the gates fit the pull
  request process.
- `NON_FUNCTIONAL_REQUIREMENTS.md` section 15 (NFR-QUAL-001 to
  NFR-QUAL-005): the requirements these gates address.
