# Backend Dependencies

## 1. Purpose

This document defines the rules for adding, evaluating, and placing Go
module dependencies in `georesponse-be`.

It applies `DEPENDENCY_RULES.md` section 6 ("Dependency Rule of Thumb") and
`TECHNOLOGY_SELECTION.md` section 8 specifically to Go modules, and adds
Go-specific hygiene (`go.mod`/`go.sum`, vendoring, layer placement).

---

## 2. Already-Decided Dependencies

These are settled by `TECHNOLOGY_SELECTION.md` and are not subject to
re-evaluation without revisiting that document:

| Dependency | Purpose | Layer |
|---|---|---|
| `github.com/go-chi/chi/v5` | HTTP routing on top of `net/http` | `internal/http` |
| PostgreSQL driver/toolkit (`github.com/jackc/pgx/v5`) | Database connectivity, connection pooling | `internal/platform/postgres`, `internal/repository/postgres` |
| golang-migrate CLI (`github.com/golang-migrate/migrate/v4/cmd/migrate`, installed as a tool, not a module dependency) | Applying and rolling back schema migrations from `scripts/database/migrate.sh` / `rollback.sh` (`.ps1` twins) | invoked by the migration scripts; not imported by application code. The backend's own development-only start-up migrator (`internal/platform/postgres.Migrate`, `DOCKER_COMPOSE.md` section 6.5) is ~150 lines over `pgx` that write the same `schema_migrations(version, dirty)` table — chosen over importing the golang-migrate library so the application binary gains no new dependency |
| `golang.org/x/crypto` (`bcrypt`) | Password hash verification at login, and hashing in the `scripts/hashpw` seed helper | `internal/auth`, `scripts/hashpw` |
| Go standard `testing` package | Backend tests | all layers, test files only |

Everything else is the standard library: `log/slog` for structured logging,
`crypto/hmac` + `crypto/sha256` for the stateless auth token,
`crypto/rand` for server-generated ids (`internal/platform/idgen`), and
`net/http` for the BMKG GeoHotspot client (`internal/platform/bmkg`). The
current `go.mod` lists only `chi`, `pgx`, and `x/crypto` as direct
requirements; the remaining entries are their transitive dependencies.

`pgx` is preferred over `database/sql` + a generic driver because it exposes
PostGIS-friendly type handling and its own connection pool
(`pgxpool`), reducing the need for a second pooling dependency. `database/sql`
compatibility mode remains available if a future need requires it.

No ORM is selected. Given the modest number of tables and the need for
PostGIS-specific SQL (`ST_MakePoint`, `ST_DWithin`, spatial indexes), direct
SQL through `pgx` is more predictable than translating through an ORM's
geometry abstraction. This may be revisited if the schema grows
substantially.

---

## 3. Criteria Before Adding a New Dependency

Before adding any dependency not listed above, answer all of the following
(mirrors `DEPENDENCY_RULES.md` section 6):

1. **Does the layer that needs this actually need it?** A dependency needed
   only by the repository layer must not be imported by the domain or
   application layer.
2. **Does the standard library already solve this?** Go's standard library
   covers HTTP, JSON, time, context, crypto primitives, and basic validation
   patterns. Prefer it before reaching for a third-party package.
3. **Is this justified by a current requirement**, not a hypothetical future
   one? Do not add a dependency "in case it's useful later."
4. **Does it avoid a heavy framework?** Consistent with the Chi decision, do
   not introduce a full web framework, a dependency-injection framework, or
   an ORM as a replacement for direct SQL.
5. **Is it maintained and reasonably scoped?** Prefer small, focused modules
   with an active repository over large multi-purpose libraries.

If a dependency fails any of these checks, prefer a small amount of local
code over the dependency.

### Examples of what does *not* need a new dependency

- UUID generation: Go's `crypto/rand` plus a small local helper, or a single
  small, well-known UUID package if truly needed — not a broader "utils"
  library.
- Input validation: struct-level checks written explicitly in the
  application/domain layer (see `BACKEND_VALIDATION.md`) rather than a
  generic validation framework, unless the validation surface grows large
  enough that hand-written checks become the harder-to-maintain option.
- Environment variable parsing: `os.Getenv` plus explicit parsing/validation
  in `internal/platform/config`.

---

## 4. Dependency-to-Layer Mapping

```text
net/http, Chi              → internal/http (router, middleware, handlers)
pgx / pgxpool               → internal/platform/postgres,
                               internal/repository/postgres
migration tool (CLI)         → scripts/database/*.sh|ps1 only
                               (not imported by application binaries;
                               the dev-only start-up migrator in
                               internal/platform/postgres uses pgx)
x/crypto/bcrypt              → internal/auth (service.go), scripts/hashpw
testing, httptest            → *_test.go files in any layer
```

The domain layer (`internal/resource`, `internal/auth`, etc., excluding
their `repository/postgres` counterparts) must not import `pgx`, Chi, or any
HTTP package. This is the Go-specific enforcement of `DEPENDENCY_RULES.md`
section 2, rule 5 ("Domain code must not depend on HTTP or database
implementations").

If a dependency is genuinely cross-cutting (e.g. a structured logging
library), it is isolated behind a small package in `internal/platform/logging`
rather than imported ad hoc across feature packages — consistent with
`DEPENDENCY_RULES.md` section 4.

---

## 5. `go.mod` / `go.sum` Hygiene

- `go.mod` declares a single module for the backend:
  `module github.com/mahardika-pratama/georesponse-be`, pinned to
  `go 1.26.0` (matching the `1.26` toolchain CI and the Dockerfile build
  stage use).
- Run `go mod tidy` after adding or removing an import so `go.mod` and
  `go.sum` stay in sync with actual usage. Do not hand-edit `go.sum`.
- Commit both `go.mod` and `go.sum`. `go.sum` provides supply-chain integrity
  (checksum verification) and must not be gitignored.
- Pin to a specific Go version in `go.mod` (`go 1.x`) matching what CI and
  the Dockerfile build stage use, to avoid "works on my machine" drift.
- When bumping a dependency version, do it as its own change where
  practical, separate from unrelated feature work, so the diff is reviewable.

---

## 6. Vendoring

Vendoring (`go mod vendor`, committing `vendor/`) is **not used** for this
project.

Rationale: the module proxy (`GOPROXY`) plus a committed `go.sum` already
gives reproducible, verifiable builds. Vendoring would add a large,
generated directory to the repository for a take-home-scoped project with a
small dependency set, without a corresponding benefit (this project has no
offline-build or air-gapped-deployment requirement). If such a requirement
appears later, vendoring can be introduced without changing application
code.

---

## 7. Scope Boundary

This document does not define:

- the exact pinned versions of dependencies (tracked in `go.mod`/`go.sum`
  directly, which is the source of truth);
- database schema or migration file naming (owned by `database/migrations`);
- frontend dependency rules (see the frontend engineering documentation);
- CI/CD pipeline configuration.

---

## 8. Dependency Principle

Every Go dependency must earn its place by serving a real requirement of a
specific layer, and must not be allowed to leak into layers that do not need
it.

> If it can be done correctly and clearly with the standard library, it
> should be.
