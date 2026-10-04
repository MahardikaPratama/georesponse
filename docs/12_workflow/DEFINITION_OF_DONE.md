# Definition of Done

## 1. Purpose

This document defines when a unit of work (a feature, bug fix, refactor, or
documentation change) is **done**: correct, tested, consistent with the
documented contracts, and trustworthy to another developer without
re-verifying it from scratch. It is the single final checklist for every
pull request, and it owns the rule that documentation is updated in the
same change.

It references, rather than restates, the line-level rules in
`CODING_STANDARDS.md`, the gate commands in `QUALITY_GATES.md`, and the
branch and commit conventions in `GIT_MANAGEMENT.md`. Skipping an item must
be a stated exception, never an oversight.

---

## 2. Scope of a Unit of Work

A unit of work is the smallest coherent change that can be reviewed on its
own: one feature slice, one bug fix, one refactor, or one focused
documentation update. Bundling unrelated changes makes this checklist hard
to apply honestly (see `GIT_MANAGEMENT.md` section 6).

---

## 3. Code Complete

- [ ] The implementation satisfies the acceptance criteria of the relevant
      use case or functional requirement
      (`docs/01_product/USE_CASES.md`,
      `docs/02_requirements/FUNCTIONAL_REQUIREMENTS.md`).
- [ ] The change follows `CODING_STANDARDS.md` (its section 17 is the
      code-level review checklist).
- [ ] The change respects the layer and dependency boundaries in
      `SYSTEM_ARCHITECTURE.md` and `DEPENDENCY_RULES.md`: no business
      logic in handlers or presentational components, no MapLibre usage
      outside the map adapter, no direct database access from handlers.
- [ ] No dead code, commented-out code, unexplained magic values, or
      `TODO` without context is left behind.
- [ ] No dependency, abstraction, or pattern was added beyond what the
      change requires.

---

## 4. Tests

- [ ] New or changed backend behavior is covered by Go `testing` tests
      (unit level for domain and use-case logic, repository or integration
      level where persistence matters), per `BACKEND_TESTING.md`.
- [ ] New or changed frontend behavior is covered by colocated Vitest +
      React Testing Library tests, per `FRONTEND_TESTING.md`.
- [ ] Success paths and the relevant failure paths are tested (validation
      failure, not found, unauthorized, conflict, as applicable).
- [ ] Tests are deterministic: no arbitrary sleeps, and no reliance on
      external services unless the test targets an integration boundary.
- [ ] All frontend and backend tests pass locally together with the
      existing suite, not only in isolation.

---

## 5. Quality Gates

- [ ] Every gate in `QUALITY_GATES.md` section 3 passes locally for the
      affected application(s) before the pull request is opened.

---

## 6. Contracts and Documentation

If the change alters observable behavior or a documented contract, the
matching document is updated **in the same change**, not as a follow-up:

- [ ] `API_CONTRACT.md`: an endpoint, request or response shape, status
      code, or error code changed.
- [ ] `DATA_CONTRACT.md`: the shape or meaning of an exchanged data object
      changed.
- [ ] `DOMAIN_MODEL.md` / `BUSINESS_RULES.md`: a domain concept, resource
      type, status, or business rule changed.
- [ ] `ARCHITECTURE_DECISION_RECORDS.md`: the change is a meaningful
      architectural decision or deviation, so a new record is added.
- [ ] Any other document under `docs/` that no longer matches the system's
      behavior is updated.

A behavior change that ships without its documentation update is not done:
it has introduced drift between the docs and the system.

---

## 7. Manual Verification

- [ ] The change has been exercised manually against the acceptance
      criteria of the relevant use case or functional requirement, not only
      through automated tests.
- [ ] For a map change, the resource is visually confirmed to render, move,
      or update correctly on the map.
- [ ] For an API contract change, at least one manual or scripted request
      against the running backend confirms the documented request and
      response shape.

---

## 8. Pull Request

- [ ] The branch name follows `GIT_MANAGEMENT.md` section 4.
- [ ] Commits follow the Conventional Commits format in
      `GIT_MANAGEMENT.md` section 5.
- [ ] The pull request follows `PULL_REQUEST_GUIDELINES.md`: the
      description template is filled in, the requirement or use case is
      linked where applicable, and what was verified is stated.
- [ ] The diff contains only the intended unit of work, with no unrelated
      refactors or formatting sweeps.
- [ ] No excluded files (`node_modules`, build artifacts, `.env`, secrets)
      are in the diff (see `GIT_MANAGEMENT.md` section 7).
