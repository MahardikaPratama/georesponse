# Code Quality

## 1. Purpose

This document defines the code quality philosophy for GeoResponse: what "good quality" means for this project, how quality is reviewed, and which tooling enforces it.

Line-level rules (naming, file headers, error handling, formatting conventions) are defined in `CODING_STANDARDS.md` and are not repeated here. This document sits one level above: it explains *why* those rules exist, what a reviewer looks for beyond them, and how quality is verified before a change is considered done.

The concrete pass/fail criteria enforced before merge or submission are defined separately in `QUALITY_GATES.md`.

---

## 2. Quality Philosophy

GeoResponse is a short-timeline, effectively solo take-home project evaluated by a reviewer who will read the source code directly. Quality practices are therefore chosen to be **proportionate**: rigorous enough to produce a clean, defensible codebase, without introducing process overhead (multi-stage approval pipelines, mandatory second reviewers, enterprise-scale static-analysis suites) that would not fit the scope or timeline.

Three things matter more than anything else in this context:

1. **Readability** — a reviewer unfamiliar with the code should be able to follow a feature end-to-end (handler → service → repository, or component → hook → API call) without needing external explanation.
2. **Correctness of business rules** — geospatial validation, resource status transitions, and relocation logic are the parts of the system most likely to hide bugs, and are weighted accordingly in both review and testing effort.
3. **A clean, finished state at submission time** — no dead code, no unresolved TODOs, no leftover debug statements, no failing checks.

Quality is not measured by volume of tests, lines of documentation, or tool output alone. It is measured by whether the code does what it claims, is easy to verify, and does not surprise the reader.

---

## 3. What "Good Quality" Means Here

| Dimension | Expectation |
|---|---|
| Readability | Code reads top-to-bottom without unexplained jumps; names and structure carry intent (see `CODING_STANDARDS.md` §2, §4). |
| Business-rule correctness | Validation, status transitions, and relocation logic are explicit, centralized, and covered by tests — not implicit in scattered conditionals. |
| Test coverage of business logic | Business-rule-bearing code (validation, domain services, relocation/status-change flows) has meaningful test coverage; incidental glue code does not need the same rigor. |
| No dead code | No commented-out code, unused exports, or unreachable branches left in the codebase. |
| No unresolved TODOs | `TODO`/`FIXME` markers are not left without context or are resolved before submission (per `CODING_STANDARDS.md` §2). |
| Consistency | The same problem is solved the same way across the codebase (e.g., all API errors follow one error-contract shape, all forms follow one validation pattern). |
| Proportionate abstraction | No abstraction exists "for the future" without a current, concrete need (per `TECHNOLOGY_SELECTION.md` §3.6 and §17). |

---

## 4. Static Analysis Tooling

Static analysis is used as an automated first pass so that human review time is spent on logic and design, not on catching formatting or type mistakes.

### 4.1 Frontend

| Tool | Purpose |
|---|---|
| ESLint (`npm run lint`, flat config in `georesponse-fe/eslint.config.js`: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`) | Catches unused variables/imports, React hook-rule violations, and stylistic inconsistencies. |
| Prettier (`npm run format` / `format:check`, `georesponse-fe/.prettierrc.json`) | Canonical TypeScript/TSX formatting. |
| TypeScript compiler (`npm run typecheck` = `tsc --noEmit`) | Enforces type-level correctness across the frontend without emitting build output; run as a dedicated check, not only implicitly via the bundler. |
| Vitest coverage (`vitest run --coverage`; needs the `@vitest/coverage-v8` provider, not installed by default) | Reports which frontend code paths (components, hooks, application logic) are exercised by tests. |

### 4.2 Backend

| Tool | Purpose |
|---|---|
| `gofmt` | Canonical Go formatting; no manual formatting debates. |
| `go vet` | Catches suspicious constructs (unreachable code, bad struct tags, incorrect `Printf`-style calls, etc.). |
| `golangci-lint` (optional to install; configured in `georesponse-be/.golangci.yml`) | Aggregates `govet`, `staticcheck`, `errcheck`, `unused`, `gosimple`, `ineffassign` beyond `go vet` for a stricter pass; `scripts/quality/check.sh` runs it when it is on `PATH`. |
| `go test -cover` | Reports test coverage for backend packages, in particular the domain/service layer. |

### 4.3 Aggregate / Optional

A SonarQube-style static analysis pass is available as an aspirational, opt-in step via `scripts/quality/sonar.sh` (POSIX) and `scripts/quality/sonar.ps1` (Windows). They run `sonar-scanner` against the root `sonar-project.properties` when the CLI is on `PATH` and both `SONAR_HOST_URL` and `SONAR_TOKEN` are set, and otherwise print an explanation and exit 0. No SonarQube server is provisioned as part of this take-home submission — this step is proportionate extra assurance, not a required gate. The required gates are defined in `QUALITY_GATES.md` and run via `scripts/quality/check.sh` / `check.ps1`.

---

## 5. Code Review Culture

Because this is a solo take-home project, "code review" takes the form of **self-review before every commit/PR**, applying the same standard an external reviewer would. The habits below substitute for a second-reviewer process:

- Re-read the diff before committing, not just the file as a whole — diffs surface accidental leftovers (debug logs, commented-out code, unrelated changes) that a full-file read can miss.
- Run the full local quality gate (`scripts/quality/check.sh` / `check.ps1`) before every commit that touches source code, not only before submission.
- Treat every `PUT`/`POST` handler and every status-changing or relocation code path as requiring an explicit test, since these are the flows the evaluation is most likely to probe.
- When a shortcut is taken due to time constraints, prefer an honest, documented `TODO` with clear scope over a silent gap — an unresolved TODO with context is more defensible in review than logic that quietly special-cases around a missing feature.
- Review changed files for adherence to `CODING_STANDARDS.md` §17 (Code Review Checklist) before marking work complete.

---

## 6. Quality in the Evaluation Context

This codebase is read, not just executed. A reviewer assessing a Software Developer take-home typically looks for:

- Whether the code communicates its intent without requiring a walkthrough.
- Whether the developer understood the difference between "working" and "correct" (e.g., validating coordinates, handling relocation consistency per `NON_FUNCTIONAL_REQUIREMENTS.md` NFR-GEO-004).
- Whether tests exist for the parts of the system that matter, not just trivial coverage padding.
- Whether the project is internally consistent (naming, structure, error handling) rather than assembled from inconsistent patterns.

Quality practices in this document and in `QUALITY_GATES.md` are calibrated to make those things visible and verifiable, rather than to simulate a large team's process.

---

## 7. Related Documents

- `CODING_STANDARDS.md` — line-level rules: naming, file headers, error handling, formatting, per-language conventions.
- `QUALITY_GATES.md` — concrete, enforced pass/fail criteria before merge or submission.
- `GIT_MANAGEMENT.md` / `PULL_REQUEST_GUIDELINES.md` — how changes are structured, committed, and reviewed in version control.
- `NON_FUNCTIONAL_REQUIREMENTS.md` §8–9, §15 — maintainability, testability, and code-quality NFRs that this document operationalizes.

---

Good quality, at this scope, means the code is easy to trust on first read — not that it passed the largest possible number of tools.
