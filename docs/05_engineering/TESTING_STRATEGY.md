# Testing Strategy

## 1. Purpose

This document defines how unit, integration, and end-to-end tests fit
together across GeoResponse, and what must always be tested. It addresses
the testability requirements in `NON_FUNCTIONAL_REQUIREMENTS.md` section 9.

Layer-specific tooling, mocking conventions, and file layout are in
`docs/06_frontend/FRONTEND_TESTING.md` and
`docs/07_backend/BACKEND_TESTING.md`. Run commands and variables for the
cross-application suites are in [`tests/README.md`](../../tests/README.md),
and CI wiring is in `docs/11_devops/CI_CD.md`.

---

## 2. Testing Pyramid

```text
                ▲
               / \
              / E2E \          tests/e2e/         a few, golden path only
             /-------\
            /         \
           /Integration\       tests/integration/ API + DB flows
          /-------------\
         /               \
        /   Unit Tests    \    colocated with source
       /-------------------\
```

Most coverage lives at the unit level (domain rules, business logic,
component behavior), where tests are fast and precise about what broke.
Integration tests confirm that the layers connect correctly against a real
database. A thin end-to-end layer confirms that the core user journey works
through the full stack.

---

## 3. Unit Tests

### 3.1 Backend

Backend unit tests use Go's standard `testing` package and target:

- domain rules independent of infrastructure, such as coordinate
  validation and status validation (any defined status is a valid target;
  there is no restricted transition graph, see
  `docs/07_backend/BACKEND_VALIDATION.md` section 5)
- application/use-case logic, with repository dependencies faked
- HTTP handler behavior (request parsing, status-code mapping) in
  isolation from the full stack where practical

### 3.2 Frontend

The frontend contributes component, hook, and API-client tests colocated
with their source. Tooling and the detailed list of what is and is not
tested are in `docs/06_frontend/FRONTEND_TESTING.md`.

---

## 4. Integration Tests

`tests/integration/` is its own Go module (`golden_path_test.go`). It sends
black-box HTTP requests to a running backend and database, so each request
passes through handler, application, repository, and PostgreSQL/PostGIS
with nothing mocked. It confirms that the layers are wired correctly and
that persisted state matches the API contract. How to run it, and how CI
runs it, are in `tests/README.md` and `docs/11_devops/CI_CD.md`
section 4.3.

Representative coverage:

- create, update, and delete a resource and confirm the persisted state
  matches the API response
- a status change persists the new status and writes status history
- a relocation persists the new location, writes location history, and
  does not alter status (`API_CONTRACT.md` section 8)
- authentication and authorization enforcement on protected endpoints
- error responses for invalid input match the error contract
  (`API_CONTRACT.md` section 13)

These tests address `NFR-REL-002` (Data Consistency) and `NFR-TEST-003`
(Integration Coverage).

---

## 5. End-to-End Tests

`tests/e2e/` holds one Playwright test (Chromium only,
`golden-path.spec.ts`) that drives the real UI of an already-running stack.
It runs locally, not in CI.

The e2e layer covers only the core golden path: log in, view resources on
the map and list, create a resource, update it, relocate it, and delete
it. This one flow confirms that the frontend, API, and database work
together for the primary use case. Add another e2e scenario only when a
specific golden-path variant is at real risk of regression; e2e tests do
not replace integration or unit coverage.

---

## 6. What Must Always Be Tested

Any change that touches the following needs corresponding tests:

- **Validation rules:** every validated field in `API_CONTRACT.md`
  section 12 has at least one test for a valid and an invalid case.
- **Status-change and relocation side effects:** test the full documented
  effect (persisted state, history written, audit recorded, and for
  relocation, status left unchanged, per `API_CONTRACT.md` section 8).
- **Error mapping:** each error code in `API_CONTRACT.md` section 13 has at
  least one test confirming the backend produces it under the matching
  condition.
- **Map adapter boundary:** frontend tests exercise the map adapter's
  public interface with MapLibre mocked, and do not reach into MapLibre
  internals (`docs/06_frontend/FRONTEND_TESTING.md` section 6).
- **Authorization enforcement:** at least one test per protected operation
  covers both the permitted and the denied path.

A change to any of the above without a matching test is not done, per
`docs/12_workflow/DEFINITION_OF_DONE.md` section 4.

---

## 7. What Is Out of Scope

The following are not part of the testing strategy at the project's
take-home scope, because each would add test infrastructure the timeline
does not support:

- cross-browser testing (development uses one modern evergreen browser)
- visual regression testing (pixel-diffing UI snapshots)
- load and performance testing; the NFR-PERF targets in
  `NON_FUNCTIONAL_REQUIREMENTS.md` section 3 were not measured (see
  `docs/01_product/SCOPE.md` section 11.3)
- mutation testing or formal fuzz testing
- accessibility audit tooling beyond what `FRONTEND_TESTING.md` covers

---

## 8. Test Data

- Unit and integration tests use deterministic, purpose-built fixtures,
  not production or scraped data.
- Integration and e2e tests run against a disposable database (the Docker
  Compose stack from `docs/11_devops/DOCKER_COMPOSE.md`, or CI's throwaway
  PostGIS service container) seeded from `database/seeds/`, never against a
  shared or persistent environment.
- Tests do not depend on external services unless the test targets that
  boundary (`NFR-TEST-002`).

---

## 9. Coverage and Gates

Tests run as part of the gates in `docs/09_quality/QUALITY_GATES.md`
section 3. Coverage is measured per `NFR-TEST-005`. The target is
meaningful coverage of the business rules and contracts in section 6, not
a numeric threshold.
