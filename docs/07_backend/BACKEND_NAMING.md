# Backend Naming

## 1. Purpose

This document defines Go-specific naming conventions for `georesponse-be`,
extending `CODING_STANDARDS.md` sections 3, 4, and 14 with concrete backend
patterns for packages, files, handlers, use cases, repositories, and tests.

---

## 2. Package Naming

- Package names are short, lowercase, single words, no underscores and no
  `mixedCaps`: `resource`, `auth`, `authorization`, `audit`, `postgres`,
  `httpresponse`.
- The package name should read naturally with its exported identifiers from
  the caller's side: `resource.Service`, `postgres.NewResourceRepository`,
  not `resourcepkg.ResourceService`.
- Avoid generic package names such as `util`, `common`, or `helpers`. If code
  does not clearly belong to a feature package, it belongs in
  `internal/platform/<concern>` (e.g. `internal/platform/logging`), named
  after the concern it addresses.
- Do not name a package after its layer alone (e.g. no package literally
  called `service` or `handler`); the feature name (`resource`, `auth`) is
  the package, and layer is expressed through the file within it
  (`service.go`, `handler.go`).

---

## 3. File Naming

Within a feature package:

| File | Contents |
|---|---|
| `<feature>.go` | Domain types and invariants (e.g. `resource.go`) |
| `service.go` | Application/use-case logic |
| `repository.go` | Repository interface (defined by the feature, implemented elsewhere) |
| `handler.go` | HTTP handlers for the feature |
| `dto.go` | Request/response DTOs |
| `middleware.go` | Feature-specific middleware, if any (e.g. `auth/middleware.go`) |
| `<file>_test.go` | Tests for the corresponding file |

Repository implementations live under `internal/repository/postgres/` as
`<feature>_repository.go` (e.g. `resource_repository.go`), not inside the
feature package itself — this keeps the database driver import out of the
feature package (`BACKEND_DEPENDENCIES.md` section 4).

File names use `snake_case.go`, consistent with standard Go tooling
conventions (`gofmt`/`go vet` do not enforce this, but it is the prevailing
convention across the Go ecosystem and this project follows it).

---

## 4. Exported vs. Unexported Identifiers

- Export an identifier only when it is part of the package's intended public
  API, per `CODING_STANDARDS.md` section 14.
- A repository **interface** is exported (`resource.Repository`) because the
  application layer and tests depend on it.
- A repository **implementation** struct may be unexported when it is only
  ever constructed through an exported constructor:

```go
// internal/repository/postgres/resource_repository.go

type resourceRepository struct {
    pool *pgxpool.Pool
}

// NewResourceRepository creates a PostgreSQL-backed implementation of
// resource.Repository.
func NewResourceRepository(pool *pgxpool.Pool) resource.Repository {
    return &resourceRepository{pool: pool}
}
```

- Sentinel/domain errors are exported (`resource.ErrNotFound`) because
  callers across layers need to compare against them with `errors.Is`.
- Internal helper functions (SQL query builders, response encoders used only
  within one file) remain unexported.

---

## 5. Handler / Use Case / Repository Naming Pattern

| Concept | Pattern | Example |
|---|---|---|
| HTTP handler struct | `<Feature>Handler` | `resource.Handler` (package already scopes it, so within `resource` it is just `Handler`; referenced externally as `resource.Handler`) |
| Application/use-case struct | `<Feature>Service` | `resource.Service` |
| Repository interface | `<Feature>Repository` | `resource.Repository` |
| Repository implementation | `<feature>Repository` (unexported) or `postgres<Feature>Repository` if exported is needed | `resourceRepository` in `internal/repository/postgres` |
| Constructor | `New<Type>` | `resource.NewService(...)`, `postgres.NewResourceRepository(...)` |

Handler methods are named after the operation, matching the API action, not
the HTTP verb alone: `List`, `Get`, `Create`, `Update`, `Delete`,
`ChangeStatus`, `Relocate`, `History` — mirroring the endpoints in
`API_CONTRACT.md` sections 6–9.

Service methods use the same verbs so the mapping from handler to use case
is immediately traceable:

```go
func (h *Handler) Relocate(w http.ResponseWriter, r *http.Request) { /* ... */ }
func (s *Service) Relocate(ctx context.Context, id string, loc Location) (*Resource, error) { /* ... */ }
```

---

## 6. Domain Types vs. Request/Response DTOs

Domain structures and transport (DTO) structures are named distinctly and
kept in separate files, per `CODING_STANDARDS.md` section 8 (Go: "Keep
transport/request/response structures separate from domain structures when
appropriate"):

```go
// internal/resource/resource.go — domain type
type Resource struct {
    ID         string
    Name       string
    Type       Type
    Status     Status
    Attributes map[string]any
    Location   Location
    UpdatedAt  time.Time
}
```

```go
// internal/resource/dto.go — transport types
type CreateResourceRequest struct {
    ID         string         `json:"id"`
    Name       string         `json:"name"`
    Type       string         `json:"type"`
    Status     string         `json:"status"`
    Attributes map[string]any `json:"attributes"`
    Location   LocationDTO    `json:"location"`
}

type ResourceResponse struct {
    ID         string         `json:"id"`
    Name       string         `json:"name"`
    Type       string         `json:"type"`
    Status     string         `json:"status"`
    Attributes map[string]any `json:"attributes"`
    Location   LocationDTO    `json:"location"`
    UpdatedAt  time.Time      `json:"updatedAt"`
}
```

Naming rules:

- DTOs are suffixed `Request` / `Response` (or `DTO` for nested shapes used
  in both directions, e.g. `LocationDTO`).
- Domain types carry no `json` struct tags beyond what is unavoidable;
  preferably none, with mapping handled explicitly in `dto.go` conversion
  functions (`ToResponse()`, `(r CreateResourceRequest) ToDomain()`), so
  wire format changes do not ripple into the domain type.
- Field names in DTOs mirror `DATA_CONTRACT.md`'s `camelCase` JSON naming
  exactly.

---

## 7. General Naming (from Coding Standards)

`CODING_STANDARDS.md` section 4 already covers nouns-for-types,
verbs-for-functions, and avoiding generic names/unestablished abbreviations;
those rules apply to Go as written and are not restated here. The one
backend-specific addition `CODING_STANDARDS.md` does not cover is Go
constant casing:

- Constants use `SCREAMING_SNAKE_CASE` only when mirroring an external
  contract value verbatim (e.g. HTTP header names); ordinary Go constants use
  `PascalCase` or `camelCase` per Go convention and are grouped by concern:

```go
type Status string

const (
    StatusAvailable   Status = "AVAILABLE"
    StatusInUse       Status = "IN_USE"
    StatusMaintenance Status = "MAINTENANCE"
    StatusUnavailable Status = "UNAVAILABLE"
)
```

---

## 8. Test File and Test Case Naming

- Test files are named `<file>_test.go`, colocated with the file under test
  (`CODING_STANDARDS.md` section 15).
- Test functions: `Test<Type>_<Method>` or `Test<Function>` —
  `TestService_Relocate`, `TestValidateLocation`.
- Table-driven tests use a `tests` (or `cases`) slice of anonymous structs
  with a `name` field describing the scenario in plain language, and
  `t.Run(tt.name, ...)`:

```go
func TestValidateLocation(t *testing.T) {
    tests := []struct {
        name    string
        lat     float64
        lng     float64
        wantErr error
    }{
        {name: "valid coordinates", lat: -6.9147, lng: 107.6098, wantErr: nil},
        {name: "latitude above range", lat: 90.1, lng: 0, wantErr: resource.ErrInvalidLocation},
        {name: "longitude below range", lat: 0, lng: -180.1, wantErr: resource.ErrInvalidLocation},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := resource.ValidateLocation(tt.lat, tt.lng)
            if !errors.Is(err, tt.wantErr) && tt.wantErr != nil {
                t.Fatalf("got %v, want %v", err, tt.wantErr)
            }
        })
    }
}
```

Test case names describe the scenario being verified (`"latitude above
range"`), not the assertion mechanics (`"test case 1"`).

---

## 9. Scope Boundary

This document does not define:

- database table/column naming (owned by future database design
  documentation);
- JSON field naming for the API (owned by `DATA_CONTRACT.md` section 2);
- frontend naming conventions (owned by `CODING_STANDARDS.md` section 4,
  TypeScript/React subsections).

---

## 10. Naming Principle

A name should tell a reader which layer it belongs to and what it is
responsible for, without needing to open the file.

> If a name needs a comment to explain what kind of thing it is, the name is
> wrong.
