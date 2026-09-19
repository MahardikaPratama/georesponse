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
- [x] Add Go dependencies decided in `BACKEND_DEPENDENCIES.md`: Chi router,
      `pgx`/`pgxpool`, the chosen migration tool. (Chi added in Phase 0;
      `pgx`/`pgxpool` added in Phase 2 when the real repository was wired.
      The migration tool is the golang-migrate **CLI**, invoked by
      `scripts/database/migrate.sh`/`.ps1` and installed as a tool, not a
      `go.mod` dependency — per `BACKEND_DEPENDENCIES.md` section 3/4 it is
      not imported by application code. The development-only start-up
      migrator added in Phase 8 [`internal/platform/postgres/migrate.go`]
      is ~150 lines over `pgx` writing the same `schema_migrations` table,
      so no new module dependency was needed.)
- [x] Create the base package layout from `BACKEND_ARCHITECTURE.md`
      (`cmd/api`, `internal/http`, `internal/platform`, feature packages,
      `internal/repository/postgres`). (`cmd/api`, `internal/http`, and
      `internal/platform/{config,logging}` in Phase 0; the feature packages
      [`resource`, `resourcehistory`, `auth`, `authorization`, `audit`,
      `hotspot`], `internal/platform/{postgres,transaction,idgen,bmkg}`,
      and `internal/repository/{postgres,bmkg}` landed in Phases 1–4 per
      this checklist's own phasing. All present as of Phase 8.)
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
- [x] Run `scripts/dev/setup.sh` end to end on a clean checkout and confirm
      it succeeds. **Verified 2026-09-20** on a fresh `git clone` into a
      scratch directory with Node.js 24, Go 1.25, the golang-migrate CLI
      and `psql` on `PATH` and `DATABASE_URL` pointing at the compose
      database: `npm install` (648 packages), `go mod download`,
      `migrate up` ("no change" — schema already at 0007) and all three
      seed files ran, exit 0. Two things this surfaced and fixed along the
      way: the auth seeds (`0002`, `0003`) were not idempotent, so a
      re-run failed on duplicate keys — every `INSERT` is now
      `ON CONFLICT DO NOTHING`; and the `migrate` CLI resolves `localhost`
      to `::1` on Windows, where Docker only publishes IPv4, so use
      `127.0.0.1` in `DATABASE_URL` for the scripts (the Go backend itself
      falls back to IPv4 and is unaffected).
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

- [x] Implement `ResourceRepository` interface per `DEPENDENCY_RULES.md`
      section 2 (application code depends on the interface, not the
      implementation). (`georesponse-be/internal/resource/repository.go`;
      implementation in `internal/repository/postgres/resource_repository.go`,
      with a compile-time `var _ resource.Repository = (*ResourceRepository)(nil)`
      check in `assertions.go`.)
- [x] Implement `postgresResourceRepository.Create`.
- [x] Implement `postgresResourceRepository.GetByID`.
- [x] Implement `postgresResourceRepository.List` with `search`, `type`,
      `status`, `page`, `pageSize` filtering per `API_CONTRACT.md`
      section 6.1. (Filters combine with AND per BR-045; `page`/`pageSize`
      default to 1/20 and cap at 100, per section 3.)
- [x] Implement `postgresResourceRepository.Update`.
- [x] Implement `postgresResourceRepository.UpdateStatus`.
- [x] Implement `postgresResourceRepository.UpdateLocation`.
- [x] Implement `postgresResourceRepository.Delete` (hard delete, per
      `DATABASE_ARCHITECTURE.md`'s deletion-model decision). **Found and
      fixed a real schema bug while implementing this**: migrations
      0003's `resource_status_history`/`resource_location_history`/
      `resource_change_history` used `ON DELETE CASCADE` on `resource_id`,
      which would silently delete a resource's own history the moment the
      resource itself was hard-deleted — directly contradicting
      `DATABASE_ARCHITECTURE.md` and `API_CONTRACT.md`'s explicit
      requirement that history remain available after deletion.
      `audit_records` already used `ON DELETE SET NULL` and was unaffected.
      Added migration `0006_relax_history_resource_id_cascade` (changes
      all three history tables' FK to `ON DELETE SET NULL`, matching
      `audit_records`) — applied to the live database and covered by
      `TestResourceHistoryRepository_SurvivesResourceDeletion`, which
      fails without the fix and passes with it.
- [x] Implement uniqueness enforcement on `id` at the repository/DB level
      (DB constraint + mapped `RESOURCE_ID_CONFLICT` error) per BR-001.
      (`resources.id` is already the primary key; `Create` detects
      SQLSTATE `23505` and returns `resource.ErrIDConflict`. Live-tested:
      `TestResourceRepository_Create_DuplicateID`.)
- [x] Implement `ResourceHistoryRepository` (`InsertStatusHistory`,
      `InsertLocationHistory`, `InsertChangeHistory`, `ListByResourceID`
      with the `type` filter from `API_CONTRACT.md` section 9.1).
      (`georesponse-be/internal/resourcehistory/repository.go` +
      `internal/repository/postgres/resourcehistory_repository.go`.)
- [x] Implement `AuditRepository` (`Insert`, `List` with the filters from
      `API_CONTRACT.md` section 11.1). (`internal/audit/repository.go` +
      `internal/repository/postgres/audit_repository.go`.)
- [x] Implement `UserRepository`, `RoleRepository`, `PermissionRepository`
      per `API_CONTRACT.md` section 10. Section 10 does not define exact
      request/response JSON bodies for these endpoints (left to
      implementation); interfaces are grounded in the Phase 1
      `auth.User{ID, Name, RoleNames}` /
      `authorization.Role{ID, Name, Permissions}` /
      `authorization.Permission{ID, Code, Name}` structs.
      `RoleRepository.SetPermissions` and `UserRepository.SetRoles` are
      full-replace (not merge) operations, matching
      `PUT /api/v1/roles/{id}/permissions` and
      `PUT /api/v1/users/{id}/roles`'s semantics, and run inside a
      transaction so a reference to an unknown permission/role code
      leaves the previous assignment untouched rather than partially
      applied (`internal/auth/repository.go`,
      `internal/authorization/repository.go`, implementations in
      `internal/repository/postgres/`). `auth.User` still has no
      credential field (schema excludes it by design, per Phase 1), so
      login/credential lookup remains out of scope here, same as noted in
      Phase 1.
- [x] Write repository-level integration tests against the real local
      PostgreSQL+PostGIS instance for `Create`, `List` (with each filter),
      `Update`, `Delete`, and the spatial index usage, per
      `BACKEND_TESTING.md`. **Live-tested** against the `georesponse-db`
      Docker container from Phase 0 section 3.3 (all 21 integration tests
      pass; `go test ./...` also skips them cleanly via `t.Skip` when
      `DATABASE_URL` is unset, so the suite stays runnable without a
      database). Each test runs inside its own transaction, rolled back
      afterward, so the pre-existing seed data is never modified — list
      filter assertions use a `zztest`-prefixed name marker so they can't
      collide with real seed rows. "Spatial index usage" is covered
      indirectly: every `Location` read/write round-trips through the
      `geography(Point,4326)` column via `ST_MakePoint`/`ST_X`/`ST_Y`
      (`TestResourceRepository_CreateAndGetByID`,
      `TestResourceRepository_UpdateLocation`), but no `EXPLAIN`-based
      check that the GIST index (`idx_resources_location`) is actually
      chosen by the query planner exists, since no spatial predicate
      query (e.g. `ST_DWithin`) is implemented yet — radius/bounding-box
      search is explicitly out of scope per `API_CONTRACT.md` section 16,
      so there is currently no query that would exercise that index.
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). Branch
      `feature/phase-2-backend-repository`. CI initially failed with
      `go: no such tool "covdata"` on every package with no test files —
      `go.mod`'s `go` directive had drifted to `1.25.0` (pgx/v5 v5.11.0's
      own minimum) while CI stayed pinned to Go 1.23, so
      `actions/setup-go` auto-toolchain-switched to a downloaded Go 1.25
      missing the `covdata` tool. Fixed by pinning CI to Go 1.25 directly
      (matching `go.mod`) instead of chasing an older pgx version. CI
      passed after that fix; merged into `main`, branch deleted (remote
      and local).

---

## 6. Phase 3 — Backend Application/Use-Case Layer

**Branch:** `feature/phase-3-backend-usecase` (see section 2.1)

**Two gaps found while starting this phase, resolved before implementing (user confirmed both):**

1. **No credential storage existed.** `SECURITY.md`, `API_CONTRACT.md`, and
   `DATABASE_SCHEMA.md` each explicitly deferred "where passwords live" to
   "an implementation decision" made by one of the other two documents —
   a closed loop, never actually landed. The merged `users` table
   (migration `0002`) has no password column at all, by design. Resolved
   by adding migration `0007_add_user_password_hash` (`users.password_hash
   text NOT NULL DEFAULT ''`) and treating the login request's
   `identifier` field as the user's own `id` (no separate username/email
   column exists to use instead). `internal/auth/credentials.go` adds a
   `Credentials` type kept deliberately separate from `User` (never
   returned to API clients, matching the existing "no credentials in
   User" comment from Phase 1).
2. **No Unit-of-Work / cross-repository transaction pattern was
   documented** beyond the one explicit case (`DATABASE_ARCHITECTURE.md`
   section 6.4: resource delete + its audit record). Resolved with a
   small `transaction.Runner` interface
   (`internal/platform/transaction/transaction.go`) plus a context-based
   PostgreSQL implementation (`internal/repository/postgres/transactor.go`):
   `Transactor.WithinTx` begins a transaction and stores it on the
   context; every Phase 2 repository method now resolves its connection
   from the context first (`activeConn`), falling back to its own pool
   otherwise — so several repository calls made through the same context
   commit or roll back together, without any repository needing to know
   whether it's in a transaction. Live-tested:
   `TestTransactor_WithinTx_RollsBackOnFailure` proves a failure partway
   through a unit of work rolls back an earlier write in the same one, not
   just the failing call.

- [x] Implement `CreateResource` use case: validate → check ID uniqueness →
      persist → write audit record (`RESOURCE_CREATED`) (FR-001, BR-001,
      BR-016, BR-042, UC-06). (`georesponse-be/internal/resource/service.go`;
      ID uniqueness is enforced by the repository, per Phase 2 —
      `Create` returns `ErrIDConflict`, which the use case propagates
      unchanged, per `BACKEND_ERROR_HANDLING.md`'s single-translation-point
      rule.)
- [x] Implement `GetResource` use case (FR-003, UC-02).
- [x] Implement `ListResources` use case with search/filter/pagination
      (FR-002, FR-016–019, UC-01, UC-03, UC-04).
- [x] Implement `UpdateResource` use case: validate → persist → write
      resource-change-history record → write audit record
      (`RESOURCE_UPDATED`) (FR-004, BR-015, BR-017, UC-07). Status and
      location are always carried over from the current record rather
      than taken from the update input — those go through
      `ChangeResourceStatus`/`RelocateResource` instead, per the BR
      symmetry note.
- [x] Implement `DeleteResource` use case: check existence → delete → write
      audit record (`RESOURCE_DELETED`) (FR-005, BR-019, BR-021, UC-10).
      Delete and its audit record run inside one `Transactor.WithinTx`
      call, per `DATABASE_ARCHITECTURE.md` section 6.4.
- [x] Implement `ChangeResourceStatus` use case: validate status → persist →
      write status-history record → write audit record
      (`RESOURCE_STATUS_CHANGED`) (FR-011, FR-012, BR-006, BR-008, UC-08).
- [x] Unit-test that `ChangeResourceStatus` does **not** modify `location`
      (BR symmetry note in `API_CONTRACT.md` section 7.1).
      (`TestService_ChangeResourceStatus_DoesNotModifyLocation`, and
      asserts `RecordLocationChange` is never called.)
- [x] Implement `RelocateResource` use case: validate coordinates → update
      location → preserve identity/type/status → write location-history
      record → write audit record (`RESOURCE_RELOCATED`) (FR-023–026,
      BR-009–BR-014, UC-09).
- [x] Unit-test that `RelocateResource` preserves `id`, `type`, and `status`
      unchanged (BR-012, UC-09 "Invariants").
      (`TestService_RelocateResource_PreservesIdentityTypeStatus`.)
- [x] Implement `GetResourceHistory` use case, merging status/location/change
      history with the `type` filter (FR-034–037, UC-13).
      (`georesponse-be/internal/resourcehistory/service.go` — also checks
      the resource exists first, returning `resource.ErrNotFound` for a
      resource that was never created, distinct from one that exists but
      has no history yet.)
- [x] Implement `ListAuditRecords` use case with `userId`, `resourceId`,
      `operation`, `startTime`, `endTime` filters (FR-038–040, UC-14).
      (`georesponse-be/internal/audit/service.go`.)
- [x] Implement `Authenticate` (login) use case (FR-027–029, BR-022–024,
      UC-11). (`georesponse-be/internal/auth/service.go`. Both "no such
      user" and "wrong password" return the same `ErrInvalidCredentials`,
      so a caller cannot enumerate valid identifiers by response
      difference. On success, returns a token from `TokenSigner` — see
      next paragraph. Live-tested end-to-end against the seeded demo
      account, `database/seeds/0002_sample_auth.sql`: real login, wrong
      password rejected, token verified, `GetCurrentUser` round-trip —
      all via a throwaway `cmd/smoketest` binary, deleted after use.)
      **Also resolved: the authenticated-context mechanism itself**
      (BR-023) — `SECURITY.md` leaves "the exact token/session mechanism"
      undecided too. Implemented `TokenSigner`
      (`georesponse-be/internal/auth/token.go`) as a small interface with
      one implementation, `HMACTokenSigner`: a stateless, self-verifying
      signed token (user id + expiry + HMAC-SHA256 signature over a
      server secret) rather than a server-side session table, so no
      further schema change was needed. Chosen because it is the smallest
      change consistent with "an implementation decision" — a session
      table would need its own migration and cleanup story neither doc
      asks for.
- [x] Implement `Logout` use case (`API_CONTRACT.md` section 5.2).
      Since tokens are stateless and self-verifying, there is no
      server-side session record to delete; `Logout` is a documented
      no-op at the use-case layer; discarding the client's copy of the
      token (e.g. clearing a cookie) is the HTTP layer's responsibility
      (Phase 4).
- [x] Implement `GetCurrentUser` use case (FR-029).
- [x] Implement `ListRoles`, `CreateRole`, `UpdateRole`, `DeleteRole` use
      cases (FR-030, FR-033, BR-025, UC-12).
      (`georesponse-be/internal/authorization/service.go`. The exact
      permission codes required by each — `role.read`, `role.manage`,
      `permission.read` — are an implementation decision:
      `BUSINESS_RULES.md` fixes that authorization is role-based, BR-025,
      not a concrete permission set. `CreateRole`/`UpdateRole`/`DeleteRole`
      each record a `ROLE_CHANGED` audit entry, BR-028.)
- [x] Implement `ListPermissions` use case.
- [x] Implement `AssignRolePermissions` use case, writing an audit record
      (`PERMISSION_CHANGED`) (FR-033, BR-028).
- [x] Implement `AssignUserRoles` use case, writing an audit record
      (`ROLE_CHANGED`) (`API_CONTRACT.md` section 10.5, BR-028).
      (`georesponse-be/internal/auth/service.go`.)
- [x] Implement the authorization check (permission enforcement) as
      middleware or a use-case-level guard applied to every protected
      operation (FR-031, FR-032, BR-026, BR-027). Implemented as a
      use-case-level guard (`authorization.Service.Require`,
      `georesponse-be/internal/authorization/guard.go`), called first by
      every state-changing (and every read) use case in `resource`,
      `audit`, and `authorization` itself — not only relied on as HTTP
      middleware, so enforcement holds regardless of which layer a future
      caller might bypass (BR-026, BR-027). Each feature package declares
      its own narrow `PermissionChecker` interface rather than importing
      `authorization` directly, so `authorization.Service` satisfies all
      of them structurally without those packages depending on it (avoids
      `resource` → `authorization` → ... → `resource` import risk and
      keeps each package's tests independent of the others).
- [x] Unit-test that every state-changing use case returns an error — and
      performs no persistence — when validation fails (BR-018, BR-030,
      BR-042). Covered across
      `internal/resource/service_test.go` (`CreateResource` with a
      missing id, with invalid attributes, and with permission denied, all
      assert the repository's `Create` was never called;
      `ChangeResourceStatus`/`RelocateResource` with invalid input assert
      neither the repository write nor history/audit were reached;
      `DeleteResource` on a not-found id asserts no audit record was
      written), `internal/auth/service_test.go` (wrong password/unknown
      identifier never call `TokenSigner.Sign`; a failed `AssignUserRoles`
      writes no audit record), and
      `internal/authorization/service_test.go` (permission-denied
      `CreateRole`/`AssignRolePermissions` never call the repository).
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). Branch `feature/phase-3-backend-usecase`,
      PR #8 — CI passed, merged into `main`, branch deleted (remote and
      local).

---

## 7. Phase 4 — Backend HTTP Layer

**Branch:** `feature/phase-4-backend-http` (see section 2.1)

**Deviation from `BACKEND_ARCHITECTURE.md`'s illustrative package layout,
found and resolved while starting this phase:** that doc shows each
feature package (`internal/resource`, `internal/auth`, ...) owning its own
`handler.go`. But `internal/http/httpresponse.WriteError` (the doc's own
central error translator) must import `resource`/`auth`/`authorization`'s
sentinel errors to translate them — so any of those packages importing
`httpresponse` back to write a response would be an import cycle Go
rejects outright. Resolved by placing every handler and its DTOs directly
in `internal/http` (as `resource_handler.go`, `auth_handler.go`, etc.,
alongside `router.go`) instead of inside each feature package — this
changes only where handler code physically lives, not the dependency
direction `DEPENDENCY_RULES.md` requires (HTTP → use case → domain, never
reversed). `internal/http/middleware/auth.go`'s `RequireAuth` is placed
there for the identical reason, rather than in `internal/auth` as that
same doc's tree suggests.

**Two real bugs found and fixed via the live database exercise below,
both surfaced only by actually running the server, not by unit tests with
fakes:**

1. Every `resource.Service` method enforces `PermissionResourceRead` (or a
   write permission) even for `GetResource`/`ListResources` — but the
   router only put `middleware.RequireAuth` in front of the *mutating*
   `/resources` routes, leaving `GET` routes reachable without an
   authenticated context. An anonymous caller has no role names, so every
   read failed with `403 AUTHORIZATION_DENIED` regardless of the resource.
   Fixed by moving `r.Use(requireAuth)` to the whole `/resources` route
   group.
2. `DeleteResource` recorded its `RESOURCE_DELETED` audit entry *after*
   calling `repo.Delete` — but `audit_records.resource_id` has a foreign
   key to `resources(id)` (`ON DELETE SET NULL`), and PostgreSQL checks a
   foreign key immediately, not at commit, even inside the same
   transaction. Deleting the resource first meant the audit insert
   referenced a row that no longer existed, failing with SQLSTATE `23503`
   on every delete. Fixed by writing the audit record *before* the
   delete — its `resource_id` is still valid at insert time, and the
   delete that follows sets it to `NULL` via the same `ON DELETE SET NULL`
   any other resource-referencing audit record gets once its resource is
   deleted. Also fixed while testing this: the login cookie was
   hardcoded `Secure: true`, which a browser (and PowerShell's
   `WebRequestSession`) correctly refuses to send back over plain
   `http://localhost` — `AuthHandler` now takes a `secureCookie bool`
   (`cfg.AppEnv == "production"`), so local development over HTTP works
   and only a real HTTPS deployment gets the `Secure` flag.

Also found and fixed (Phase 3 gap, not Phase 4): `auth.Service
.AssignUserRoles` never called a permission guard at all — anyone could
reassign any user's roles. Added a `PermissionChecker` dependency to
`auth.Service` (same narrow-interface pattern already used in
`resource`/`audit`), requiring `authorization.PermissionRoleManage`
before `AssignUserRoles` proceeds.

- [x] Implement `POST /api/v1/auth/login` handler (FR-027, FR-028).
      (`auth_handler.go`.) Sets an HttpOnly, `SameSite=Lax` cookie
      (`Secure` in production only) carrying the signed token —
      API_CONTRACT.md leaves the transport undecided; this was the
      implementation decision (confirmed with the user), chosen over
      returning the token in the JSON body so the frontend never handles
      it directly.
- [x] Implement `POST /api/v1/auth/logout` handler. Clears the auth
      cookie; `auth.Service.Logout` itself is a documented no-op since
      tokens are stateless (Phase 3).
- [x] Implement `GET /api/v1/auth/me` handler (FR-029).
- [x] Implement `GET /api/v1/resources` handler with query-param parsing and
      pagination defaults (`page=1`, `pageSize=20`, max `100`) per
      `API_CONTRACT.md` section 3 (the envelope/pagination-meta shape
      itself is section 4 — `{"data": [...], "meta": {"page","pageSize",
      "total"}}`).
- [x] Implement `GET /api/v1/resources/{id}` handler, mapping "not found" to
      `404 RESOURCE_NOT_FOUND` (FR-051).
- [x] Implement `POST /api/v1/resources` handler with full request
      validation and `201` response, mapping duplicate ID to
      `409 RESOURCE_ID_CONFLICT`.
- [x] Implement `PUT /api/v1/resources/{id}` handler. Its request DTO has
      no `status`/`location` field: per the user's confirmed decision,
      those stay on `PATCH .../status` and `PATCH .../location` instead,
      matching `resource.Service.UpdateResource`'s existing (Phase 3)
      behavior of always keeping the current record's status/location
      regardless of what's sent — API_CONTRACT.md's prose suggesting PUT
      can also update them was not followed, to avoid touching already-
      merged, already-tested Phase 3 logic.
- [x] Implement `DELETE /api/v1/resources/{id}` handler returning `204`.
      (Live-tested end-to-end after the audit-ordering fix above.)
- [x] Implement `PATCH /api/v1/resources/{id}/status` handler, mapping
      invalid status to `400 INVALID_RESOURCE_STATUS`.
- [x] Implement `PATCH /api/v1/resources/{id}/location` handler, mapping
      invalid coordinates to `400 INVALID_LOCATION`.
- [x] Implement `GET /api/v1/resources/{id}/history` handler with the
      `type`/`page`/`pageSize` query params. API_CONTRACT.md's example
      response for this endpoint has no `meta`/pagination block despite
      documenting `page`/`pageSize` params; none was added here either,
      matching the documented example exactly rather than inventing one.
- [x] Implement `GET /api/v1/roles`, `POST /api/v1/roles`,
      `PUT /api/v1/roles/{id}`, `DELETE /api/v1/roles/{id}` handlers.
      (`authorization_handler.go`. No example request/response JSON exists
      in API_CONTRACT.md section 10 for any of these; the DTOs here are
      grounded directly in the `authorization.Role`/`Permission` domain
      types instead.)
- [x] Implement `GET /api/v1/permissions` handler.
- [x] Implement `PUT /api/v1/roles/{id}/permissions` handler.
- [x] Implement `PUT /api/v1/users/{id}/roles` handler. **Found and fixed
      the missing-permission-guard bug in `auth.Service.AssignUserRoles`
      described above while wiring this handler.**
- [x] Implement `GET /api/v1/audit-logs` handler with its filters and
      pagination.
- [x] Implement the centralized error-to-HTTP translation
      (`BACKEND_ERROR_HANDLING.md`) covering every error code in
      `API_CONTRACT.md` section 13. (`internal/http/httpresponse/error.go`
      — every one of the 9 documented codes is mapped, including
      `RESOURCE_ID_CONFLICT`, which `BACKEND_ERROR_HANDLING.md`'s own
      illustrative mapping table omits despite it being in
      `API_CONTRACT.md` section 13.) Also added `httpresponse
      .ValidationError` (a field-level validation error type with a
      `Details()` method, per that doc's illustrative
      `errors.As(err, &validationErr)` usage — no concrete shape for it
      exists in either doc, so `[]FieldError{Field, Message}` was chosen)
      and `httpresponse.DecodeJSON` (rejects unknown fields, wraps a
      decode failure as a `ValidationError`).
- [x] Implement panic-recovery middleware mapping unexpected panics to
      `500 PERSISTENCE_ERROR`-shaped responses without leaking internals
      (FR-053, BR-018). Replaced the Phase 0 alias to Chi's built-in
      `Recoverer` (a plain-text body) with a local implementation
      (`internal/http/middleware/recovery.go`) that emits the same JSON
      error envelope as every other error, per
      `BACKEND_ERROR_HANDLING.md`'s own illustrative `Recovery` example.
- [x] Implement a `GET /health` endpoint for `DEPLOYMENT.md`'s health-check
      contract. Rewrote the Phase 0 placeholder (`200 OK`, plain-text
      `"OK"`, no real check) to return
      `{"status": "ok", "database": "ok"}` / `503` +
      `{"status": "unavailable", "database": "unavailable"}` based on an
      actual `pool.Ping(ctx)`, matching `DEPLOYMENT.md` section 6.
- [x] Write `httptest`-based handler tests for every endpoint above,
      covering the success path and at least one documented failure path
      each (`BACKEND_TESTING.md`). 30 tests across
      `resource_handler_test.go`, `auth_handler_test.go`,
      `authorization_handler_test.go`, `audit_handler_test.go`,
      `resourcehistory_handler_test.go`, and `router_test.go`, each
      constructing the real `*Service` for its feature against
      hand-written fakes (same pattern as every feature package's own
      Phase 3 `service_test.go`), so these tests exercise real handler +
      real service + real error-translation code, with only persistence
      faked. `go test ./...` passes both with and without `DATABASE_URL`
      set (no test here depends on a live database).
- [x] Manually exercise the full API surface with a REST client (or `curl`)
      against the local database and confirm every endpoint in
      `API_CONTRACT.md` behaves as documented. **Live-tested** against the
      `georesponse-db` Docker container and the seeded demo account
      (`database/seeds/0002_sample_auth.sql`): login → `/me` → list/get/
      create/update/change-status/relocate/history/delete resources →
      roles/permissions/audit-logs → logout, plus failure paths (wrong
      password → 401, duplicate id → 409, invalid status → 400, invalid
      location → 400, unauthenticated write → 401, not-found → 404) — all
      confirmed via a real `go build`'d server against the live database,
      not `go run`'s illustrative wiring. This live exercise is what
      surfaced both real bugs described above; a REST client alone
      (without also running the actual server against a real database)
      would not have caught either one.
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). Branch `feature/phase-4-backend-http`.
      CI initially failed `gofmt -l` on two files
      (`internal/http/middleware/middleware.go`,
      `internal/platform/config/config.go`) whose second Changelog entry
      used inconsistent bullet indentation relative to the block comment's
      tab-indented Description continuation — a real issue (reproducible
      on CI's Linux runner), not the pre-existing Windows-checkout CRLF
      artifact this repo otherwise tolerates. Fixed and pushed; CI passed;
      merged into `main`, branch deleted (remote and local).

---

## 8. Phase 5 — Frontend Foundation

**Branch:** `feature/phase-5-frontend-foundation` (see section 2.1)

**Gap found and resolved (confirmed against the actual, already-merged
backend rather than the docs alone, since `SECURITY.md`/`API_CONTRACT.md`
both explicitly leave the token transport undecided):** the backend
(Phase 4) authenticates via an HttpOnly cookie set on
`POST /api/v1/auth/login`, not a bearer token the frontend stores itself.
`httpClient` sends `credentials: "include"` on every request so that
cookie is always attached; there is nothing for the frontend to store,
read, or attach to headers itself. No global 401-redirect interceptor was
added — neither `API_CONTRACT.md` nor `SECURITY.md` prescribes one, and
with only one authenticated view (`AppShell`) so far, `App.tsx` re-running
its own `GET /auth/me` query after any mutation invalidation is sufficient
(a dedicated interceptor would be revisited if/when more protected routes
exist in Phase 6).

- [x] Implement the API client module (`api/` or equivalent) wrapping
      `fetch`, base URL from `API_BASE_URL` env var, and the
      `{data}`/`{data, meta}`/`{error}` envelope parsing from
      `API_CONTRACT.md` section 4. (`src/api/httpClient.ts` +
      `httpClient.types.ts` — the only file in the codebase that calls
      `fetch`; throws a typed `ApiError{code, status, message, details}`
      on any non-2xx or network failure. Covered by
      `httpClient.test.ts`.)
- [x] Configure TanStack Query's `QueryClient` and provider at the app root.
      (`src/main.tsx`.)
- [x] Implement the Map Adapter boundary (`MapAdapter` interface + MapLibre
      GL JS implementation) per `FRONTEND_ARCHITECTURE.md` section on the
      Map Adapter — no other component may import MapLibre directly.
      (`src/components/resource-map/map-adapter/{MapAdapter.types.ts,
      MapAdapter.ts}`; `ResourceMap.tsx` depends only on the interface.
      `FRONTEND_ARCHITECTURE.md` describes the adapter's responsibilities
      in prose, not a concrete TypeScript interface, so the exact method
      set — `init`, `setMarkers`, `selectMarker`, `destroy` — is this
      phase's own design, grounded in that prose.)
- [x] Implement the resource query-key factory (`resourceKeys.ts`) per
      `FRONTEND_STATE.md`. (`src/api/resources/resourceKeys.ts`, matching
      that doc's example pattern verbatim; `resourceApi.ts` and
      `resourceApi.types.ts` alongside it implement the actual
      `/api/v1/resources` calls the keys will be used against in
      Phase 6.)
- [x] Implement the base app shell/layout (map-first layout per
      `FRONTEND_UI_UX.md`). (`src/components/app-shell/AppShell.tsx` — top
      bar, resource-list panel region, and the map region wired to a live
      (if currently empty) `ResourceMap`; the detail-panel region and the
      list panel's real content are Phase 6.)
- [x] Implement authentication state handling (login form, stored
      authenticated context, route guarding for protected views) per
      UC-11 and `SECURITY.md`. The "stored authenticated context" is the
      `GET /api/v1/auth/me` TanStack Query cache, not a client-side store
      — the authenticated user is server state per `FRONTEND_STATE.md`'s
      boundary, so `hooks/useCurrentUser.ts` is the single source of
      truth `App.tsx` (route guarding), `AppShell.tsx` (top bar), and
      Phase 6 code can all read. `components/login-form/` implements the
      login screen (`LoginForm.tsx` + `useLoginForm.ts` container hook);
      `hooks/useLogin.ts`/`useLogout.ts` implement the mutations. Covered
      by `LoginForm.test.tsx` (submit flow, server error display).
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). Branch `feature/phase-5-frontend-foundation`,
      PR #10. Also folded into this PR: a common/ UI component library
      (Button, Alert, Dropdown, SearchableDropdown, Modal, MoveableModal,
      Tooltip, DotLoading, InputValidation) adapted from a prior personal
      project for Phase 6's use, a LoginForm restyle using it, and a
      backend CORS fix (the frontend's `credentials: "include"` requests
      were silently blocked without it). CI caught real bugs across four
      rounds before going green: ESLint errors (`react/display-name`,
      `no-require-imports`), TypeScript errors (two pre-existing Phase 5
      files importing `resource.types` through the `@types/*` alias hit
      TS6137; several adapted test files never actually ran before — they
      used bare `jest.*` calls and no test globals were enabled), and a
      runtime-only failure (`require("./colors")` doesn't resolve a `.ts`
      file under Node, only under Vitest's own `import` handling). Merged
      into `main`, branch deleted (remote and local).

---

## 9. Phase 6 — Frontend Feature Implementation

**Branch:** `feature/phase-6-frontend-features` — or one
`feature/phase-6-<subfeature>` branch per 9.1–9.11 sub-section below, merged
individually as each feature completes (see section 2.1).

### 9.1 Resource List & Map (FR-002, FR-020, UC-01, UC-05)

- [x] Implement `useResources` hook (TanStack Query, calls
      `GET /api/v1/resources`). (`src/hooks/useResources.ts`, covered by
      `useResources.test.ts`.)
- [x] Implement `ResourceList` component (rendering identity, type, status,
      location per FR-002). (`src/components/resource-list/ResourceList.tsx`
      — name, type, a status badge, and a lat/lng cue per row, using the new
      shared `src/constants/resourceStatus.constants.ts` mapping so list,
      map marker, and (later) detail panel never disagree on a status's
      color, per `FRONTEND_UI_UX.md` section 7. Added the "info"
      (blue/informational) color role to `StatusIndicator`/`colors.ts` for
      `IN_USE`, which the adapted palette didn't have.)
- [x] Implement the map view rendering resource markers from `useResources`
      via the Map Adapter (FR-020). (`AppShell.tsx` now calls `useResources`
      once and derives `MapMarker[]` — including each marker's status
      color — passed to `ResourceMap`. `MapAdapter.types.ts`/`MapAdapter.ts`
      gained `MapMarker.color`, painted via a data-driven `circle-color`
      expression, without the adapter needing to know the `Resource`
      domain type. List/map selection is now shared in both directions
      (`FRONTEND_UI_UX.md` section 3): `AppShell` owns `selectedResourceId`
      client state; `ResourceMap` gained a `selectedResourceId` prop synced
      to the adapter's existing `selectMarker`.)
- [x] Implement the empty state for zero resources (UC-01 alternative flow).
      (`ResourceList`, covered by `ResourceList.test.tsx`.)
- [x] Implement the error state for a failed list fetch (UC-01 alternative
      flow). (`ResourceList`, message derived from `error.code` via the new
      `src/utils/apiErrorMessage.ts` — reusable by later 9.x error states —
      with a retry action, covered by `ResourceList.test.tsx`.)
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). PR #11 (`feature/phase-6-resource-list-map`)
      merged into `main` (squash commit `298dddf`); branch deleted (remote
      and local). CI initially failed one test (`ResourceList`'s skeleton
      test used `getAllByRole("listitem")`, which Testing Library's default
      accessibility-tree filtering can't see through the skeleton's
      intentional `aria-hidden` — fixed by querying it via `data-testid`
      instead); fixed and re-pushed, then green.

### 9.2 Search & Filter (FR-016–019, UC-03, UC-04)

- [x] Implement the search input wired to the `search` query param.
      (`src/components/resource-filter-bar/ResourceFilterBar.tsx`, debounced
      300ms via the new `src/hooks/useDebouncedValue.ts` before it reaches
      `filters.search`, per `FRONTEND_UI_UX.md` section 4.)
- [x] Implement the type-filter control wired to the `type` query param.
      (`ResourceFilterBar`, a closed `Dropdown` populated from
      `RESOURCE_TYPE_LABEL`'s fixed enum, not free text; changes `filters`
      immediately, no debounce — a selection is a discrete action.)
- [x] Implement the status-filter control wired to the `status` query param.
      (`ResourceFilterBar`, same pattern, populated from
      `RESOURCE_STATUS_CONFIG`.)
- [x] Verify combined filters narrow results correctly (FR-019, BR-045).
      By construction rather than a live run (no Node/npm locally, see
      below): `AppShell` holds one `ResourceFilters` object as client state;
      every control folds its change onto that same object
      (`{...filters, <field>: ...}`) rather than replacing it, and both
      `ResourceList` and the map's own `useResources` call read that one
      object, so a combined search+type+status query is always a single
      `GET /resources?search=...&type=...&status=...` call — combining
      filters server-side is BR-045/the backend's job (already implemented
      in Phase 3/4). Covered by `ResourceFilterBar.test.tsx`'s "merged onto
      the existing filters" cases.
- [x] Implement empty-state messaging for "no results match" distinct from
      "no resources exist" (UC-03/UC-04 alternative flows). (`ResourceList`,
      based on whether any of `filters.search`/`type`/`status` is set;
      covered by `ResourceList.test.tsx`.)
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). PR #12 (`feature/phase-6-search-filter`)
      merged into `main` (squash commit `28b3f12`); branch deleted (remote
      and local). CI initially failed two `ResourceFilterBar` tests
      (jsdom doesn't implement `scrollIntoView`, which `Dropdown` calls when
      opening with a pre-selected option — fixed by mocking it, the same
      workaround `Dropdown.test.tsx`/`SearchableDropdown.test.tsx` already
      use); fixed and re-pushed, then green.

### 9.3 Resource Detail (FR-003, FR-021, UC-02)

- [x] Implement `useResource(id)` hook. (`src/hooks/useResource.ts`,
      `enabled: id !== null` so it stays idle until a resource is selected;
      covered by `useResource.test.ts`.)
- [x] Implement the `ResourceDetail` panel (identity, type, attributes,
      status, location). (`src/components/resource-detail/ResourceDetail.tsx`
      — attribute keys have no fixed display label per
      `DATA_CONTRACT.md` section 3.4, so they're humanized generically
      (`vehicleType` -> "Vehicle Type"). `updatedAt` (also listed in
      `FRONTEND_UI_UX.md` section 5) is left out: the backend's
      `resourceResponse` DTO (`georesponse-be/internal/http/resource_handler.go`)
      doesn't return it yet even though the domain model
      (`resource.go`'s `UpdatedAt`) and `DATA_CONTRACT.md` section 3.1 both
      have it — a backend gap, out of this frontend phase's scope, noted
      here rather than silently worked around.)
- [x] Wire map-marker selection to open the detail panel (FR-021, UC-05
      step 5). (`AppShell` now renders `ResourceDetail` whenever
      `selectedResourceId` is set; that state was already fed by both
      `ResourceMap`'s `onResourceSelect` and `ResourceList`'s row clicks
      since section 9.1, so this is what makes the existing selection
      actually open the panel.)
- [x] Implement the "resource not found" state (UC-02 alternative flow).
      (`ResourceDetail`, distinct message when `error.code` is
      `RESOURCE_NOT_FOUND` vs. the generic error-code-derived message for
      anything else; covered by `ResourceDetail.test.tsx`.)
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). PR #13 (`feature/phase-6-resource-detail`)
      merged into `main` (squash commit `863b157`); branch deleted (remote
      and local). CI initially failed one `useResource` test (the mocked
      `resourceApi.get`'s call history leaked from the first test into the
      second, which asserted it was never called — fixed with a
      `beforeEach(() => vi.mocked(resourceApi.get).mockClear())`); fixed
      and re-pushed, then green.

### 9.4 Create Resource (FR-001, FR-006–009, FR-013–015, UC-06)

- [x] Implement the create-resource form with fields for id, name, type,
      status, type-specific attributes, and location.
      (`src/components/resource-create-form/` — `ResourceCreateForm.tsx`
      (presentation) + `useResourceCreateForm.ts` (state via a reducer, a
      multi-field transition per `FRONTEND_STATE.md` section 3) +
      `CreateResourceModal.tsx` (wraps it in the shared `Modal`). Attribute
      fields are driven by the new
      `src/constants/resourceAttributeSchema.constants.ts`, mirroring the
      backend's per-type attribute validators
      (`georesponse-be/internal/resource/attribute_validator_*.go`).
      Opened from a new "+ New Resource" button in `AppShell`'s list panel.
      **Scope note**: location is typed latitude/longitude, not picked by
      clicking the map — `FRONTEND_UI_UX.md` section 6 also describes
      map-click placement, deferred since the Map Adapter's
      `onMarkerClick` is currently wired only to marker selection, not
      blank-map placement.)
- [x] Implement frontend validation mirroring `API_CONTRACT.md` section 12
      (non-authoritative, UX-only). (`validateResourceForm.ts`, covered by
      `validateResourceForm.test.ts`.)
- [x] Implement the `useCreateResource` mutation, invalidating the resource
      list query on success (`FRONTEND_STATE.md`). (`src/hooks/useCreateResource.ts`,
      covered by `useCreateResource.test.ts`.)
- [x] Implement field-level error display from the backend's `details`
      array on `VALIDATION_ERROR`/`RESOURCE_ID_CONFLICT` responses
      (FR-043). (New `src/utils/mapValidationError.ts`, reusable by later
      resource forms (e.g. 9.5's update form), not just this one — covered
      by `mapValidationError.test.ts`. **Known backend gap, not silently
      worked around**: `georesponse-be/internal/http/httpresponse/error.go`
      currently sends `details: nil` for every domain validation failure
      (missing/invalid attribute, invalid type/status/location) — only a
      malformed JSON body (`details: [{field: "", ...}]`) actually
      populates the array today, and even that never sets `field`. This
      function still implements the array-mapping in full and needs no
      changes once the backend starts attaching per-field details to
      domain errors too; in the meantime, most validation failures surface
      as a form-level message instead of under a specific field. Field-name
      conventions for nested paths (`location.latitude`,
      `attributes.<key>`) are this frontend's own assumption, since nothing
      currently emits them to confirm against.)
- [x] Verify the newly created resource appears in the list and on the map
      without a manual page refresh (UC-06 step 8). By construction rather
      than a live run (no Node/npm locally, see below): `AppShell`'s own
      `useResources(filters)` call (which both `ResourceList` and the map's
      markers are derived from) shares its TanStack Query cache entry with
      `useCreateResource`'s `resourceKeys.lists()` invalidation, so a
      successful create refetches that same cache entry automatically.
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). PR #14 (`feature/phase-6-create-resource`)
      merged into `main` (squash commit `6e1a77f`); branch deleted (remote
      and local). CI passed on the first push.

### 9.5 Update Resource (FR-004, UC-07)

- [x] Implement the update-resource form, pre-filled from
      `GET /api/v1/resources/{id}`. (`src/components/resource-update-form/`
      — `ResourceUpdateForm.tsx` (presentation) + `useResourceUpdateForm.ts`
      (state via a reducer, pre-filled from the resource by
      `createResourceUpdateFormState`) + `UpdateResourceModal.tsx` (fetches
      via `useResource(id)`, handles its loading/error states, and only
      mounts the form once the resource is available). Opened via a new
      "Edit" button in `ResourceDetail` (the edit action
      `FRONTEND_UI_UX.md` section 5 describes). Extracted the attribute-field
      validation shared with the create form into
      `src/utils/validateResourceAttributes.ts` rather than duplicating it.
      **Scope note, matching the create form's own boundary**: this form
      covers name/type/attributes only — status has its own dedicated
      control (section 9.6) and location its own dedicated relocate flow
      (section 9.7, per `API_CONTRACT.md` section 6.4's own boundary
      between a general update and a relocation), so this form doesn't
      duplicate either.)
- [x] Implement the `useUpdateResource` mutation, invalidating the
      resource-detail and list queries. (`src/hooks/useUpdateResource.ts`,
      covered by `useUpdateResource.test.ts`.)
- [x] Verify identity is preserved in the UI after update (BR-015). `id`
      isn't a field `ResourceUpdateFormState` even has — it's shown
      read-only, never submitted — so there's no code path that could
      change it; covered by `UpdateResourceModal.test.tsx`'s pre-fill test
      (asserts the id renders as text, not as any input's value) and its
      submit test (asserts the id is absent from the update payload).
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). PR #15 (`feature/phase-6-update-resource`)
      merged into `main` (squash commit `da1a863`); branch deleted (remote
      and local). CI passed on the first push.

### 9.6 Change Status (FR-010–012, UC-08)

- [x] Implement the status-change control (e.g., a dropdown or
      `StatusIndicator`-driven selector) on the detail panel.
      (`ResourceDetail.tsx` — replaced the static status display with a
      `Dropdown` constrained to the four valid statuses, next to the same
      color indicator dot the list row uses. Also extracted
      `RESOURCE_STATUS_OPTIONS`/`RESOURCE_TYPE_OPTIONS` into
      `resourceStatus.constants.ts` and pointed `ResourceFilterBar`,
      `ResourceCreateForm`, and `ResourceUpdateForm` at them, since all
      three — now four, with this one — had been rebuilding the identical
      `Object.keys(...).map(...)` independently.)
- [x] Implement the `useChangeResourceStatus` mutation.
      (`src/hooks/useChangeResourceStatus.ts` — invalidates
      `resourceKeys.detail(id)`, `resourceKeys.lists()`, and
      `resourceKeys.history(id)` per `FRONTEND_STATE.md` section 6's table.)
- [x] Verify the status badge updates across list, detail, and map views
      after a successful change. By construction rather than a live run
      (no Node/npm locally, see below): the detail panel reads
      `resource.status` straight from `useResource`'s cache entry, which
      `useChangeResourceStatus`'s `resourceKeys.detail(id)` invalidation
      refetches; the list and map both derive from `AppShell`'s
      `useResources(filters)` call, which the same mutation's
      `resourceKeys.lists()` invalidation refetches — and both read
      `RESOURCE_STATUS_CONFIG` for their color, the same mapping the detail
      panel's indicator dot uses, so the color can't disagree between
      views once the shared cache updates. Covered by
      `ResourceDetail.test.tsx`'s status-change tests.
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). PR #16 (`feature/phase-6-change-status`)
      merged into `main` (squash commit `2d4b7ae`); branch deleted (remote
      and local). CI passed on the first push.

### 9.7 Relocate Resource (FR-022–026, UC-09)

- [x] Implement the relocation interaction (e.g., drag the marker on the
      map, or a "set new location" control) per `FRONTEND_UI_UX.md`.
      (`src/components/resource-relocate-form/RelocateResourceControl.tsx`
      — a "set new location" control on the detail panel's Location field.
      **Chose this over dragging the map marker**: `ResourceMap` renders
      resources through a GeoJSON source + circle layer
      (`map-adapter/MapAdapter.ts`), not `maplibregl.Marker` DOM elements,
      so native drag support isn't available without substantial adapter
      rework — out of scope for this sub-phase; gets the same UC-09
      outcome without it. Extracted the latitude/longitude range checks
      the create form already had into `src/utils/validateLocation.ts`,
      shared by both forms, rather than duplicating them here.)
- [x] Implement the `useRelocateResource` mutation.
      (`src/hooks/useRelocateResource.ts` — applies an optimistic update
      per `FRONTEND_STATE.md` section 7, which names relocation as
      exactly this case ("dragging a marker should feel immediate"): the
      cached detail and every matching list query move to the new
      location on `onMutate`, roll back on error, and
      `resourceKeys.detail(id)`/`lists()`/`history(id)` are invalidated
      on `onSettled` either way so the cache converges with the backend.
      Covered by `useRelocateResource.test.ts`.)
- [x] Verify the marker moves to the new position on the map immediately
      after a successful relocation (FR-022, UC-09 step 7). More than
      "after" — the optimistic update above moves it before the backend
      even confirms. The map's markers are derived from `AppShell`'s
      `useResources(filters)` call, which shares the exact list cache
      entries `useRelocateResource` optimistically updates, so there is
      no separate map-specific wiring needed for this. Covered by
      `useRelocateResource.test.ts`'s optimistic-update assertions and
      `ResourceDetail.test.tsx`'s relocate-control tests.
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). PR #17 (`feature/phase-6-relocate-resource`)
      merged into `main` (squash commit `85cb134`); branch deleted (remote
      and local). CI initially failed a typecheck error in
      `useRelocateResource.test.ts` (a Promise executor's `resolve` was
      assigned to a variable typed `(value: unknown) => void`, which its
      more specific inferred type can't satisfy — parameter types are
      contravariant; fixed with a definite-assignment-asserted, precisely
      typed declaration instead); fixed and re-pushed, then green.

### 9.8 Delete Resource (FR-005, UC-10)

- [x] Implement the delete confirmation dialog (UC-10 step 2).
      (`src/components/resource-delete-confirmation/DeleteResourceConfirmation.tsx`
      — built on the shared `Modal` component, whose Cancel/Confirm
      buttons are exactly this pattern; cancelling just calls `onClose`,
      no mutation involved, per UC-10's alternative flow. Opened via a new
      "Delete" button in `ResourceDetail`, which passes the already-loaded
      `Resource` itself to `onDelete` so the dialog can show its name
      without depending on the possibly-filtered list containing it.)
- [x] Implement the `useDeleteResource` mutation, invalidating the resource
      list query. (`src/hooks/useDeleteResource.ts` — also removes
      `resourceKeys.detail(id)` from the cache entirely per
      `FRONTEND_STATE.md` section 6's table, rather than just invalidating
      it, since a deleted resource has nothing to refetch. Covered by
      `useDeleteResource.test.ts`.)
- [x] Verify the resource disappears from the list and the map immediately
      after successful deletion, and remains unchanged if the confirmation
      is cancelled (UC-10 alternative flow). The map's markers derive from
      `AppShell`'s `useResources(filters)` call, which shares the exact
      list cache entry `useDeleteResource`'s `resourceKeys.lists()`
      invalidation refetches, so no separate map-specific wiring was
      needed. `AppShell` also closes the detail panel itself
      (`setSelectedResourceId(null)`) once deletion succeeds, since the
      resource it was showing no longer exists. Covered by
      `DeleteResourceConfirmation.test.tsx`'s cancel/confirm cases.
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). PR #19 (`feature/phase-6-delete-resource`)
      merged into `main` (commit `7674f52`); branch deleted (remote and
      local). Landed alongside an out-of-band contribution merged in
      between (#18, a BMKG GeoHotspot situational-awareness overlay from
      another session, rebased onto this phase's work and merged first).
      CI failed twice before going green: PR #18's backend job caught
      `gofmt` issues in 3 new files (fixed); this PR's frontend typecheck
      then caught a `hotspotLayerVisible` state declaration dropped by a
      `main`-into-branch merge (fixed with a follow-up commit) once #18
      had landed on `main` ahead of it.

### 9.9 Resource History (FR-034–037, UC-13)

- [x] Implement `useResourceHistory(id)` hook. (`src/hooks/useResourceHistory.ts`,
      covered by `useResourceHistory.test.ts`.)
- [x] Implement the history view (status/location/change tabs or sections).
      (`src/components/resource-history/ResourceHistoryView.tsx`, using the
      shared `Tabs` component, tab selection as local client state per
      `FRONTEND_STATE.md` section 3. Each entry shows what changed, when,
      and by whom when available, per `FRONTEND_UI_UX.md` section 5.
      Toggled open/closed from a new "Show history"/"Hide history" control
      in `ResourceDetail`.)
- [x] Implement the empty-history state. (Per category — "No status
      changes yet.", "No relocations yet.", "No other changes yet." —
      rather than one blanket empty state, since a resource can have
      history in one category and none in another. Covered by
      `ResourceHistoryView.test.tsx`.)

Committed directly to `main` (per updated workflow direction — no more
per-sub-phase branches/PRs from here on; `main` is worked on directly and
kept as the single up-to-date branch). Not yet verified with
typecheck/lint/build/test: this environment has no Node.js/npm available
(Go is available and was used to verify the BMKG backend fix earlier in
this phase, but no equivalent frontend toolchain).

### 9.10 Authorization & Administration (FR-030–033, UC-12)

- [x] Implement the roles/permissions management view, restricted to users
      with the required permission. (`src/components/role-management/`
      — `RoleManagementModal.tsx` fetches roles/permissions and gates the
      view; `RolePermissionsMatrix.tsx` is a role x permission checkbox
      grid, each toggle immediately calling the new
      `useSetRolePermissions` mutation (self-saving, same pattern as
      `ResourceDetail`'s status Dropdown). New `authorizationApi`/
      `authorizationKeys`/`useRoles`/`usePermissions` for `GET /api/v1/roles`
      and `GET /api/v1/permissions`. `httpClient` gained `putNoContent`
      for these 204-returning endpoints — `put()` claimed a `DataEnvelope<T>`
      a 204 response never has. Opened via a new "Manage Roles" button in
      `AppShell`.)
- [x] Implement the user-role assignment control.
      (`UserRoleAssignmentControl.tsx` + new `useSetUserRoles`, for
      `PUT /api/v1/users/{id}/roles`. **Known backend gap, not silently
      worked around**: the user is identified by typing their id, not
      picked from a list — there is no `GET /api/v1/users` (or
      equivalent) endpoint anywhere in `API_CONTRACT.md` section 10 or
      the backend to enumerate users, only `PUT /api/v1/users/{id}/roles`
      itself. A real user picker is blocked on that gap.)
- [x] Verify a caller without permission is redirected/blocked rather than
      shown the management UI (FR-032, BR-027). `GET /api/v1/roles` and
      `GET /api/v1/permissions` are themselves permission-gated
      (`role.read`/`permission.read` respectively, confirmed in
      `georesponse-be/internal/authorization/service.go`), so
      `RoleManagementModal` treats an `AUTHORIZATION_DENIED` response from
      either as "blocked" and renders that instead of the management UI —
      there's no other way to know a caller's permissions in advance,
      since `GET /api/v1/auth/me` returns role names, not permission
      codes. Covered by `RoleManagementModal.test.tsx`'s blocked-state test.

Committed directly to `main`. This section's work was interleaved with a
concurrent, unrelated `ResourceDetail`/`AppShell` restyle from another
session working in the same shared directory (per the new direct-to-main
workflow, no worktree isolation) — reconstructed a clean split so this
commit contains only the 9.10 work, leaving their in-progress restyle
uncommitted on disk for them to commit separately. Not yet verified with
typecheck/lint/build/test: this environment has no Node.js/npm available.

### 9.11 Audit Trail (FR-038–040, UC-14)

- [x] Implement `useAuditLogs` hook with filter controls.
      (`src/hooks/useAuditLogs.ts` for `GET /api/v1/audit-logs`; filter
      controls — userId/resourceId text inputs, an operation `Dropdown`
      from the fixed operation set — live in `AuditLogModal.tsx` as local
      client state, reflected in the query key per `FRONTEND_STATE.md`
      section 5 so each filter combination caches independently.)
- [x] Implement the audit-log view, restricted to authorized users.
      (`src/components/audit-log/AuditLogModal.tsx`. `GET /api/v1/audit-logs`
      is itself permission-gated (`audit.read`, confirmed in
      `georesponse-be/internal/audit/service.go`), so an
      `AUTHORIZATION_DENIED` response is how this detects the caller lacks
      access and blocks the view — same pattern as `RoleManagementModal`
      for §9.10. Opened via a new "Audit Trail" button in `AppShell`.)
- [x] Implement the empty-state and error-state for the audit view.
      ("No audit records match the current filters." when the list is
      empty; a distinct blocked message for `AUTHORIZATION_DENIED` vs. the
      generic error-code-derived message for anything else. Covered by
      `AuditLogModal.test.tsx`.)

Committed directly to `main`. This closes out Phase 6 (all of sections
9.1-9.11). Not yet verified with typecheck/lint/build/test locally: this
environment has no Node.js/npm available — CI on `main` is the real
verification (as it has been for every push this phase).

---

## 10. Phase 7 — Testing Completion

**Branch:** `feature/phase-7-testing` (see section 2.1). Committed directly
to `main` in focused commits (as Phase 6's closing work was), since the
remaining phases were completed in one sitting after the deadline had
passed.

- [x] Reach the coverage expectations in `TESTING_STRATEGY.md` for
      validation logic, domain rules, and the relocation/status-change
      side effects (both frontend and backend). Backend: every attribute
      validator, location validation, status transitions, and the
      service-level relocate/status-change side effects have unit tests
      (`go test ./...` passes; config start-up validation added with its
      own table test in Phase 8). Frontend: `validateResourceForm`,
      `validateResourceUpdateForm`, `validateLocation`, the Map Adapter
      boundary, and the feature components have colocated Vitest tests
      (verified by CI on `main`, not re-run locally in this session).
      Coverage is judged by the section 6 "must always be tested" list,
      not a numeric threshold, per `TESTING_STRATEGY.md` section 9.
- [x] Write at least one integration test under `tests/integration/`
      exercising create → update → relocate → delete against a real
      backend + database (per `TESTING_STRATEGY.md`). Done:
      `tests/integration/golden_path_test.go` (its own Go module; black-box
      HTTP against `GEORESPONSE_API_URL`, skipped when unset) covers the
      lifecycle with persisted-state checks after each step, the history
      side effects, the documented error contract (401/400/404/409 codes),
      and read-only-account authorization denial. Compiles and vets
      (`go vet ./...`); wired into `scripts/dev/test.sh`/`.ps1` and into
      CI as the `integration` job (PostGIS service container + backend
      started with `APP_ENV=development`). **Not yet run against a live
      stack in this environment** — the Docker stack run was skipped at the
      operator's request (section 11.2); CI on the next push is the
      verification.
- [x] Write at least one end-to-end test under `tests/e2e/` covering the
      golden path: view resources on map → create → update → relocate →
      delete. Done: `tests/e2e/golden-path.spec.ts` (Playwright, Chromium,
      against `E2E_BASE_URL`), with `playwright.config.ts`, `package.json`,
      and `tests/README.md`. **Not executed** — no Playwright/browser
      toolchain was available; run it locally against `./run.sh` per
      `tests/README.md`. Deliberately not a CI stage (`CI_CD.md` 4.3).
- [x] Run the full test suite (`scripts/dev/test.sh`) and confirm all tests
      pass. Backend half run locally: `go test ./...` in `georesponse-be/`
      passes (incl. the new config and migration-runner tests, the latter
      against the live `georesponse-db` container). Frontend half: last
      verified by CI on `main` (Node.js not on this shell's PATH).
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). Committed directly to `main` and
      pushed (no PR — see the Phase 7 branch note); CI on `main` is green
      including the new `integration` job:
      https://github.com/MahardikaPratama/georesponse/actions/runs/35463744686.

---

## 11. Phase 8 — Containerization & Local Orchestration

**Branch:** `chore/phase-8-containerization` (see section 2.1). Committed
directly to `main` (see Phase 7 note).

### 11.1 Environment & Secrets

- [x] Create root `.env.example` documenting the compose-level variables
      (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `APP_ENV`,
      `HTTP_PORT`, `LOG_LEVEL`, `API_BASE_URL` — no `VITE_` prefix, since
      the frontend build tool is Rspack, not Vite) per
      `ENVIRONMENT_MANAGEMENT.md` section 6, with obviously-fake local-dev
      placeholder values — never a real secret. **Done early** (ahead of
      Phase 8), alongside the interim `docker-compose.yml` created to
      unblock Phase 0 section 3.3's live-database verification. Extended in
      Phase 8 with `CORS_ALLOWED_ORIGINS`, `MAP_TILE_URL`, and `IMAGE_TAG`.
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
- [x] Implement backend startup validation that fails fast with a clear
      error when a required variable (e.g. `DATABASE_URL`) is missing or
      malformed, per `ENVIRONMENT_MANAGEMENT.md` section 8 (NFR-DEP-004).
      Done in `internal/platform/config` v1.4.0: rejects a missing or
      non-`postgres://host/db` `DATABASE_URL`, missing `TOKEN_SECRET`,
      non-port `HTTP_PORT`, unknown `LOG_LEVEL`, non-positive
      `TOKEN_TTL`/`BMKG_TIMEOUT`, non-http `BMKG_BASE_URL`, and (in
      development) an unreadable `MIGRATIONS_DIR`, each with an error
      naming the variable. Covered by `config_test.go` (14 invalid cases +
      valid/production cases; passes).

### 11.2 Images & Compose

- [x] Write `georesponse-fe/Dockerfile` (multi-stage: build, then serve
      static assets) per `CONTAINERIZATION.md`. Done, with `nginx.conf`
      (SPA fallback, asset caching) and `.dockerignore`; build-time
      `ARG`s for `API_BASE_URL`/`MAP_TILE_URL`/`LOG_LEVEL`. **Built
      successfully** with `docker compose build` (`npm ci` + Rspack
      production build compiled with 3 warnings, exit 0).
- [x] Write `georesponse-be/Dockerfile` (multi-stage: build, then run the Go
      binary) per `CONTAINERIZATION.md`. Done (`golang:1.26-alpine` build,
      Alpine runtime with `ca-certificates`, non-root user) with
      `.dockerignore`. **Built successfully** with `docker compose build`.
      Alpine rather than distroless so the compose healthcheck's in-container
      `wget` works — recorded in `CONTAINERIZATION.md` section 5.2.
- [x] Implement the backend's auto-migrate-on-startup behavior (guarded by
      `APP_ENV=development`) per `DOCKER_COMPOSE.md` section 6.5, so the
      schema is always current without a manual migration step in local
      dev. Done: `internal/platform/postgres/migrate.go` (golang-migrate-
      compatible `schema_migrations(version, dirty)` bookkeeping, one
      transaction per file, refuses on a dirty row) called from
      `cmd/api/main.go` when `cfg.AutoMigrate`. `migrate_test.go` covers
      listing/ordering and — against the live `georesponse-db` — applying
      pending files, idempotence, and the dirty-row refusal (passes).
- [x] Implement `scripts/docker/build.sh`/`build.ps1`. Done (git-SHA +
      `latest` tags, `--tag`, `--fe-only`/`--be-only`, frontend build args
      from env/root `.env`). Not executed end to end here (images were
      built via `docker compose build` instead).
- [x] Implement `scripts/docker/clean.sh`/`clean.ps1`. Done (removes only
      `georesponse-*` images and dangling layers; `--volumes` opt-in). Not
      executed here.
- [x] Write the real root-level `docker-compose.yml` per `DOCKER_COMPOSE.md`
      section 5 (frontend, backend, PostGIS, healthchecks, `${VAR}`
      substitution from the root `.env` — no hardcoded credentials). Done:
      all three services, `service_healthy` ordering db → be → fe, backend
      healthcheck on `/health`, `IMAGE_TAG`-parameterised image names,
      `database/migrations` bind-mounted at `/migrations`, and a first-run
      `docker/postgres/init/01-init-schema-and-seeds.sh` that migrates and
      seeds a brand-new volume (the earlier sketch's subdirectory mounts
      into `docker-entrypoint-initdb.d` were inert — noted in
      `DOCKER_COMPOSE.md` 6.1). `docker compose config` validates; a
      `.gitattributes` pins LF on `*.sh`/Dockerfiles so the bind-mounted
      init script runs on Windows checkouts.
- [x] Run `docker compose up --build` directly (without the wrapper script)
      from a clean checkout with a real `.env` already in place, and
      confirm the full stack starts and the frontend can reach the backend.
      **Verified 2026-09-20** (`docker compose up -d --build --wait` from
      the repository with its real `.env`): all three services healthy;
      `scripts/deployment/health-check.sh` passed; `tests/integration`
      (3 tests incl. read-only authorization) and the Playwright e2e golden
      path passed against it through the browser at `:5173`. Two real bugs
      found and fixed by this run: the frontend `HEALTHCHECK` used
      `localhost`, which busybox `wget` resolves to `::1` while nginx only
      listens on IPv4 (now `127.0.0.1`); and the database healthcheck used
      the unix socket, which reports ready during the image's first-run
      init phase before migrations/seeds have finished (now `pg_isready -h
      127.0.0.1`, which only succeeds once the real server is up).

### 11.3 One-Command Local Run

- [x] Write root `run.sh`: verify Docker is installed and running; for each
      of the three `.env.example` files, copy it to the corresponding
      `.env` only if that `.env` does not already exist (never overwrite a
      developer's existing local values); then run
      `docker compose up --build`; then print the access URLs from
      `DOCKER_COMPOSE.md` section 6.3. Done (`--foreground`, `--down`
      variants; detached mode uses `--wait` so the URLs print once every
      service is healthy).
- [x] Write root `run.ps1` — the same behavior, for Windows PowerShell,
      matching the `.sh`/`.ps1` pairing convention already used by every
      other script in `scripts/`. Done (`-Foreground`, `-Down`).
- [x] Make `run.sh` executable (`chmod +x run.sh`) and commit it as such.
      Done via `git update-index --chmod=+x` (Windows checkout), applied to
      every `*.sh` in the repository at the same time — they were all
      `100644` before.
- [x] On a completely clean checkout with no `.env` files present anywhere,
      run only `./run.sh` and confirm: env files are created, the stack
      builds and starts, the database is migrated automatically, and the
      frontend at `http://localhost:5173` can successfully call the backend
      — zero manual steps beyond that one command. **Verified 2026-09-20**
      on a fresh `git clone` (no `.env` anywhere) with a brand-new compose
      project/volume: `./run.sh` created the three `.env` files, built both
      images, brought db → be → fe up healthy and printed the URLs (exit 0);
      the new volume came up at schema version 7 with 8 seeded resources
      and both demo users (`docker/postgres/init` path); `tests/integration`
      passed against it and the Playwright golden path passed through the
      browser. Volume and containers were then removed and the normal
      stack restored.
- [x] Implement `scripts/deployment/deploy.sh`/`deploy.ps1` and
      `health-check.sh`/`health-check.ps1` per `DEPLOYMENT.md`. Done
      (deploy: build-or-`--tag`, restarts only be/fe, refuses a missing
      tag; health-check: polls `/health` for `"database":"ok"` and the
      frontend root with a timeout, non-zero on failure). Not executed here.
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). Committed directly to `main` and
      pushed; CI green (`docker-build` job builds both images):
      https://github.com/MahardikaPratama/georesponse/actions/runs/35463744686.

---

## 12. Phase 9 — CI & Quality Gates

**Branch:** `chore/phase-9-ci-quality` (see section 2.1). Committed
directly to `main` (see Phase 7 note).

- [x] Add the GitHub Actions workflow described in `CI_CD.md` (lint,
      type-check, build, test for both apps, triggered on push/PR to
      `main`). (Done early, in `chore/phase-0-project-setup`, so that
      phase's own PR could actually have a "confirm CI passes" step.) The
      Docker-build-verify job from `CI_CD.md` section 4.4 is now added
      (both images, `push: false`), plus the `integration` job (PostGIS
      service container, backend started with `APP_ENV=development`,
      seeds loaded with `psql`, `tests/integration` run). The frontend job
      now uses `npm ci` with the npm cache since `package-lock.json` is
      committed.
- [x] Implement `scripts/quality/sonar.sh`/`sonar.ps1` if static-analysis
      tooling is configured (optional per `CODE_QUALITY.md`'s
      proportionate-scope framing). (Done early, in Phase 0, per explicit
      request for real SonarQube tooling — `sonar-project.properties` +
      both scripts exist and check for `sonar-scanner`/`SONAR_TOKEN`
      before running.)
- [x] Run `scripts/quality/check.sh` locally and confirm every gate in
      `QUALITY_GATES.md` passes. **Verified 2026-09-20** with Node.js 24 on
      `PATH`: G1–G4, G5a, G5b, G6, G7 all PASS, G5c (golangci-lint) SKIP
      as optional/not installed; `RESULT: PASS`. The first run failed G5a
      only because the Windows checkout had CRLF `.go` files (a false
      positive `gofmt -l` reports on CRLF) — `.gitattributes` now pins
      `*.go` to LF.
- [x] Push, open a PR, and confirm the CI pipeline itself runs correctly on
      it (this is also the first real end-to-end proof the pipeline works),
      then merge into `main` and delete the branch (workflow: section 2.1).
      Pushed to `main`; the pipeline with the new `integration` (PostGIS
      service container + live backend + `tests/integration`) and
      `docker-build` jobs ran green twice:
      https://github.com/MahardikaPratama/georesponse/actions/runs/35462475011
      and .../runs/35463744686. Branch protection / coverage reporting
      remain unscoped (proportionate to the take-home).

---

## 13. Phase 10 — Documentation Reconciliation

**Branch:** `docs/phase-10-doc-reconciliation` (see section 2.1). Committed
directly to `main` (see Phase 7 note).

- [x] Update the **Implementation Status** section in `README.md`,
      `georesponse-fe/README.md`, and `georesponse-be/README.md` to reflect
      what is now actually implemented (remove or narrow the "not yet
      implemented" language as each part lands). Done for all three, plus
      `QUICK_START.md`, `AGENTS.md`/`CLAUDE.md` (the "not yet runnable"
      sentence), and the backend README's `APP_PORT` → `HTTP_PORT` slip.
- [x] Update `docs/13_ai/AI_WORKFLOW.md` section 5 (disclosure) to describe
      the actual extent of AI assistance used during implementation, not
      just documentation authoring. Done (all phases, and how verification
      was reported); `QUICK_START.md` section 3 mirrors it.
- [x] For any FR/UC left intentionally unimplemented at submission time,
      document it explicitly (file, section) per the take-home brief's
      "explain unfinished features" requirement — do not leave a silent
      gap. Done: a full FR/UC/NFR coverage audit against the code found
      three partial items (FR-033/UC-12 role lifecycle is API-only;
      FR-002/FR-020 list and map show only the first page; UC-05 has no
      map empty-state overlay) and seven NFRs whose verification was not
      carried out; all are recorded in `SCOPE.md` section 11, with pointers
      from `FUNCTIONAL_REQUIREMENTS.md` section 1, `USE_CASES.md` section
      1, and `README.md` "Implementation Status". Endpoint-level
      contract deviations are tabulated in `API_CONTRACT.md` section 19.
      What is intentionally *not* delivered operationally (no hosted
      deployment, CD, TLS, registry, e2e as a CI stage) stays in
      `README.md` with rationale in `DEPLOYMENT.md` section 8 / `CI_CD.md`
      sections 4.3 and 7.
- [x] Verify every code example, endpoint list, and script path across
      `docs/` still matches the real implementation (spot-check
      `API_CONTRACT.md`, `DATABASE_SCHEMA.md`, and both READMEs). Done as a
      file-by-file pass over every `docs/` directory, the three READMEs,
      `QUICK_START.md`, `tests/README.md`, `AGENTS.md`, and `CLAUDE.md`
      against the router, handlers, DTOs, validators, `go.mod`,
      migrations, seeds, scripts, compose file, Dockerfiles, CI workflow,
      and `package.json`. Notable corrections: `GET /api/v1/hotspots` and
      `HOTSPOT_UPSTREAM_UNAVAILABLE` added to `API_CONTRACT.md`; migration
      0006/0007 effects (history FKs `ON DELETE SET NULL`, `password_hash`)
      and the real migration file names in `DATABASE_SCHEMA.md` /
      `DATABASE_MIGRATIONS.md`; invented pool-size env vars removed from the
      database docs; `BACKEND_ARCHITECTURE.md` package tree, naming,
      validation, error-mapping, and testing examples rewritten to the
      real identifiers; frontend docs (`FRONTEND_ARCHITECTURE`, `_STATE`,
      `_NAMING`, `_TESTING`, `_UI_UX`) purged of files that never existed
      (a Zustand alert store, a dashboard feature, marker dragging) and
      re-pointed at the real `src/` tree; `CI_CD.md`, `CONTAINERIZATION.md`,
      `DOCKER_COMPOSE.md`, and `ENVIRONMENT_MANAGEMENT.md` re-synced with
      the workflow, Dockerfiles, compose file, and `config.go` (script
      names, Go 1.26 image, build args, required/default env vars); Go
      1.26 and Tailwind CSS v4 in the READMEs and root instruction files; a stray carriage-return byte in `.
un.ps1`
      fixed in `README.md` and `QUICK_START.md`. Static verification only:
      no `npm`, `docker`, or `go` commands were run for this item.
- [x] Re-run the redundancy/consistency pass on any doc touched during
      implementation, per the ownership map established in this session.
      Done: the migration bookkeeping table format is now stated once in
      `DATABASE_MIGRATIONS.md` section 4 and referenced from
      `DOCKER_COMPOSE.md` 6.5 / `BACKEND_DEPENDENCIES.md`; the frontend
      build-time env-var behaviour lives in `ENVIRONMENT_MANAGEMENT.md` 5.1
      and is referenced from `CONTAINERIZATION.md` 4.2.
- [x] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). Committed directly to `main` and
      pushed; CI green.

---

## 14. Phase 11 — Final Submission Prep

**Branch:** `chore/phase-11-submission-prep` (see section 2.1).

- [x] Confirm `git log` reflects small, focused, Conventional-Commits-style
      commits per `GIT_MANAGEMENT.md` (squash/rebase stray WIP commits if
      needed). Reviewed: 40+ commits on `main`, all `type(scope): subject`
      form, one concern each (the one outlier, `update: package-lock.json`,
      is already pushed history and was left alone rather than rewritten).
- [x] Confirm no secrets, `.env` files, or `node_modules`/build artifacts
      are committed. `git ls-files` contains no `.env`, `node_modules/`,
      `dist/`, or `*.log`. **Note for the operator**:
      `georesponse-fe/.env.example` (and, mirroring it, the root
      `.env.example`) contains a MapTiler free-tier API key as the
      `MAP_TILE_URL` default. It is a low-value, revocable key committed
      deliberately so the map renders out of the box; rotate or blank it
      before sharing the repository more widely if that is not acceptable.
- [x] Confirm `AGENTS.md` and/or `CLAUDE.md` are present at the repository
      root (take-home brief's explicit Agentic AI disclosure requirement).
      Both present and in sync.
- [x] Do a final clean-checkout smoke test: clone into a fresh directory,
      run `scripts/dev/setup.sh`, run `docker compose up`, and confirm the
      golden path (view → create → update → relocate → delete a resource
      on the map) works end to end. **Done 2026-09-20** on a fresh clone:
      `setup.sh` exit 0 (section 3.3), `./run.sh` on a brand-new volume
      exit 0 (section 11.3), and the golden path confirmed both by
      `tests/integration` and by the Playwright browser test
      (`tests/e2e/golden-path.spec.ts`: log in → map + list → create →
      update → relocate → delete, 1 passed).
- [ ] Confirm the submission is pushed/available before **2026-09-19
      23:59** (the take-home deadline). **Not met**: the deadline passed
      before Phases 7–11 were completed; the submission was pushed to
      `main` on 2026-09-20. Left unchecked deliberately — it cannot be made
      true after the fact.
- [x] Push, open a PR, confirm CI passes, and merge into `main` — this
      merge is the submission commit itself (workflow: section 2.1; delete
      the branch afterward for a clean history). Pushed directly to `main`
      (no PR/branch, consistent with how Phases 7–10 were closed out); CI
      green on the pushed head.

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
