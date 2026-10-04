# Code Quality

## 1. Purpose

This document explains what code quality means for GeoResponse, which
static-analysis tools support it, and how changes are self-reviewed.
Line-level rules are in `docs/05_engineering/CODING_STANDARDS.md`, and the
commands a change must pass are in `QUALITY_GATES.md`.

---

## 2. Quality Philosophy

GeoResponse is a short-timeline, solo take-home project whose source code
is read directly by a reviewer. Quality practices are chosen to produce a
clean, verifiable codebase without process overhead (multi-stage approval
pipelines, mandatory second reviewers, enterprise static-analysis suites)
that does not fit the scope.

Three things matter most:

1. **Readability.** Someone new to the code can follow a feature end to
   end (handler → service → repository, or component → hook → API call)
   without a walkthrough.
2. **Correctness of business rules.** Geospatial validation, status
   changes, and relocation logic are where bugs are most likely to hide,
   so they get the most review and testing effort.
3. **A clean finished state.** No dead code, no unresolved TODOs, no
   leftover debug statements, no failing checks.

Quality is judged by whether the code does what it claims, is easy to
verify, and does not surprise the reader, not by the volume of tests,
documentation, or tool output.

---

## 3. What Good Quality Means Here

| Dimension | Expectation |
| --- | --- |
| Readability | Code reads top to bottom without unexplained jumps; names and structure carry intent (`CODING_STANDARDS.md` sections 2 and 4). |
| Business-rule correctness | Validation, status-change, and relocation logic is explicit, centralized, and tested, not spread across scattered conditionals. |
| Test coverage of business logic | Code that carries business rules has meaningful tests; incidental glue code needs less rigor (`TESTING_STRATEGY.md` section 6). |
| No dead code | No commented-out code, unused exports, or unreachable branches. |
| No unresolved TODOs | A `TODO`/`FIXME` has context or is resolved (`CODING_STANDARDS.md` section 2). |
| Consistency | The same problem is solved the same way everywhere (one error-contract shape, one form validation pattern). |
| Abstraction | No abstraction exists "for the future" without a current need (`TECHNOLOGY_SELECTION.md` sections 3.6 and 17). |

---

## 4. Static Analysis Tooling

Static analysis is the automated first pass, so human review time goes to
logic and design rather than formatting or type mistakes. The commands and
pass criteria are in `QUALITY_GATES.md` section 3.

### 4.1 Frontend

| Tool | Configuration | What it catches |
| --- | --- | --- |
| ESLint | `georesponse-fe/eslint.config.js` (flat config: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`) | Unused variables and imports, React hook-rule violations, stylistic inconsistencies |
| Prettier | `georesponse-fe/.prettierrc.json` | Canonical TypeScript/TSX formatting |
| TypeScript compiler | `georesponse-fe/tsconfig.json` | Type errors, checked as a dedicated step rather than only through the bundler |
| Vitest coverage | `@vitest/coverage-v8` provider (not installed by default) | Which components, hooks, and logic are exercised by tests |

### 4.2 Backend

| Tool | Configuration | What it catches |
| --- | --- | --- |
| `gofmt` | none | Canonical Go formatting |
| `go vet` | none | Suspicious constructs (unreachable code, bad struct tags, wrong `Printf`-style calls) |
| `golangci-lint` (optional install) | `georesponse-be/.golangci.yml` | `govet`, `staticcheck`, `errcheck`, `unused`, `gosimple`, `ineffassign` for a stricter pass |
| `go test -cover` | none | Test coverage per package, especially the domain/service layer |

### 4.3 Aggregate / Optional

`scripts/quality/sonar.sh` and `sonar.ps1` run `sonar-scanner` against the
root `sonar-project.properties` when the CLI is on `PATH` and both
`SONAR_HOST_URL` and `SONAR_TOKEN` are set; otherwise they print an
explanation and exit 0. No SonarQube server is provisioned, so this is an
opt-in extra signal, not a required gate.

---

## 5. Code Review Culture

On a solo project, code review means **self-review before every commit or
pull request**, held to the standard an external reviewer would apply:

- Re-read the diff, not just the whole file. Diffs surface leftovers
  (debug logs, commented-out code, unrelated changes) that a full-file read
  can miss.
- Run the local quality gate (`QUALITY_GATES.md` section 2) before every
  commit that touches source code, not only before submission.
- Treat every `POST`/`PUT` handler and every status-change or relocation
  path as needing an explicit test.
- When a shortcut is taken for time, leave a documented `TODO` with clear
  scope instead of a silent gap or logic that quietly works around a
  missing feature.
- Check changed files against the checklist in `CODING_STANDARDS.md`
  section 17.

---

## 6. Related Documents

- `docs/05_engineering/CODING_STANDARDS.md`: line-level rules.
- `QUALITY_GATES.md`: the pass/fail criteria before merge or submission.
- `docs/10_git/GIT_MANAGEMENT.md` and
  `docs/10_git/PULL_REQUEST_GUIDELINES.md`: how changes are committed and
  reviewed.
- `NON_FUNCTIONAL_REQUIREMENTS.md` sections 8, 9, and 15: the
  maintainability, testability, and code-quality requirements.
