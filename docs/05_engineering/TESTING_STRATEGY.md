# Testing Strategy

## 1. Purpose

This document defines the umbrella testing strategy for GeoResponse — how unit, integration, and end-to-end testing fit together across the frontend and backend, and what must always be tested versus what is intentionally out of scope.

It ties together `FRONTEND_TESTING.md` and `BACKEND_TESTING.md`, which define the layer-specific tooling and conventions in detail, and it satisfies the testability requirements in `NON_FUNCTIONAL_REQUIREMENTS.md` section 9.

---

## 2. Testing Pyramid

```text
                ▲
               / \
              / E2E \          tests/e2e/        — a few, golden-path only
             /-------\
            /         \
           /Integration\       tests/integration/ — API + DB flows
          /-------------\
         /               \
        /   Unit Tests    \    colocated with source
       /-------------------\
```

Most coverage lives at the unit level (domain rules, business logic, component behavior). Integration tests validate that the layers actually connect correctly against a real database. A thin end-to-end layer validates that the core user journey works through the full stack. This shape is deliberate: unit tests are fast and precise about what broke; integration and e2e tests are slower and catch what unit tests structurally cannot.

---

## 3. Unit Tests

### 3.1 Backend

Per `BACKEND_TESTING.md`, backend unit tests use Go's standard `testing` package and target:

- domain/business rules independent of infrastructure (e.g. valid status transitions, coordinate validation);
- application/use-case logic, with repository dependencies mocked or faked;
- HTTP handler behavior (request parsing, status code mapping) in isolation from the full stack where practical.

### 3.2 Frontend

At the unit level, the frontend contributes component, hook, and API-client tests colocated with their source, per `CODING_STANDARDS.md` section 15. Tooling, file placement, and the detailed list of what is and is not tested are defined in `FRONTEND_TESTING.md`.

---

## 4. Integration Tests

Located under `tests/integration/` (its own Go module, `golden_path_test.go`).

Integration tests exercise a real request through multiple layers — HTTP handler → application → repository → PostgreSQL/PostGIS — as black-box HTTP calls against a running backend and database, rather than mocks. They validate that the layers are wired correctly and that persisted state matches what the API contract promises. The suite targets the backend named by `GEORESPONSE_API_URL` (skipping entirely when it is unset, so a plain `go test ./...` stays safe), logs in with the seeded demo accounts, and cleans up what it creates; `scripts/dev/test.sh`/`.ps1` run it when the variable is set, and CI runs it in its `integration` job against a PostGIS service container (`docs/11_devops/CI_CD.md` section 4.3). Run instructions and variables are in `tests/README.md`.

Representative integration coverage:

- create/update/delete a resource and confirm the persisted row matches the API response;
- resource status change persists the new status and writes status history;
- resource relocation persists the new location, writes location history, and does not alter status (per `API_CONTRACT.md` section 8);
- authentication and authorization enforcement against protected endpoints;
- error responses for invalid input match the documented error contract (`API_CONTRACT.md` section 13).

Integration tests satisfy `NFR-REL-002` (Data Consistency) and `NFR-TEST-003` (Integration Coverage).

---

## 5. End-to-End Tests

Located under `tests/e2e/` (Playwright, Chromium only, `golden-path.spec.ts`; run with `npm test` against an already-running stack at `E2E_BASE_URL`, default `http://localhost:5173` — see `tests/README.md`). It is run locally, not in CI (`docs/11_devops/CI_CD.md` section 4.3).

The e2e layer is intentionally thin and covers the **core golden path** through the running application, not every permutation:

```text
      log in
        ↓
view resources on map and list
        ↓
   create a resource
        ↓
   update a resource
        ↓
  relocate a resource
        ↓
   delete a resource
```

This single flow, exercised end-to-end, gives confidence that the frontend, API, and database are correctly integrated for the application's primary use case. Additional e2e scenarios are added only when a specific golden-path variant is at meaningful risk of regression — the e2e suite does not attempt to replace integration or unit coverage.

---

## 6. What Must Always Be Tested

Regardless of layer, the following are considered mandatory coverage for any change that touches them:

- **Validation rules** — every validated field in `API_CONTRACT.md` section 12 / `DATA_CONTRACT.md` has at least one test for a valid and an invalid case.
- **Status transition and relocation side effects** — a status change or relocation must be tested for its full documented effect (persisted state, history written, audit recorded, and — for relocation — status left unchanged, per `API_CONTRACT.md` section 8).
- **Error mapping** — each documented error code in `API_CONTRACT.md` section 13 has at least one test confirming the backend produces it under the corresponding condition.
- **Map adapter boundary behavior** — frontend tests exercise the map adapter's public interface with MapLibre mocked, per `DEPENDENCY_RULES.md` section 3 and `CODING_STANDARDS.md` section 13; tests do not reach into MapLibre internals directly.
- **Authorization enforcement** — at least one test per protected operation confirms both the permitted and the denied path.

A change that introduces or modifies any of the above without a corresponding test is not done, per `DEFINITION_OF_DONE.md` section 4.

---

## 7. What Is Out of Scope

Consistent with the project's take-home scope, the following are **not** part of GeoResponse's testing strategy:

- exhaustive cross-browser testing — the application is validated against one modern evergreen browser during development;
- visual regression testing (pixel-diffing UI snapshots);
- load/performance testing beyond a basic sanity check of the NFR-PERF targets in `NON_FUNCTIONAL_REQUIREMENTS.md` section 3 — no dedicated load-testing infrastructure is introduced;
- mutation testing or formal fuzz testing;
- accessibility audit tooling beyond what `FRONTEND_TESTING.md` already covers, if anything.

These are excluded because they add testing infrastructure disproportionate to a take-home project's scope and timeline, not because they are considered unimportant in general.

---

## 8. Test Data

- Unit and integration tests use deterministic, purpose-built fixtures — not production or scraped data.
- Integration and e2e tests run against a disposable local/test database instance (the Docker Compose stack from `docs/11_devops/DOCKER_COMPOSE.md`, or CI's throwaway PostGIS service container), seeded with the demo accounts and sample resources from `database/seeds/`, never against a shared or persistent environment.
- Tests must be deterministic and must not depend on external services unless the test explicitly targets that boundary, per `NFR-TEST-002`.

---

## 9. Coverage and Gates

Test execution is one of the checks enforced by `QUALITY_GATES.md` before a change is merged. Coverage is measured per `NFR-TEST-005`; the target is meaningful coverage of business rules and contracts as described in Section 6 above, not a specific numeric threshold pursued for its own sake.

---

## 10. Scope Boundary

This document does not define:

- backend test tooling, mocking conventions, or file layout — see `BACKEND_TESTING.md`;
- frontend test tooling, RTL query conventions, or file layout — see `FRONTEND_TESTING.md`;
- the specific quality gates and CI wiring that run these tests — see `QUALITY_GATES.md` and `docs/11_devops/CI_CD.md`.

---

## 11. Testing Principle

> Test business rules and contracts thoroughly; test the golden path end-to-end once; do not chase exhaustive coverage the project's scope does not need.

The testing pyramid exists to put the most coverage where it is cheapest and most precise, and the least coverage where it is slowest and most brittle.
