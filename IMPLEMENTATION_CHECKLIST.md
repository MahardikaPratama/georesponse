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
- [ ] Push, open a PR, confirm CI passes, merge into `main`, delete the
      branch (workflow: section 2.1). **Not yet verified**: this
      environment has no Node.js/npm available, so typecheck/lint/build/test
      could not be run locally before this push — CI is the first real
      verification.

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
