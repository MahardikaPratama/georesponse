# Definition of Done

## 1. Purpose

This document defines when a unit of work — a feature, a bug fix, a refactor, or a documentation change — is considered **done** in GeoResponse.

"Done" means more than "the code runs." It means the change is correct, tested, consistent with the project's documented contracts, and ready for another developer (or the reviewer of this take-home submission) to trust without re-verifying it from scratch.

This checklist applies to every pull request, regardless of size. Skipping an item must be a deliberate, stated exception, not an oversight.

---

## 2. Scope of a Unit of Work

A unit of work is the smallest coherent change that can be reviewed on its own: one feature slice, one bug fix, one refactor, or one focused documentation update.

Bundling unrelated changes into a single unit of work makes this checklist harder to apply honestly and is discouraged by `GIT_MANAGEMENT.md`.

---

## 3. Code Complete

- [ ] The implementation satisfies the acceptance criteria described in the relevant use case or functional requirement (`docs/01_product/USE_CASES.md`, `docs/02_requirements/FUNCTIONAL_REQUIREMENTS.md`).
- [ ] The change follows `CODING_STANDARDS.md` (naming, file headers, error handling, function responsibility, comments).
- [ ] The change respects the layer and dependency boundaries in `SYSTEM_ARCHITECTURE.md` and `DEPENDENCY_RULES.md` — no business logic in handlers or presentational components, no MapLibre usage outside the map adapter, no direct database access from handlers.
- [ ] No dead code, commented-out code, unexplained magic values, or unresolved `TODO` without context is left behind.
- [ ] No unnecessary dependency, abstraction, or pattern was introduced beyond what the change requires.

---

## 4. Tests

- [ ] New or changed backend behavior is covered by Go `testing` tests (unit-level for domain/use-case logic, and repository/integration-level where persistence behavior matters), per `BACKEND_TESTING.md`.
- [ ] New or changed frontend behavior is covered by colocated Vitest + React Testing Library tests, per `FRONTEND_TESTING.md`.
- [ ] Both success paths and the relevant failure/error paths are tested (validation failure, not-found, unauthorized, conflict, as applicable).
- [ ] Tests are deterministic — no arbitrary sleeps, no reliance on external services unless the test explicitly targets an integration boundary.
- [ ] All frontend and backend tests pass locally, not only in isolation but alongside the existing suite.

---

## 5. Quality Gates

- [ ] The frontend and backend formatters have been run (`gofmt` for Go, the project's configured formatter for TypeScript).
- [ ] The linter/static checks pass with no unresolved errors and no undocumented suppressions.
- [ ] The frontend build succeeds (`npm run build` or equivalent Rspack build).
- [ ] The backend builds successfully (`go build ./...`).
- [ ] All checks defined in `QUALITY_GATES.md` for the affected area pass locally before the pull request is opened.

---

## 6. Contracts and Documentation

If the change alters observable behavior or a documented contract, the corresponding document is updated **in the same change**, not as a follow-up:

- [ ] `API_CONTRACT.md` — updated if an endpoint, request/response shape, status code, or error code changed.
- [ ] `DATA_CONTRACT.md` — updated if the shape or meaning of an exchanged data object changed.
- [ ] `DOMAIN_MODEL.md` / `BUSINESS_RULES.md` — updated if a domain concept, resource type, status, or business rule changed.
- [ ] `ARCHITECTURE_DECISION_RECORDS.md` — a new record added if the change represents a meaningful architectural decision or deviation.
- [ ] Any other document under `docs/` whose description no longer matches the system's actual behavior after the change is updated.

A behavior change that ships without its matching documentation update is not done — it has introduced drift between the docs and the system.

---

## 7. Manual Verification

- [ ] The change has been manually exercised against the acceptance criteria in the relevant use case (`docs/01_product/USE_CASES.md`) or functional requirement (`docs/02_requirements/FUNCTIONAL_REQUIREMENTS.md`), not only validated through automated tests.
- [ ] For a change affecting the map, the resource is visually confirmed to render, move, or update correctly on the map.
- [ ] For a change affecting an API contract, at least one manual or scripted request against the running backend confirms the documented request/response shape.

---

## 8. Pull Request

- [ ] The branch follows the naming convention in `GIT_MANAGEMENT.md` (`feature/`, `fix/`, `chore/`, `docs/`, etc.).
- [ ] Commits follow the Conventional Commits format defined in `GIT_MANAGEMENT.md`.
- [ ] The pull request is opened following `PULL_REQUEST_GUIDELINES.md` — clear description, linked requirement/use case where applicable, and a summary of what was verified.
- [ ] The pull request diff contains only the intended unit of work — no unrelated refactors or formatting sweeps mixed in.

---

## 9. Non-Goals of This Checklist

This checklist does not replace or duplicate:

- the line-level rules in `CODING_STANDARDS.md`;
- the CI-enforced checks in `QUALITY_GATES.md`;
- the branch/commit conventions in `GIT_MANAGEMENT.md`.

It exists to give a single, final checklist to run through before calling a change complete, referencing those documents rather than restating them.

---

## 10. Definition of Done Principle

> A change is done when it is correct, tested, documented where it changes a contract, and verifiable by someone who was not the one who wrote it.

If any of those are missing, the change is still in progress — regardless of how much code has been written.
