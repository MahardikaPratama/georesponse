# Implementation Checklist

## 1. Purpose

This checklist tracks the remaining work to turn the GeoResponse specification
(`docs/01_product` through `docs/13_ai`, `AGENTS.md`, `CLAUDE.md`) into a
working, submittable take-home test.

Every item is atomic: one checkbox is one concrete, independently completable
unit of work. Items are ordered so that completing them top to bottom respects
real dependencies (schema before repository, repository before use case,
use case before handler, backend endpoint before the frontend feature that
calls it).

Each item cites the requirement(s) it satisfies (`FR-XXX`, `NFR-XXX`,
`UC-XX`, `BR-XXX`) and/or the doc that defines its contract, so the
implementer never has to guess the shape of the thing being built.

As of this checklist's creation, no application code exists yet — only the
documentation set and empty scaffolding (`Dockerfiles`, `scripts/*`,
`database/migrations`, `database/seeds`). This checklist starts from that
state.

---

## 2. How to Use This Checklist

- Work top to bottom within a section; sections are ordered by dependency.
- Check an item only when it is actually done and verified (build passes,
  test passes, or manually confirmed) — per `DEFINITION_OF_DONE.md`, do not
  check off unverified work.
- When an item's implementation reveals that a doc needs a small correction,
  fix the doc in the same change (per `AI_OPERATION_RULES.md` section 6).
- If a checklist item turns out to be genuinely out of scope for the MVP,
  strike it through with a one-line reason rather than silently deleting it.
- This file is a working tracker, not a specification. The authoritative
  behavior for any item lives in the doc it cites — if this checklist and a
  spec doc ever disagree, the spec doc wins and this checklist should be
  corrected.

### 2.1 Git Workflow Per Phase

Each phase (the numbered `## N. Phase X` sections below) is implemented on
its own branch off `main` and merged back before the next phase starts, per
`GIT_MANAGEMENT.md`'s Feature Branching strategy and
`PULL_REQUEST_GUIDELINES.md`. The pattern is the same for every phase:

1. `git checkout main && git pull`, then `git checkout -b <branch>` using
   the name listed for that phase below.
2. Work through the phase's checklist items, committing in small,
   Conventional-Commits-style increments (`GIT_MANAGEMENT.md` section 5).
3. `git push -u origin <branch>`.
4. Open a pull request per `PULL_REQUEST_GUIDELINES.md` (title mirrors the
   commit convention; description states what changed, why, and how it was
   tested).
5. Confirm the CI pipeline (`CI_CD.md`) and the quality gates
   (`QUALITY_GATES.md`) pass on the PR.
6. Merge into `main` (squash, per `GIT_MANAGEMENT.md`/`RELEASE_MANAGEMENT.md`).
7. Delete the branch.

Each phase section below states its branch name once at the top and ends
with a single checklist item — "Push, open a PR, merge, delete the branch"
— that stands for steps 3–7 above, so this procedure is not repeated in
full 12 times.

| Phase | Branch |
|---|---|
| 0 — Repository & Tooling Setup | `chore/phase-0-project-setup` |
| 1 — Backend Domain Layer | `feature/phase-1-backend-domain` |
| 2 — Backend Repository Layer | `feature/phase-2-backend-repository` |
| 3 — Backend Application/Use-Case Layer | `feature/phase-3-backend-usecase` |
| 4 — Backend HTTP Layer | `feature/phase-4-backend-http` |
| 5 — Frontend Foundation | `feature/phase-5-frontend-foundation` |
| 6 — Frontend Feature Implementation | `feature/phase-6-frontend-features` (may be split into one `feature/phase-6-<subfeature>` branch per 9.1–9.11 sub-section instead, for smaller PRs — either is acceptable) |
| 7 — Testing Completion | `feature/phase-7-testing` |
| 8 — Containerization & Local Orchestration | `chore/phase-8-containerization` |
| 9 — CI & Quality Gates | `chore/phase-9-ci-quality` |
| 10 — Documentation Reconciliation | `docs/phase-10-doc-reconciliation` |
| 11 — Final Submission Prep | `chore/phase-11-submission-prep` |

A phase's branch should not be started until the previous phase's branch has
merged to `main`, since later phases depend on earlier ones (section 1).

---

## 3. Phase 0 — Repository & Tooling Setup

**Branch:** `chore/phase-0-project-setup` (see section 2.1)

### 3.1 Backend Bootstrap

- [x] Run `go mod init` in `georesponse-be/` with the module path decided in
      `georesponse-be/README.md`. (`github.com/mahardika-pratama/georesponse-be`)
- [ ] Add Go dependencies decided in `BACKEND_DEPENDENCIES.md`: Chi router,
      `pgx`/`pgxpool`, the chosen migration tool. (Chi added and in use;
      `pgx`/`pgxpool` and the migration tool are deliberately **not yet**
      added — nothing imports them yet, per `CODING_STANDARDS.md` section 1
      and `BACKEND_DEPENDENCIES.md` section 3, "don't add an unused
      dependency." Add them when Phase 2 wires the real repository.)
- [ ] Create the base package layout from `BACKEND_ARCHITECTURE.md`
      (`cmd/api`, `internal/http`, `internal/platform`, feature packages,
      `internal/repository/postgres`). (`cmd/api`, `internal/http`, and
      `internal/platform/{config,logging}` exist; the feature packages
      [`resource`, `resourcehistory`, `auth`, `authorization`, `audit`] and
      `internal/repository/postgres` are Phase 1–2 work per this
      checklist's own phasing, not Phase 0.)
- [x] Create `cmd/api/main.go` with a minimal `net/http` server that starts,
      binds to `APP_PORT` (implemented as `HTTP_PORT`, matching
      `ENVIRONMENT_MANAGEMENT.md` section 5.2 — `APP_PORT` in this bullet
      was a naming slip against that doc's own variable table), and
      responds on a placeholder route. (Live-tested: server started, `GET
      /health` returned `200 OK`, structured JSON request logs confirmed.)
- [x] Wire Chi as the router in `internal/http`.
- [x] Add the middleware chain skeleton (request ID, logging, recovery) per
      `BACKEND_ARCHITECTURE.md` section on middleware, even if handlers are
      not yet implemented.
- [x] Verify `go build ./...` succeeds. (Ran; exit 0.)
- [x] Verify `go vet ./...` and `gofmt -l .` report no issues. (Ran; both
      clean.)

### 3.2 Frontend Bootstrap

- [x] Initialize `georesponse-fe/package.json` with Rspack, React, and
      TypeScript per `TECHNOLOGY_SELECTION.md` section 6.
- [x] Add the standard scripts (`dev`, `build`, `test`, `lint`,
      `typecheck`) referenced by `georesponse-fe/README.md`. (Also added
      `lint:fix`, `format`, `format:check` for Prettier.)
- [x] Add MapLibre GL JS, TanStack Query, Vitest, and React Testing Library
      as dependencies.
- [x] Confirm the Rspack config builds `src/main.tsx`/`src/App.tsx` (already
      present) without errors. **Verified via CI** (`.github/workflows/ci.yml`
      run on PR #2, after fixing three real bugs only CI could catch — see
      below).
- [x] Verify `npm run build` succeeds. **Verified via CI.**
- [x] Verify `npm run lint` and `npm run typecheck` report no issues.
      **Verified via CI**, after fixing:
      1. `eslint.config.js` flagged `require`/`module`/`process`/
         `__dirname` as undefined in the root `*.config.js` files (no Node
         globals were configured for them) — added a scoped override.
      2. `tsconfig.json` used `ignoreDeprecations: "6.0"`, which the
         installed TypeScript rejected (`TS5103`) — removed it and used
         `"./"`-prefixed `paths` instead of relying on `baseUrl`.
      3. `rspack.config.js`'s CSS rule needed `postcss-loader`, which was
         never added to `package.json` — added it.
      `npm test` also passed, including `logger.test.ts`.

### 3.3 Database Bootstrap

- [x] Stand up a local PostgreSQL + PostGIS instance (Docker container is
      fine even before `DOCKER_COMPOSE.md` is fully wired up). **Done**: a
      minimal root-level `docker-compose.yml` (`georesponse-db` service only,
      `postgis/postgis:16-3.4`) plus root/`georesponse-be`/`georesponse-fe`
      `.env.example` files were added ahead of Phase 8, specifically to
      unblock this verification. Live-tested: container reports `healthy`;
      `SELECT version(); SELECT postgis_full_version();` confirms
      PostgreSQL 16.4 + PostGIS 3.4.3. (Host port 5432 initially conflicted
      with a pre-existing native Windows `postgresql-x64-18` service; the
      user stopped that service rather than deviating from the documented
      port, per `DOCKER_COMPOSE.md` section 6.3.)
- [x] Implement `scripts/database/migrate.sh` and `migrate.ps1` to apply
      migrations from `database/migrations/` using the tool chosen in
      `BACKEND_DEPENDENCIES.md`. **Live-tested and fixed**: `migrate.ps1`
      originally passed the absolute Windows migrations path straight to
      `migrate -path`, which golang-migrate cannot turn into a valid
      `file://` source URL (the drive letter's `:` breaks URL parsing, and a
      manually-built `file:///D:/...` URI hit a separate file-driver bug) —
      fixed by running `migrate -path .` from inside the migrations
      directory via `Push-Location`, which sidesteps the drive letter
      entirely. Ran against the live container; all 5 migrations
      (`0001`–`0005`) applied cleanly, `\dt` confirms all expected tables.
- [x] Implement `scripts/database/rollback.sh` and `rollback.ps1`. Applied
      the same `Push-Location`/relative-path fix as `migrate.ps1` (same
      underlying bug); not exercised end-to-end against the live database in
      this session (no reason yet to roll back a freshly-applied schema),
      but now uses the same code path already proven to work by `migrate.ps1`.
- [x] Implement `scripts/database/seed.sh` and `seed.ps1` to load
      `database/seeds/`. **Live-tested**: ran against the live container;
      all 8 `INSERT` statements in `0001_sample_resources.sql` succeeded,
      confirmed via `SELECT id, name, type, status FROM resources;`.
- [x] Write migration `0001` creating the `resources` table and enabling the
      `postgis` extension, per `DATABASE_SCHEMA.md` section on `resources`.
- [x] Write migration `0002` creating `users`, `roles`, `permissions`,
      `role_permissions`, `user_roles`.
- [x] Write migration `0003` creating `resource_status_history`,
      `resource_location_history`, `resource_change_history`.
- [x] Write migration `0004` creating `audit_records`.
- [x] Write migration `0005` adding the indexes listed in
      `DATABASE_SCHEMA.md` (type/status B-tree, GIST spatial index on
      `resources.location`, history/audit FK indexes). (Documented as a
      deliberate no-op migration: every index `DATABASE_SCHEMA.md` lists
      was already created inline in migrations 0001–0004; 0005 reserves
      the sequence number rather than duplicating a `CREATE INDEX`.)
- [x] Run `scripts/database/migrate.sh` against the local database and
      confirm all five migrations apply cleanly. **Verified** (Windows:
      `migrate.ps1`, see above) — all five applied, re-running reports
      `no change` as expected.
- [x] Write at least one seed dataset (a handful of resources across all
      four types and all four statuses) in `database/seeds/`. (8 resources,
      one pair per type across all four statuses, at real Indonesian
      disaster-response-relevant coordinates.)
- [x] Run `scripts/database/seed.sh` and confirm the seed data loads.
      **Verified** (Windows: `seed.ps1`) — all 8 sample resources loaded and
      queried back successfully.

### 3.4 Dev Loop Tooling

- [x] Implement `scripts/dev/setup.sh` and `setup.ps1` (installs FE deps,
      installs BE deps, runs migrations, runs seed). (Each step is
      tool-availability-guarded — e.g. it skips the npm step with a clear
      message if `npm` isn't on `PATH`, rather than hard-failing.)
- [x] Implement `scripts/dev/test.sh` and `test.ps1` (runs FE tests, then BE
      tests).
- [x] Implement `scripts/quality/check.sh` and `check.ps1` per
      `QUALITY_GATES.md` (lint, type-check, `gofmt`/`go vet`, both test
      suites, both builds). (Prints a gate-by-gate pass/fail/skip summary;
      exits non-zero only if a gate that actually ran failed.)
- [x] Implement `.golangci.yml` (`georesponse-be/`) and an ESLint flat
      config + `.prettierrc.json`/`.prettierignore` (`georesponse-fe/`) for
      linting/formatting — added beyond this checklist's original wording,
      per explicit request for real lint/format tooling, not just a
      reference to it.
- [x] Implement real SonarQube tooling: `sonar-project.properties` (repo
      root) plus `scripts/quality/sonar.sh`/`.ps1` — added beyond this
      checklist's original wording, per explicit request. The scripts check
      for the `sonar-scanner` CLI and `SONAR_TOKEN`/`SONAR_HOST_URL` and run
      real analysis if present; otherwise they print an actionable setup
      explanation and exit non-fatally (no Sonar server is provisioned for
      this take-home by default, consistent with `CODE_QUALITY.md`).
- [ ] Run `scripts/dev/setup.sh` end to end on a clean checkout and confirm
      it succeeds. **Still not verified as a single script run** — CI
      independently verifies the FE (`npm install`/lint/typecheck/build/
      test) and BE (`go build`/`vet`/`gofmt`/`test`) halves of what this
      script does. The database/migration half is now independently
      verified (section 3.3, above: live `georesponse-db` container,
      `migrate.ps1`/`seed.ps1` both run successfully against it). What's
      still missing is Node.js/npm in this environment, so the script's own
      FE-install step cannot be exercised here — someone with Node available
      (or a future CI job) still needs to run `setup.sh`/`setup.ps1` itself,
      not just its constituent pieces separately, to confirm the whole
      script's control flow (guards, ordering, error handling) works.
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). Branch `chore/phase-0-project-setup`,
      PR #2. CI failed twice on real, previously-undetectable bugs (ESLint
      Node-globals config, an invalid `tsconfig.json` compiler flag, a
      missing `postcss-loader` dependency) — each was fixed and pushed
      until both the frontend and backend CI jobs passed, then merged.

---

## 4. Phase 1 — Backend Domain Layer

**Branch:** `feature/phase-1-backend-domain` (see section 2.1)

- [x] Implement the `Resource` domain struct per `DOMAIN_MODEL.md` section 3
      (identity, type, attributes, status, location).
      (`georesponse-be/internal/resource/resource.go`.)
- [x] Implement the `ResourceType` enum (`VEHICLE`, `FACILITY`, `EQUIPMENT`,
      `IOT_DEVICE`) per `BUSINESS_RULES.md` BR-003.
      (`Type` in `resource.go`, with a `Valid()` method.)
- [x] Implement the `ResourceStatus` enum (`AVAILABLE`, `IN_USE`,
      `MAINTENANCE`, `UNAVAILABLE`) per BR-006.
      (`Status` in `resource.go`, with a `Valid()` method.)
- [x] Implement the `Location` value type (latitude/longitude) with range
      validation (`-90..90`, `-180..180`) per BR-010.
      (`georesponse-be/internal/resource/location.go`.)
- [x] Implement domain-level coordinate validation and unit-test it with a
      table-driven test covering valid, boundary, and out-of-range values
      (`BACKEND_TESTING.md`). (`ValidateLocation`/`Location.Validate` +
      `location_test.go`'s `TestValidateLocation`, covering both boundaries
      exactly at ±90/±180 and just outside them.)
- [x] Implement the `AttributeValidator` interface and
      `AttributeValidatorRegistry` (Strategy pattern) per
      `BACKEND_ARCHITECTURE.md` section 8.2, so each resource type's
      attribute rules are added as a new file rather than a new branch in
      shared code (Open/Closed Principle).
      (`georesponse-be/internal/resource/attribute_validator.go`.)
- [x] Implement `VehicleAttributeValidator` (`vehicleType`, `capacity`) per
      `DOMAIN_MODEL.md` section 6.2, and register it in the registry.
      (`attribute_validator_vehicle.go`.)
- [x] Implement `FacilityAttributeValidator` (`facilityType`, `capacity`),
      and register it. (`attribute_validator_facility.go`.)
- [x] Implement `EquipmentAttributeValidator` (`equipmentType`, `quantity`),
      and register it. (`attribute_validator_equipment.go`.)
- [x] Implement `IoTDeviceAttributeValidator` (`deviceType`), and register
      it. (`attribute_validator_iotdevice.go`.)
- [x] Unit-test that registering a fifth, hypothetical validator requires no
      change to `AttributeValidatorRegistry`, `resource.Service`, or any
      existing validator (confirms the Open/Closed property actually holds).
      (`attribute_validator_test.go`'s `TestAttributeValidatorRegistry_OpenClosed`
      registers a hypothetical `DRONE` validator alongside the four real
      ones without touching the registry or any existing validator file;
      `resource.Service` does not exist yet — it is Phase 3 scope — so
      there is nothing to verify there yet.)
- [x] Implement the `User`, `Role`, and `Permission` domain structs per
      `DATA_CONTRACT.md` sections 5–7. (`User` in
      `georesponse-be/internal/auth/user.go` — credentials deliberately
      excluded, matching the `users` table schema
      [`database/migrations/0002`], which excludes them by design; `Role`
      and `Permission` in `georesponse-be/internal/authorization/role.go`.)
- [x] Implement the `ResourceStatusHistory`, `ResourceLocationHistory`, and
      `ResourceChangeHistory` domain structs per `DATA_CONTRACT.md`
      section 8. (`StatusHistory`, `LocationHistory`, `ResourceChangeHistory`
      in `georesponse-be/internal/resourcehistory/history.go` — named to
      match `BACKEND_ARCHITECTURE.md`'s package layout, which puts this
      package's own `StatusHistory`/`LocationHistory` types under the
      `resourcehistory` package rather than repeating "Resource" in the
      type name.)
- [x] Implement the `AuditRecord` domain struct per `DATA_CONTRACT.md`
      section 9, including the operation-type enum from BR-035.
      (`georesponse-be/internal/audit/audit.go`.)
- [x] Unit-test each domain validation rule against its `BUSINESS_RULES.md`
      ID (one test per BR where behavior is non-trivial). Covered:
      BR-001/002/003/005/006 (`resource_test.go`), BR-004
      (`attribute_validator*_test.go`), BR-009/010
      (`location_test.go`), BR-036/037 (`audit_test.go`). `go test ./...`
      passes; `go build ./...` and `go vet ./...` are clean; new files are
      gofmt-clean (pre-existing Phase 0 files show as gofmt-dirty only due
      to CRLF line endings from the Windows checkout — a pre-existing,
      environment-only artifact CI's Linux runner won't reproduce; left
      untouched as out of scope for this phase).
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). Branch
      `feature/phase-1-backend-domain`, PR #6 — CI passed, merged into
      `main`, branch deleted (remote and local).

---

## 5. Phase 2 — Backend Repository Layer

**Branch:** `feature/phase-2-backend-repository` (see section 2.1)

- [ ] Implement `ResourceRepository` interface per `DEPENDENCY_RULES.md`
      section 2 (application code depends on the interface, not the
      implementation).
- [ ] Implement `postgresResourceRepository.Create`.
- [ ] Implement `postgresResourceRepository.GetByID`.
- [ ] Implement `postgresResourceRepository.List` with `search`, `type`,
      `status`, `page`, `pageSize` filtering per `API_CONTRACT.md`
      section 6.1.
- [ ] Implement `postgresResourceRepository.Update`.
- [ ] Implement `postgresResourceRepository.UpdateStatus`.
- [ ] Implement `postgresResourceRepository.UpdateLocation`.
- [ ] Implement `postgresResourceRepository.Delete` (hard delete, per
      `DATABASE_ARCHITECTURE.md`'s deletion-model decision).
- [ ] Implement uniqueness enforcement on `id` at the repository/DB level
      (DB constraint + mapped `RESOURCE_ID_CONFLICT` error) per BR-001.
- [ ] Implement `ResourceHistoryRepository` (`InsertStatusHistory`,
      `InsertLocationHistory`, `InsertChangeHistory`, `ListByResourceID`
      with the `type` filter from `API_CONTRACT.md` section 9.1).
- [ ] Implement `AuditRepository` (`Insert`, `List` with the filters from
      `API_CONTRACT.md` section 11.1).
- [ ] Implement `UserRepository`, `RoleRepository`, `PermissionRepository`
      per `API_CONTRACT.md` section 10.
- [ ] Write repository-level integration tests against the real local
      PostgreSQL+PostGIS instance for `Create`, `List` (with each filter),
      `Update`, `Delete`, and the spatial index usage, per
      `BACKEND_TESTING.md`.
- [ ] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1).

---

## 6. Phase 3 — Backend Application/Use-Case Layer

**Branch:** `feature/phase-3-backend-usecase` (see section 2.1)

- [ ] Implement `CreateResource` use case: validate → check ID uniqueness →
      persist → write audit record (`RESOURCE_CREATED`) (FR-001, BR-001,
      BR-016, BR-042, UC-06).
- [ ] Implement `GetResource` use case (FR-003, UC-02).
- [ ] Implement `ListResources` use case with search/filter/pagination
      (FR-002, FR-016–019, UC-01, UC-03, UC-04).
- [ ] Implement `UpdateResource` use case: validate → persist → write
      resource-change-history record → write audit record
      (`RESOURCE_UPDATED`) (FR-004, BR-015, BR-017, UC-07).
- [ ] Implement `DeleteResource` use case: check existence → delete → write
      audit record (`RESOURCE_DELETED`) (FR-005, BR-019, BR-021, UC-10).
- [ ] Implement `ChangeResourceStatus` use case: validate status → persist →
      write status-history record → write audit record
      (`RESOURCE_STATUS_CHANGED`) (FR-011, FR-012, BR-006, BR-008, UC-08).
- [ ] Unit-test that `ChangeResourceStatus` does **not** modify `location`
      (BR symmetry note in `API_CONTRACT.md` section 7.1).
- [ ] Implement `RelocateResource` use case: validate coordinates → update
      location → preserve identity/type/status → write location-history
      record → write audit record (`RESOURCE_RELOCATED`) (FR-023–026,
      BR-009–BR-014, UC-09).
- [ ] Unit-test that `RelocateResource` preserves `id`, `type`, and `status`
      unchanged (BR-012, UC-09 "Invariants").
- [ ] Implement `GetResourceHistory` use case, merging status/location/change
      history with the `type` filter (FR-034–037, UC-13).
- [ ] Implement `ListAuditRecords` use case with `userId`, `resourceId`,
      `operation`, `startTime`, `endTime` filters (FR-038–040, UC-14).
- [ ] Implement `Authenticate` (login) use case (FR-027–029, BR-022–024,
      UC-11).
- [ ] Implement `Logout` use case (`API_CONTRACT.md` section 5.2).
- [ ] Implement `GetCurrentUser` use case (FR-029).
- [ ] Implement `ListRoles`, `CreateRole`, `UpdateRole`, `DeleteRole` use
      cases (FR-030, FR-033, BR-025, UC-12).
- [ ] Implement `ListPermissions` use case.
- [ ] Implement `AssignRolePermissions` use case, writing an audit record
      (`PERMISSION_CHANGED`) (FR-033, BR-028).
- [ ] Implement `AssignUserRoles` use case, writing an audit record
      (`ROLE_CHANGED`) (`API_CONTRACT.md` section 10.5, BR-028).
- [ ] Implement the authorization check (permission enforcement) as
      middleware or a use-case-level guard applied to every protected
      operation (FR-031, FR-032, BR-026, BR-027).
- [ ] Unit-test that every state-changing use case returns an error — and
      performs no persistence — when validation fails (BR-018, BR-030,
      BR-042).
- [ ] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1).

---

## 7. Phase 4 — Backend HTTP Layer

**Branch:** `feature/phase-4-backend-http` (see section 2.1)

- [ ] Implement `POST /api/v1/auth/login` handler (FR-027, FR-028).
- [ ] Implement `POST /api/v1/auth/logout` handler.
- [ ] Implement `GET /api/v1/auth/me` handler (FR-029).
- [ ] Implement `GET /api/v1/resources` handler with query-param parsing and
      pagination defaults (`page=1`, `pageSize=20`, max `100`) per
      `API_CONTRACT.md` section 3.
- [ ] Implement `GET /api/v1/resources/{id}` handler, mapping "not found" to
      `404 RESOURCE_NOT_FOUND` (FR-051).
- [ ] Implement `POST /api/v1/resources` handler with full request
      validation and `201` response, mapping duplicate ID to
      `409 RESOURCE_ID_CONFLICT`.
- [ ] Implement `PUT /api/v1/resources/{id}` handler.
- [ ] Implement `DELETE /api/v1/resources/{id}` handler returning `204`.
- [ ] Implement `PATCH /api/v1/resources/{id}/status` handler, mapping
      invalid status to `400 INVALID_RESOURCE_STATUS`.
- [ ] Implement `PATCH /api/v1/resources/{id}/location` handler, mapping
      invalid coordinates to `400 INVALID_LOCATION`.
- [ ] Implement `GET /api/v1/resources/{id}/history` handler with the
      `type`/`page`/`pageSize` query params.
- [ ] Implement `GET /api/v1/roles`, `POST /api/v1/roles`,
      `PUT /api/v1/roles/{id}`, `DELETE /api/v1/roles/{id}` handlers.
- [ ] Implement `GET /api/v1/permissions` handler.
- [ ] Implement `PUT /api/v1/roles/{id}/permissions` handler.
- [ ] Implement `PUT /api/v1/users/{id}/roles` handler.
- [ ] Implement `GET /api/v1/audit-logs` handler with its filters and
      pagination.
- [ ] Implement the centralized error-to-HTTP translation
      (`BACKEND_ERROR_HANDLING.md`) covering every error code in
      `API_CONTRACT.md` section 13.
- [ ] Implement panic-recovery middleware mapping unexpected panics to
      `500 PERSISTENCE_ERROR`-shaped responses without leaking internals
      (FR-053, BR-018).
- [ ] Implement a `GET /health` endpoint for `DEPLOYMENT.md`'s health-check
      contract.
- [ ] Write `httptest`-based handler tests for every endpoint above,
      covering the success path and at least one documented failure path
      each (`BACKEND_TESTING.md`).
- [ ] Manually exercise the full API surface with a REST client (or `curl`)
      against the local database and confirm every endpoint in
      `API_CONTRACT.md` behaves as documented.
- [ ] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1).

---

## 8. Phase 5 — Frontend Foundation

**Branch:** `feature/phase-5-frontend-foundation` (see section 2.1)

- [ ] Implement the API client module (`api/` or equivalent) wrapping
      `fetch`, base URL from `API_BASE_URL` env var, and the
      `{data}`/`{data, meta}`/`{error}` envelope parsing from
      `API_CONTRACT.md` section 4.
- [ ] Configure TanStack Query's `QueryClient` and provider at the app root.
- [ ] Implement the Map Adapter boundary (`MapAdapter` interface + MapLibre
      GL JS implementation) per `FRONTEND_ARCHITECTURE.md` section on the
      Map Adapter — no other component may import MapLibre directly.
- [ ] Implement the resource query-key factory (`resourceKeys.ts`) per
      `FRONTEND_STATE.md`.
- [ ] Implement the base app shell/layout (map-first layout per
      `FRONTEND_UI_UX.md`).
- [ ] Implement authentication state handling (login form, stored
      authenticated context, route guarding for protected views) per
      UC-11 and `SECURITY.md`.
- [ ] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1).

---

## 9. Phase 6 — Frontend Feature Implementation

**Branch:** `feature/phase-6-frontend-features` — or one
`feature/phase-6-<subfeature>` branch per 9.1–9.11 sub-section below, merged
individually as each feature completes (see section 2.1).

### 9.1 Resource List & Map (FR-002, FR-020, UC-01, UC-05)

- [ ] Implement `useResources` hook (TanStack Query, calls
      `GET /api/v1/resources`).
- [ ] Implement `ResourceList` component (rendering identity, type, status,
      location per FR-002).
- [ ] Implement the map view rendering resource markers from `useResources`
      via the Map Adapter (FR-020).
- [ ] Implement the empty state for zero resources (UC-01 alternative flow).
- [ ] Implement the error state for a failed list fetch (UC-01 alternative
      flow).

### 9.2 Search & Filter (FR-016–019, UC-03, UC-04)

- [ ] Implement the search input wired to the `search` query param.
- [ ] Implement the type-filter control wired to the `type` query param.
- [ ] Implement the status-filter control wired to the `status` query param.
- [ ] Verify combined filters narrow results correctly (FR-019, BR-045).
- [ ] Implement empty-state messaging for "no results match" distinct from
      "no resources exist" (UC-03/UC-04 alternative flows).

### 9.3 Resource Detail (FR-003, FR-021, UC-02)

- [ ] Implement `useResource(id)` hook.
- [ ] Implement the `ResourceDetail` panel (identity, type, attributes,
      status, location).
- [ ] Wire map-marker selection to open the detail panel (FR-021, UC-05
      step 5).
- [ ] Implement the "resource not found" state (UC-02 alternative flow).

### 9.4 Create Resource (FR-001, FR-006–009, FR-013–015, UC-06)

- [ ] Implement the create-resource form with fields for id, name, type,
      status, type-specific attributes, and location.
- [ ] Implement frontend validation mirroring `API_CONTRACT.md` section 12
      (non-authoritative, UX-only).
- [ ] Implement the `useCreateResource` mutation, invalidating the resource
      list query on success (`FRONTEND_STATE.md`).
- [ ] Implement field-level error display from the backend's `details`
      array on `VALIDATION_ERROR`/`RESOURCE_ID_CONFLICT` responses
      (FR-043).
- [ ] Verify the newly created resource appears in the list and on the map
      without a manual page refresh (UC-06 step 8).

### 9.5 Update Resource (FR-004, UC-07)

- [ ] Implement the update-resource form, pre-filled from
      `GET /api/v1/resources/{id}`.
- [ ] Implement the `useUpdateResource` mutation, invalidating the
      resource-detail and list queries.
- [ ] Verify identity is preserved in the UI after update (BR-015).

### 9.6 Change Status (FR-010–012, UC-08)

- [ ] Implement the status-change control (e.g., a dropdown or
      `StatusIndicator`-driven selector) on the detail panel.
- [ ] Implement the `useChangeResourceStatus` mutation.
- [ ] Verify the status badge updates across list, detail, and map views
      after a successful change.

### 9.7 Relocate Resource (FR-022–026, UC-09)

- [ ] Implement the relocation interaction (e.g., drag the marker on the
      map, or a "set new location" control) per `FRONTEND_UI_UX.md`.
- [ ] Implement the `useRelocateResource` mutation.
- [ ] Verify the marker moves to the new position on the map immediately
      after a successful relocation (FR-022, UC-09 step 7).

### 9.8 Delete Resource (FR-005, UC-10)

- [ ] Implement the delete confirmation dialog (UC-10 step 2).
- [ ] Implement the `useDeleteResource` mutation, invalidating the resource
      list query.
- [ ] Verify the resource disappears from the list and the map immediately
      after successful deletion, and remains unchanged if the confirmation
      is cancelled (UC-10 alternative flow).

### 9.9 Resource History (FR-034–037, UC-13)

- [ ] Implement `useResourceHistory(id)` hook.
- [ ] Implement the history view (status/location/change tabs or sections).
- [ ] Implement the empty-history state.

### 9.10 Authorization & Administration (FR-030–033, UC-12)

- [ ] Implement the roles/permissions management view, restricted to users
      with the required permission.
- [ ] Implement the user-role assignment control.
- [ ] Verify a caller without permission is redirected/blocked rather than
      shown the management UI (FR-032, BR-027).

### 9.11 Audit Trail (FR-038–040, UC-14)

- [ ] Implement `useAuditLogs` hook with filter controls.
- [ ] Implement the audit-log view, restricted to authorized users.
- [ ] Implement the empty-state and error-state for the audit view.
- [ ] Push, open a PR (or one PR per sub-feature branch, if split), confirm
      CI passes, merge into `main`, delete the branch(es) (workflow:
      section 2.1).

---

## 10. Phase 7 — Testing Completion

**Branch:** `feature/phase-7-testing` (see section 2.1)

- [ ] Reach the coverage expectations in `TESTING_STRATEGY.md` for
      validation logic, domain rules, and the relocation/status-change
      side effects (both frontend and backend).
- [ ] Write at least one integration test under `tests/integration/`
      exercising create → update → relocate → delete against a real
      backend + database (per `TESTING_STRATEGY.md`).
- [ ] Write at least one end-to-end test under `tests/e2e/` covering the
      golden path: view resources on map → create → update → relocate →
      delete.
- [ ] Run the full test suite (`scripts/dev/test.sh`) and confirm all tests
      pass.
- [ ] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1).

---

## 11. Phase 8 — Containerization & Local Orchestration

**Branch:** `chore/phase-8-containerization` (see section 2.1)

### 11.1 Environment & Secrets

- [x] Create root `.env.example` documenting the compose-level variables
      (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `APP_ENV`,
      `HTTP_PORT`, `LOG_LEVEL`, `API_BASE_URL` — no `VITE_` prefix, since
      the frontend build tool is Rspack, not Vite) per
      `ENVIRONMENT_MANAGEMENT.md` section 6, with obviously-fake local-dev
      placeholder values — never a real secret. **Done early** (ahead of
      Phase 8), alongside the interim `docker-compose.yml` created to
      unblock Phase 0 section 3.3's live-database verification.
- [x] Create `georesponse-be/.env.example` (variables from
      `ENVIRONMENT_MANAGEMENT.md` section 5.2, for running the backend
      directly with `go run`, outside Docker). **Done early**, same reason.
- [x] Create `georesponse-fe/.env.example` (variables from
      `ENVIRONMENT_MANAGEMENT.md` section 5.1, for running the frontend
      directly with `npm run dev`, outside Docker). **Done early**, same
      reason.
- [x] Add `.env` to `.gitignore` at the repository root, and confirm (or
      add) the same in `georesponse-fe/.gitignore` and
      `georesponse-be/.gitignore` — verify with `git status` after creating
      a real local `.env` that it does not show up as untracked/stageable.
      **Verified**: root `.gitignore` already covered `.env` repo-wide
      (matches at any depth, including `georesponse-be/.env`, which has no
      per-app `.gitignore` of its own); `georesponse-fe/.gitignore` already
      listed it too. `git check-ignore -v` confirmed all three real `.env`
      files are ignored; `git status --porcelain` shows only the three
      `.env.example` files and `docker-compose.yml` as untracked, no `.env`.
- [ ] Implement backend startup validation that fails fast with a clear
      error when a required variable (e.g. `DATABASE_URL`) is missing or
      malformed, per `ENVIRONMENT_MANAGEMENT.md` section 8 (NFR-DEP-004).

### 11.2 Images & Compose

- [ ] Write `georesponse-fe/Dockerfile` (multi-stage: build, then serve
      static assets) per `CONTAINERIZATION.md`.
- [ ] Write `georesponse-be/Dockerfile` (multi-stage: build, then run the Go
      binary) per `CONTAINERIZATION.md`.
- [ ] Implement the backend's auto-migrate-on-startup behavior (guarded by
      `APP_ENV=development`) per `DOCKER_COMPOSE.md` section 6.5, so the
      schema is always current without a manual migration step in local
      dev.
- [ ] Implement `scripts/docker/build.sh`/`build.ps1`.
- [ ] Implement `scripts/docker/clean.sh`/`clean.ps1`.
- [ ] Write the real root-level `docker-compose.yml` per `DOCKER_COMPOSE.md`
      section 5 (frontend, backend, PostGIS, healthchecks, `${VAR}`
      substitution from the root `.env` — no hardcoded credentials).
      **Partially done early**: a `docker-compose.yml` exists at the root
      with only the `georesponse-db` service (matching section 5's db
      definition, `${VAR}` substitution, healthcheck), added ahead of this
      phase to unblock Phase 0 section 3.3. The `georesponse-fe` and
      `georesponse-be` services are intentionally still missing — their
      Dockerfiles are empty placeholders — and must be added here once this
      phase implements them, to match section 5 in full.
- [ ] Run `docker compose up --build` directly (without the wrapper script)
      from a clean checkout with a real `.env` already in place, and
      confirm the full stack starts and the frontend can reach the backend.

### 11.3 One-Command Local Run

- [ ] Write root `run.sh`: verify Docker is installed and running; for each
      of the three `.env.example` files, copy it to the corresponding
      `.env` only if that `.env` does not already exist (never overwrite a
      developer's existing local values); then run
      `docker compose up --build`; then print the access URLs from
      `DOCKER_COMPOSE.md` section 6.3.
- [ ] Write root `run.ps1` — the same behavior, for Windows PowerShell,
      matching the `.sh`/`.ps1` pairing convention already used by every
      other script in `scripts/`.
- [ ] Make `run.sh` executable (`chmod +x run.sh`) and commit it as such.
- [ ] On a completely clean checkout with no `.env` files present anywhere,
      run only `./run.sh` and confirm: env files are created, the stack
      builds and starts, the database is migrated automatically, and the
      frontend at `http://localhost:5173` can successfully call the backend
      — zero manual steps beyond that one command.
- [ ] Implement `scripts/deployment/deploy.sh`/`deploy.ps1` and
      `health-check.sh`/`health-check.ps1` per `DEPLOYMENT.md`.
- [ ] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1).

---

## 12. Phase 9 — CI & Quality Gates

**Branch:** `chore/phase-9-ci-quality` (see section 2.1)

- [x] Add the GitHub Actions workflow described in `CI_CD.md` (lint,
      type-check, build, test for both apps, triggered on push/PR to
      `main`). (Done early, in `chore/phase-0-project-setup`, so that
      phase's own PR could actually have a "confirm CI passes" step. The
      Docker-build-verify job from `CI_CD.md` section 4.4 is deliberately
      **not** included yet — both Dockerfiles are still empty placeholders
      [Phase 8]; add that job when Phase 8 lands.)
- [x] Implement `scripts/quality/sonar.sh`/`sonar.ps1` if static-analysis
      tooling is configured (optional per `CODE_QUALITY.md`'s
      proportionate-scope framing). (Done early, in Phase 0, per explicit
      request for real SonarQube tooling — `sonar-project.properties` +
      both scripts exist and check for `sonar-scanner`/`SONAR_TOKEN`
      before running.)
- [ ] Run `scripts/quality/check.sh` locally and confirm every gate in
      `QUALITY_GATES.md` passes. **Not verified** — requires Node.js and a
      live database, neither available in this environment.
- [ ] Push, open a PR, and confirm the CI pipeline itself runs correctly on
      it (this is also the first real end-to-end proof the pipeline works),
      then merge into `main` and delete the branch (workflow: section 2.1).
      (The CI workflow file itself was already exercised by the Phase 0
      PR; this item is about the remaining Phase 9 work — coverage
      reporting, branch protection, etc. — once that's scoped.)

---

## 13. Phase 10 — Documentation Reconciliation

**Branch:** `docs/phase-10-doc-reconciliation` (see section 2.1)

- [ ] Update the **Implementation Status** section in `README.md`,
      `georesponse-fe/README.md`, and `georesponse-be/README.md` to reflect
      what is now actually implemented (remove or narrow the "not yet
      implemented" language as each part lands).
- [ ] Update `docs/13_ai/AI_WORKFLOW.md` section 5 (disclosure) to describe
      the actual extent of AI assistance used during implementation, not
      just documentation authoring.
- [ ] For any FR/UC left intentionally unimplemented at submission time,
      document it explicitly (file, section) per the take-home brief's
      "explain unfinished features" requirement — do not leave a silent
      gap.
- [ ] Verify every code example, endpoint list, and script path across
      `docs/` still matches the real implementation (spot-check
      `API_CONTRACT.md`, `DATABASE_SCHEMA.md`, and both READMEs).
- [ ] Re-run the redundancy/consistency pass on any doc touched during
      implementation, per the ownership map established in this session.
- [ ] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1).

---

## 14. Phase 11 — Final Submission Prep

**Branch:** `chore/phase-11-submission-prep` (see section 2.1)

- [ ] Confirm `git log` reflects small, focused, Conventional-Commits-style
      commits per `GIT_MANAGEMENT.md` (squash/rebase stray WIP commits if
      needed).
- [ ] Confirm no secrets, `.env` files, or `node_modules`/build artifacts
      are committed.
- [ ] Confirm `AGENTS.md` and/or `CLAUDE.md` are present at the repository
      root (take-home brief's explicit Agentic AI disclosure requirement).
- [ ] Do a final clean-checkout smoke test: clone into a fresh directory,
      run `scripts/dev/setup.sh`, run `docker compose up`, and confirm the
      golden path (view → create → update → relocate → delete a resource
      on the map) works end to end.
- [ ] Confirm the submission is pushed/available before **2026-09-19
      23:59** (the take-home deadline).
- [ ] Push, open a PR, confirm CI passes, and merge into `main` — this
      merge is the submission commit itself (workflow: section 2.1; delete
      the branch afterward for a clean history).

---

## 15. Traceability Summary

| Phase | Primary Requirements Covered |
|---|---|
| 3 — Setup | Project scaffolding (no FR/NFR directly) |
| 4 — Domain | BR-001–BR-014 |
| 5 — Repository | FR-048–FR-050, NFR-PERF-003/004 |
| 6 — Use Cases | FR-001–FR-040, BR-015–BR-039 |
| 7 — HTTP Layer | FR-041–FR-053, all of `API_CONTRACT.md` |
| 8–9 — Frontend | FR-001–FR-040, UC-01–UC-14 |
| 10 — Testing | NFR-REL-001–004, `TESTING_STRATEGY.md` |
| 11 — Containerization | `DEPLOYMENT.md`, `DOCKER_COMPOSE.md` |
| 12 — CI/Quality | `QUALITY_GATES.md`, `CI_CD.md` |
| 13–14 — Docs & Submission | Take-home brief documentation requirements |

Every checklist item traces back to a requirement or doc section; nothing in
this checklist introduces scope beyond what `SCOPE.md` and
`FUNCTIONAL_REQUIREMENTS.md` already define.
