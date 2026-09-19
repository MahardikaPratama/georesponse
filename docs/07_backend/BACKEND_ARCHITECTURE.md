# Backend Architecture

## 1. Purpose

This document expands the backend layering defined in `SYSTEM_ARCHITECTURE.md`
(section 4) and `DEPENDENCY_RULES.md` (section 2) into a concrete Go package
layout, routing setup, and middleware chain for `georesponse-be`.

It answers: where does a given piece of backend code live, and how do the
layers get wired together at process start-up.

This document does not redefine the API surface, the data shapes, or the
business rules. Those are owned by `API_CONTRACT.md`, `DATA_CONTRACT.md`,
`DOMAIN_MODEL.md`, and `BUSINESS_RULES.md`.

---

## 2. Layering Recap

```text
HTTP Handler
     ↓
Application / Use Case
     ↓
Domain
     ↓
Repository (interface)
     ↓
Repository Implementation
     ↓
Database (PostgreSQL + PostGIS)
```

- The domain never imports `net/http`, Chi, or a database driver.
- Application/use-case code depends on repository **interfaces**, never on
  `internal/repository/postgres` directly.
- Handlers stay thin: parse and validate HTTP input, call a use case, shape
  the HTTP response. No SQL, no business rules, no direct repository calls.

---

## 3. Package Layout

```text
georesponse-be/
├── cmd/
│   └── api/
│       └── main.go            # wiring: config, DB pool, repositories,
│                               # use cases, router, HTTP server start-up
│
├── internal/
│   ├── platform/
│   │   ├── config/             # env var loading, validation of config
│   │   ├── httpserver/         # server bootstrap, graceful shutdown
│   │   ├── logging/            # structured logger setup
│   │   └── postgres/           # DB connection pool, PostGIS-aware helpers
│   │
│   ├── http/
│   │   ├── router.go           # Chi router assembly, route table
│   │   ├── middleware/         # logging, recovery, auth, request ID
│   │   └── httpresponse/       # envelope + error response helpers
│   │
│   ├── resource/
│   │   ├── resource.go         # domain type: Resource, Type, Status
│   │   ├── location.go         # domain type: Location + validation rules
│   │   ├── attribute_validator.go            # AttributeValidator interface +
│   │   │                                     # AttributeValidatorRegistry (Strategy
│   │   │                                     # pattern, see section 8.2)
│   │   ├── attribute_validator_vehicle.go    # one file per ResourceType —
│   │   ├── attribute_validator_facility.go   # adding a new type means adding a
│   │   ├── attribute_validator_equipment.go  # file here, not editing these ones
│   │   ├── attribute_validator_iotdevice.go  # (Open/Closed Principle)
│   │   ├── service.go          # use case: CreateResource, Relocate, ...
│   │   ├── repository.go       # repository interface (domain-owned)
│   │   ├── handler.go          # HTTP handlers for /resources
│   │   └── dto.go              # request/response DTOs for this feature
│   │
│   ├── resourcehistory/
│   │   ├── history.go          # domain types: StatusHistory, LocationHistory
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── handler.go
│   │
│   ├── auth/
│   │   ├── auth.go             # domain: credentials, session/token concept
│   │   ├── service.go          # login, current-user use cases
│   │   ├── repository.go
│   │   ├── handler.go
│   │   └── middleware.go       # authentication middleware
│   │
│   ├── authorization/
│   │   ├── role.go             # domain: Role, Permission
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── handler.go
│   │
│   ├── audit/
│   │   ├── audit.go            # domain: AuditRecord
│   │   ├── service.go          # recording + querying audit entries
│   │   ├── repository.go
│   │   └── handler.go
│   │
│   └── repository/
│       └── postgres/
│           ├── resource_repository.go
│           ├── resourcehistory_repository.go
│           ├── auth_repository.go
│           ├── authorization_repository.go
│           └── audit_repository.go
│
└── go.mod
```

Each feature package (`resource`, `resourcehistory`, `auth`, `authorization`,
`audit`) owns its domain types, its use cases, its repository interface, and
its handlers. This is a **feature-oriented** variant of the layered
architecture: layering is enforced inside each package rather than by
splitting the whole codebase into `domain/`, `usecase/`, `handler/` top-level
folders. Either arrangement satisfies `DEPENDENCY_RULES.md`; this project
uses the feature-oriented form because the feature set is small enough that
top-level layer folders would mostly contain one file each.

The repository **interface** lives with the feature (e.g.
`internal/resource/repository.go`) because it is part of the contract the
application layer depends on. The repository **implementation** lives in
`internal/repository/postgres` because it is infrastructure and depends on
the PostgreSQL/PostGIS driver.

---

## 4. Wiring and Start-up

`cmd/api/main.go` is the only place allowed to know about every layer at
once. It is composition, not business logic:

```go
// cmd/api/main.go
func main() {
    cfg := config.Load()

    pool := postgres.MustConnect(cfg.DatabaseURL)
    defer pool.Close()

    resourceRepo := postgresrepo.NewResourceRepository(pool)
    historyRepo := postgresrepo.NewResourceHistoryRepository(pool)
    auditRepo := postgresrepo.NewAuditRepository(pool)

    // Strategy pattern: each resource type's attribute rules are an
    // independent AttributeValidator, composed here rather than branched on
    // inside resource.Service (section 8.2).
    attributeValidators := resource.NewAttributeValidatorRegistry(
        resource.NewVehicleAttributeValidator(),
        resource.NewFacilityAttributeValidator(),
        resource.NewEquipmentAttributeValidator(),
        resource.NewIoTDeviceAttributeValidator(),
    )

    resourceService := resource.NewService(resourceRepo, historyRepo, auditRepo, attributeValidators)
    resourceHandler := resource.NewHandler(resourceService)

    router := httprouter.New(httprouter.Dependencies{
        Resource: resourceHandler,
        // ... other feature handlers
    })

    httpserver.Run(cfg.Addr, router)
}
```

Nothing outside `main.go` and `internal/platform` should construct a database
connection or read an environment variable directly.

---

## 5. Routing

Chi is used on top of `net/http` (`TECHNOLOGY_SELECTION.md` section 8.2). The
router is assembled in one place, `internal/http/router.go`, mapping the
`API_CONTRACT.md` surface to feature handlers:

```go
// internal/http/router.go
func New(deps Dependencies) http.Handler {
    r := chi.NewRouter()

    r.Use(middleware.RequestID)
    r.Use(middleware.Logging)
    r.Use(middleware.Recovery)

    r.Route("/api/v1", func(r chi.Router) {
        r.Post("/auth/login", deps.Auth.Login)
        r.With(deps.Auth.RequireAuth).Get("/auth/me", deps.Auth.Me)

        r.Route("/resources", func(r chi.Router) {
            r.Use(deps.Auth.RequireAuth)
            r.Get("/", deps.Resource.List)
            r.Post("/", deps.Resource.Create)
            r.Get("/{id}", deps.Resource.Get)
            r.Put("/{id}", deps.Resource.Update)
            r.Delete("/{id}", deps.Resource.Delete)
            r.Patch("/{id}/status", deps.Resource.ChangeStatus)
            r.Patch("/{id}/location", deps.Resource.Relocate)
            r.Get("/{id}/history", deps.ResourceHistory.Get)
        })

        r.Route("/roles", func(r chi.Router) { /* ... */ })
        r.Get("/permissions", deps.Authorization.ListPermissions)
        r.Get("/audit-logs", deps.Audit.List)
    })

    return r
}
```

Route grouping mirrors the resource-oriented structure of `API_CONTRACT.md`
sections 5–11. No handler registers its own sub-router outside this file;
this keeps the full route table discoverable in one place.

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
Authentication (route-scoped)
   ↓
Authorization (handler-scoped, permission check)
   ↓
Handler
```

- **Request ID / Logging** apply globally and are cheap; they support
  tracing a request through server logs, which matters for audit trail
  cross-referencing (`DATA_CONTRACT.md` section 9).
- **Recovery** is global and converts an unexpected panic into a `500`
  response instead of crashing the process. See `BACKEND_ERROR_HANDLING.md`.
- **Authentication** is applied per route group (e.g. everything under
  `/resources`, `/roles`, `/audit-logs`) rather than globally, because
  `/auth/login` must remain reachable without a session.
- **Authorization** (permission checks) happens closer to the handler,
  because the required permission is operation-specific (e.g.
  `resource.delete` vs `resource.read`). It is still middleware or a thin
  wrapper, not inline logic scattered through handler bodies.

This chain is the **Decorator pattern**: each middleware wraps the next
`http.Handler` and adds one cross-cutting concern without the handler or the
other middleware knowing it's there. New cross-cutting behavior (rate
limiting, CORS, etc., if ever needed) is added as another link in this chain
in `router.go`, not by editing existing middleware or handlers.

---

## 7. Geospatial Query Logic

PostGIS-specific query construction (bounding-box filters, coordinate
casting to `geography`/`geometry` types, spatial indexing) is confined to
`internal/repository/postgres/resource_repository.go`.

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
`FindByFilters(ctx, filters) ([]Resource, error)`), never PostGIS types or
raw SQL fragments. This keeps `ST_MakePoint`, `ST_DWithin`, and similar
PostGIS calls out of the application and domain layers, consistent with
`DEPENDENCY_RULES.md` section 4 (external libraries are isolated behind a
boundary when they represent an infrastructure concern).

This is the **Adapter pattern**: `postgresResourceRepository` adapts the
PostGIS/`pgx` API to the plain-Go `resource.Repository` interface the rest
of the application already depends on. A future alternative
implementation — an in-memory fake for tests, or a different database —
only has to satisfy the same interface; nothing above the repository layer
changes.

---

## 8. Design Patterns & SOLID Principles

Sections 2–7 already apply specific patterns without naming them. This
section makes that explicit, so the reasoning behind the structure is
documented rather than implicit — consistent with `SCOPE.md` section 9's
requirement that the architecture "can be extended in the future" and
`CODING_STANDARDS.md`'s emphasis on maintainable, non-clever code.

### 8.1 SOLID, Applied to This Codebase

| Principle | How it's applied here |
|---|---|
| **S — Single Responsibility** | Each file in a feature package has one job: `service.go` holds use-case orchestration, `handler.go` only translates HTTP ↔ use case, `repository.go` only declares the data-access contract, `*_repository.go` under `internal/repository/postgres` only implements it. No file mixes HTTP parsing with SQL. |
| **O — Open/Closed** | Adding a fifth resource type (or a new business rule that only applies to one type) means adding a new `AttributeValidator` implementation (section 8.2) and registering it — existing validators, the service, and the handler are not modified. The same applies to middleware (section 6) and repository implementations (section 7). |
| **L — Liskov Substitution** | Any type satisfying `resource.Repository` — the real Postgres implementation, or an in-memory fake used in a use-case test (`BACKEND_TESTING.md`) — must be usable wherever the interface is expected, with no special-casing in `resource.Service`. The same holds for every other feature's repository interface. |
| **I — Interface Segregation** | There is no single god-sized `Repository` interface. Each feature declares its own narrow interface (`resource.Repository`, `resourcehistory.Repository`, `audit.Repository`, ...) exposing only the operations that feature's use cases actually call. |
| **D — Dependency Inversion** | `resource.Service` depends on the `resource.Repository` **interface**, declared in the same package it's consumed from, not on `internal/repository/postgres` (section 2, section 4). The concrete implementation is injected from `main.go`, the one place allowed to know about infrastructure (section 4). |

### 8.2 Strategy Pattern — Type-Specific Attribute Validation

`BUSINESS_RULES.md` BR-004 requires that type-specific attributes be
validated according to rules that differ per `ResourceType`, and that "the
addition of a new resource type must not invalidate the fundamental
resource model." A single function with a `switch` statement over
`ResourceType` would violate the Open/Closed half of that requirement —
every new type would mean editing shared code. Instead:

```go
// AttributeValidator validates the type-specific attributes of one
// ResourceType. Each ResourceType has exactly one implementation.
type AttributeValidator interface {
    ResourceType() ResourceType
    Validate(attributes map[string]any) error
}

// AttributeValidatorRegistry dispatches to the AttributeValidator
// registered for a given ResourceType.
type AttributeValidatorRegistry struct {
    validators map[ResourceType]AttributeValidator
}

func NewAttributeValidatorRegistry(validators ...AttributeValidator) *AttributeValidatorRegistry {
    r := &AttributeValidatorRegistry{validators: make(map[ResourceType]AttributeValidator, len(validators))}
    for _, v := range validators {
        r.validators[v.ResourceType()] = v
    }
    return r
}

func (r *AttributeValidatorRegistry) Validate(t ResourceType, attributes map[string]any) error {
    v, ok := r.validators[t]
    if !ok {
        return fmt.Errorf("no attribute validator registered for resource type %q", t)
    }
    return v.Validate(attributes)
}
```

`VehicleAttributeValidator`, `FacilityAttributeValidator`,
`EquipmentAttributeValidator`, and `IoTDeviceAttributeValidator` each live in
their own file (section 3) and validate only the fields defined for that
type in `DOMAIN_MODEL.md` section 6.2 (`vehicleType`/`capacity`,
`facilityType`/`capacity`, `equipmentType`/`quantity`, `deviceType`).
`resource.Service` depends only on `*AttributeValidatorRegistry` — it never
branches on `ResourceType` itself. Introducing a fifth resource type later
is one new file plus one line in `main.go` (section 4); no existing
validator, the service, or the handler changes.

### 8.3 Other Patterns Already in Use

- **Dependency Injection** (section 4) — every service and handler receives
  its dependencies as constructor parameters (`NewService(repo, ...)`, not
  package-level globals or a service locator. This is what makes Liskov
  substitution (8.1) and mocking in tests possible.
- **Repository pattern** (sections 2, 3, 7) — all persistence access goes
  through a narrow, feature-owned interface; nothing above it knows it's
  PostgreSQL.
- **Decorator pattern** (section 6) — the Chi middleware chain.
- **Adapter pattern** (section 7) — the Postgres repository implementation
  adapting `pgx`/PostGIS to the plain-Go repository interface.

None of these were introduced for their own sake — each one exists because
a concrete requirement (BR-004's extensibility, `DEPENDENCY_RULES.md`'s
isolation rules, `BACKEND_TESTING.md`'s need to test use cases without a
database) needed it. `CODING_STANDARDS.md` section 1 still applies: don't
introduce a pattern or abstraction beyond what a real requirement justifies.

---

## 9. Scope Boundary

This document does not define:

- the HTTP request/response payloads (see `API_CONTRACT.md`);
- the application-level data shapes (see `DATA_CONTRACT.md`);
- database table/column design or migrations (owned by `database/migrations`
  and future database design documentation);
- validation rules (see `BACKEND_VALIDATION.md`);
- error code mapping (see `BACKEND_ERROR_HANDLING.md`);
- naming conventions (see `BACKEND_NAMING.md`); or
- test strategy (see `BACKEND_TESTING.md`).

---

## 10. Architecture Principle

The backend stays a modular monolith organized by feature, with strict
one-directional dependencies from HTTP inward to the domain and outward again
only through repository interfaces.

> Structure the code so that the domain rules could be tested and understood
> without Chi, without `net/http`, and without PostgreSQL running.
