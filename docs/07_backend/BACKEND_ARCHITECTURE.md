# Backend Architecture

## 1. Purpose

This document describes the Go package layout, start-up wiring, routing,
and middleware chain of `georesponse-be`: where a given piece of backend
code lives and how the layers are connected at process start-up.

It does not define the API surface, data shapes, or business rules (see
`API_CONTRACT.md`, `DATA_CONTRACT.md`, `DOMAIN_MODEL.md`, and
`BUSINESS_RULES.md`), the database design (see `docs/08_database/`),
validation rules (`BACKEND_VALIDATION.md`), error mapping
(`BACKEND_ERROR_HANDLING.md`), naming (`BACKEND_NAMING.md`), or tests
(`BACKEND_TESTING.md`).

---

## 2. Layering

The layer order and dependency direction are defined in
`DEPENDENCY_RULES.md` section 2, and layer responsibilities in
`SYSTEM_ARCHITECTURE.md` section 4. This document maps them onto packages.

---

## 3. Package Layout

```text
georesponse-be/
├── cmd/
│   └── api/
│       └── main.go            # wiring: config, DB pool, dev auto-migrate,
│                               # repositories, use cases, handlers, router,
│                               # HTTP server start-up + graceful shutdown
│
├── internal/
│   ├── platform/
│   │   ├── bmkg/               # HTTP client for BMKG's GeoHotspot ArcGIS layer
│   │   ├── config/             # env var loading, validation of config
│   │   ├── idgen/              # server-side UUID v4 ids (history, audit)
│   │   ├── logging/            # structured slog logger, request-scoped logger
│   │   ├── postgres/           # pgx pool (pool.go), dev-only migrator (migrate.go)
│   │   └── transaction/        # Runner interface: run repository writes atomically
│   │
│   ├── http/
│   │   ├── router.go           # Chi router assembly, route table, /health
│   │   ├── common.go           # shared constants (timestamp format)
│   │   ├── resource_handler.go         # handlers + DTOs for /resources
│   │   ├── resourcehistory_handler.go  # GET /resources/{id}/history
│   │   ├── auth_handler.go             # /auth/login, /auth/logout, /auth/me
│   │   ├── authorization_handler.go    # /roles, /permissions, /users/{id}/roles
│   │   ├── audit_handler.go            # GET /audit-logs
│   │   ├── hotspot_handler.go          # GET /hotspots
│   │   ├── middleware/         # request ID, logging, recovery, CORS, auth
│   │   └── httpresponse/       # envelope, error translation, JSON decoding,
│   │                           # ValidationError
│   │
│   ├── resource/
│   │   ├── resource.go         # domain type: Resource, Type, Status
│   │   ├── location.go         # domain type: Location + validation rules
│   │   ├── attribute_validator.go            # AttributeValidator interface +
│   │   │                                     # AttributeValidatorRegistry
│   │   │                                     # (Strategy pattern, section 8.2)
│   │   ├── attribute_validator_vehicle.go    # one file per resource Type;
│   │   ├── attribute_validator_facility.go   # a new type adds a file here
│   │   ├── attribute_validator_equipment.go  # without editing the others
│   │   ├── attribute_validator_iotdevice.go
│   │   ├── service.go          # use cases: CreateResource, RelocateResource, ...
│   │   └── repository.go       # repository interface + Filters (domain-owned)
│   │
│   ├── resourcehistory/
│   │   ├── history.go          # domain types: StatusHistory, LocationHistory,
│   │   │                       # ResourceChangeHistory
│   │   ├── service.go          # HistoryRecorder impl + GetResourceHistory
│   │   └── repository.go
│   │
│   ├── auth/
│   │   ├── user.go             # domain: User, sentinel errors
│   │   ├── credentials.go      # domain: Credentials (password hash lookup)
│   │   ├── token.go            # TokenSigner interface + HMACTokenSigner
│   │   ├── service.go          # Authenticate, Logout, GetCurrentUser,
│   │   │                       # AssignUserRoles
│   │   └── repository.go
│   │
│   ├── authorization/
│   │   ├── role.go             # domain: Role, Permission, sentinel errors
│   │   ├── guard.go            # HasPermission / Require (permission check)
│   │   ├── service.go          # role + permission management use cases
│   │   └── repository.go
│   │
│   ├── audit/
│   │   ├── audit.go            # domain: AuditRecord, Operation enum
│   │   ├── service.go          # ListAuditRecords use case
│   │   └── repository.go
│   │
│   ├── hotspot/
│   │   ├── hotspot.go          # domain: Hotspot (BMKG detection), Filters
│   │   ├── service.go          # ListHotspots + last-good-result fallback
│   │   └── repository.go
│   │
│   └── repository/
│       ├── bmkg/
│       │   └── hotspot_repository.go   # hotspot.Repository over platform/bmkg
│       └── postgres/
│           ├── db.go                   # db interface shared by pool and tx
│           ├── transactor.go           # transaction.Runner over pgx
│           ├── resource_repository.go
│           ├── resourcehistory_repository.go
│           ├── user_repository.go
│           ├── authorization_repository.go   # RoleRepository, PermissionRepository
│           └── audit_repository.go
│
├── scripts/
│   └── hashpw/                 # dev tool: bcrypt-hash a password for seeds
└── go.mod
```

Each feature package (`resource`, `resourcehistory`, `auth`, `authorization`,
`audit`, `hotspot`) owns its domain types, its use cases, and its repository
interface. Layering is enforced inside each package rather than by
top-level `domain/`, `usecase/`, `handler/` folders. Both arrangements
satisfy `DEPENDENCY_RULES.md`; the feature set is small enough that
top-level layer folders would mostly hold one file each.

HTTP handlers and their request/response DTOs are the one layer that does
not live in the feature package: they sit in
`internal/http/<feature>_handler.go`. `internal/http/httpresponse.WriteError`
imports every feature package to translate its sentinel errors, so a
feature package importing `httpresponse` would create an import cycle.
`internal/http` is the top of the dependency chain and may import
everything below it. For the same reason the authentication middleware is
in `internal/http/middleware/auth.go` rather than `internal/auth`.

The repository interface lives with the feature (e.g.
`internal/resource/repository.go`) because it is part of the contract the
application layer depends on. The implementation lives in
`internal/repository/postgres` (or `internal/repository/bmkg` for the
external hotspot feed) because it depends on the PostgreSQL/PostGIS driver
or an external HTTP API.

When a feature needs a collaborator from another feature that would create
a cycle (e.g. `resource` needs `resourcehistory` to record history, but
`resourcehistory` already imports `resource` for its `Status`/`Location`
types), the consumer declares a narrow local interface
(`resource.HistoryRecorder`, `resource.PermissionChecker`,
`resource.TxRunner`, `audit.PermissionChecker`, ...) that the real
collaborator satisfies structurally. `main.go` wires the concrete types.

---

## 4. Wiring and Start-up

`cmd/api/main.go` is the only place that knows about every layer at once,
and it contains composition only. `main()` does the following, in order:

1. `config.Load()` reads and validates the environment and fails fast on a
   missing or malformed variable.
2. `platformpostgres.NewPool` opens the pgx pool.
3. When `cfg.AutoMigrate` is set (`APP_ENV=development`),
   `platformpostgres.Migrate` applies pending migrations from
   `cfg.MigrationsDir` before the port is bound.
4. `internalhttp.New(logger, buildDependencies(pool, cfg))` builds the
   router, which is served by an `http.Server` with
   `ReadHeaderTimeout: 5 * time.Second`.
5. On SIGINT/SIGTERM, `srv.Shutdown` drains in-flight requests within a
   10-second timeout.

`buildDependencies` constructs every repository, then the services, then
the handlers, and returns an `internalhttp.Dependencies` struct. The
resource service shows the pattern:

```go
// cmd/api/main.go (excerpt from buildDependencies)
validators := resource.NewAttributeValidatorRegistry(
    resource.NewVehicleAttributeValidator(),
    resource.NewFacilityAttributeValidator(),
    resource.NewEquipmentAttributeValidator(),
    resource.NewIoTDeviceAttributeValidator(),
)
historyService := resourcehistory.NewService(historyRepo, resourceRepo)
resourceService := resource.NewService(resourceRepo, historyService, auditRepo, validators, authorizationService, tx)
```

There is no separate `httpserver` package: server construction and
graceful shutdown are a few lines in `main.go`.

Nothing outside `main.go` and `internal/platform` should construct a
database connection or read an environment variable directly.

---

## 5. Routing

Chi runs on top of `net/http` (`TECHNOLOGY_SELECTION.md` section 8.2). The
whole route table is assembled in one function, `New` in
`internal/http/router.go`, which maps the `API_CONTRACT.md` surface to the
feature handlers:

```go
// internal/http/router.go (excerpt)
r.Use(middleware.RequestID)
r.Use(middleware.Logging(logger))
r.Use(middleware.Recovery)
r.Use(middleware.CORS(deps.CORSAllowedOrigins))

r.Get("/health", healthHandler(deps.Pool))

requireAuth := middleware.RequireAuth(deps.Tokens, deps.Users)

r.Route("/api/v1", func(r chi.Router) {
    r.Route("/auth", func(r chi.Router) {
        r.Post("/login", deps.Auth.Login)
        r.With(requireAuth).Post("/logout", deps.Auth.Logout)
        r.With(requireAuth).Get("/me", deps.Auth.Me)
    })
    r.Route("/resources", func(r chi.Router) {
        r.Use(requireAuth)
        // List, Create, Get, Update, Delete, ChangeStatus, Relocate,
        // and GET /{id}/history
    })
    // /roles group, /permissions, /users/{id}/roles, /audit-logs, /hotspots
})
```

Route grouping follows `API_CONTRACT.md` sections 5 to 11 and 18. No
handler registers its own sub-router outside this file, so the full route
table is discoverable in one place. Every `/api/v1` route except
`POST /auth/login` is behind `RequireAuth`. `GET /health` pings the
database and returns `200` or `503` (shape in `API_CONTRACT.md` section 2).

---

## 6. Middleware Chain

```text
Request
   ↓
Request ID
   ↓
Logging
   ↓
Panic Recovery
   ↓
CORS
   ↓
Authentication (route-scoped: RequireAuth)
   ↓
Handler
   ↓
Use case → Authorization (permission check: authorization.Service.Require)
```

- **Request ID and Logging** apply globally. They let a request be traced
  through server logs and cross-referenced with the audit trail
  (`DATA_CONTRACT.md` section 9).
- **Recovery** is global and turns an unexpected panic into a `500`
  response instead of crashing the process (`BACKEND_ERROR_HANDLING.md`
  section 9).
- **CORS** is global and allows only the origins in
  `CORS_ALLOWED_ORIGINS` (never a wildcard), with credentials, so the
  browser sends the auth cookie cross-origin.
- **Authentication** (`middleware.RequireAuth`) is applied per route or
  route group, because `/auth/login` and `/health` must stay reachable
  without a session. It reads the auth cookie, verifies the token, loads
  the user, and attaches `middleware.AuthContext{UserID, RoleNames}` to the
  request context. The token mechanism itself is described in
  `SECURITY.md` section 4 and `API_CONTRACT.md` section 5.
- **Authorization** is not middleware. Each use case calls
  `authorization.Service.Require(ctx, roleNames, permissionCode)` as its
  first step, because the required permission depends on the operation
  (e.g. `resource.delete` vs `resource.read`) and the check must apply
  whichever client calls the API (BR-027). Handlers only pass the role
  names from `AuthContext` through. The permission per endpoint is listed
  in `BACKEND_VALIDATION.md` section 8.

Each middleware wraps the next `http.Handler` and adds one cross-cutting
concern (Decorator pattern). New cross-cutting behavior, such as rate
limiting, is added as another link in `router.go`, not by editing existing
middleware or handlers.

---

## 7. Geospatial Query Logic

PostGIS-specific SQL (building points with `ST_SetSRID(ST_MakePoint(...))`,
casts between `geography` and `geometry`, reading coordinates with
`ST_X`/`ST_Y`) is confined to `internal/repository/postgres`, in
`resource_repository.go` and `resourcehistory_repository.go`.

```text
Application Service (resource.Service)
       ↓  calls repository interface with plain lat/lng values
Repository Interface (resource.Repository)
       ↓
Postgres Repository Implementation
       ↓  builds ST_* / PostGIS SQL
PostgreSQL + PostGIS
```

The `resource.Repository` interface exposes domain-level operations (e.g.
`List(ctx, filters) ([]Resource, int, error)`), never PostGIS types or raw
SQL fragments. `ST_MakePoint`, `ST_X`/`ST_Y`, and similar calls stay out of
the application and domain layers, as `DEPENDENCY_RULES.md` section 4
requires for infrastructure libraries.

`postgres.ResourceRepository` adapts the PostGIS/`pgx` API to the plain-Go
interface (Adapter pattern). An alternative implementation, such as an
in-memory fake for tests, only has to satisfy the same interface. The
reasons for the `geography` type are in `DATABASE_ARCHITECTURE.md`
section 5.

---

## 8. Design Patterns and SOLID

### 8.1 SOLID in This Codebase

| Principle | Where it shows up |
|---|---|
| Single Responsibility | `service.go` orchestrates use cases, `internal/http/<feature>_handler.go` translates HTTP to use-case calls, `repository.go` declares the data-access contract, and `internal/repository/postgres/*_repository.go` implements it. No file mixes HTTP parsing with SQL. |
| Open/Closed | A new resource type is a new `AttributeValidator` registered in `main.go` (section 8.2); existing validators, the service, and the handler are unchanged. Middleware (section 6) and repositories (section 7) extend the same way. |
| Liskov Substitution | Any `resource.Repository` implementation, real or an in-memory fake (`BACKEND_TESTING.md` section 4), works in `resource.Service` without special cases. The same holds for every feature's repository interface. |
| Interface Segregation | Each feature declares its own narrow repository interface (`resource.Repository`, `resourcehistory.Repository`, `audit.Repository`, ...) with only the operations its use cases call. |
| Dependency Inversion | `resource.Service` depends on the `resource.Repository` interface declared in its own package, not on `internal/repository/postgres`. `main.go` injects the implementation (section 4). |

### 8.2 Strategy Pattern: Type-Specific Attribute Validation

BR-004 requires type-specific attributes to be validated by rules that
differ per `ResourceType`, and a new resource type must not invalidate the
resource model. A single `switch` over `ResourceType` would mean editing
shared code for every new type, so attribute validation is split into one
`AttributeValidator` per type, dispatched by an
`AttributeValidatorRegistry` (`internal/resource/attribute_validator.go`):

```go
type AttributeValidator interface {
    ResourceType() Type
    Validate(attributes map[string]any) error
}

// Validate dispatches to the validator registered for t, and returns an
// error if none is registered.
func (r *AttributeValidatorRegistry) Validate(t Type, attributes map[string]any) error
```

`VehicleAttributeValidator`, `FacilityAttributeValidator`,
`EquipmentAttributeValidator`, and `IoTDeviceAttributeValidator` each live
in their own file (section 3) and check only the fields defined for that
type in `DOMAIN_MODEL.md` section 6.2. `resource.Service` depends only on
`*AttributeValidatorRegistry` and never branches on `ResourceType`. Adding
a fifth type is one new file plus one line in `main.go`.

### 8.3 Other Patterns in Use

- **Dependency Injection** (section 4): every service and handler receives
  its dependencies as constructor parameters (`NewService(repo, ...)`), with
  no package-level globals or service locator. This is what allows fakes
  in tests.
- **Repository** (sections 3 and 7): all persistence goes through a narrow,
  feature-owned interface.
- **Decorator** (section 6): the Chi middleware chain.
- **Adapter** (section 7): the Postgres repository adapting `pgx`/PostGIS
  to the plain-Go interface.

Each pattern answers a concrete need: BR-004's extensibility,
`DEPENDENCY_RULES.md`'s isolation rules, and testing use cases without a
database. `CODING_STANDARDS.md` section 2 still applies: do not add a
pattern or abstraction that no real requirement justifies.
