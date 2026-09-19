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
| `<feature>.go` | Domain types and invariants (e.g. `resource.go`, `audit.go`, `hotspot.go`; `history.go`, `user.go`, `role.go` where the domain noun differs from the package name) |
| `service.go` | Application/use-case logic |
| `repository.go` | Repository interface (defined by the feature, implemented elsewhere) |
| `<file>_test.go` | Tests for the corresponding file |

HTTP handlers and their DTOs do **not** live in the feature package. They
live in `internal/http/<feature>_handler.go` (e.g.
`internal/http/resource_handler.go`), one file per feature holding both
the handler struct and its unexported request/response DTOs, because a
feature package importing `internal/http/httpresponse` would create an
import cycle (`BACKEND_ARCHITECTURE.md` section 3). HTTP middleware,
including authentication, lives in `internal/http/middleware/<concern>.go`
(`auth.go`, `cors.go`, `logging.go`, `recovery.go`).

Repository implementations live under `internal/repository/postgres/` as
`<feature>_repository.go` (e.g. `resource_repository.go`), not inside the
feature package itself — this keeps the database driver import out of the
feature package (`BACKEND_DEPENDENCIES.md` section 4). The exception is
`user_repository.go` (implementing `auth.Repository`) and
`authorization_repository.go` (holding both `RoleRepository` and
`PermissionRepository`), named after the table/domain noun rather than the
package.

File names use `snake_case.go`, consistent with standard Go tooling
conventions (`gofmt`/`go vet` do not enforce this, but it is the prevailing
convention across the Go ecosystem and this project follows it).

---

## 4. Exported vs. Unexported Identifiers

- Export an identifier only when it is part of the package's intended public
  API, per `CODING_STANDARDS.md` section 14.
- A repository **interface** is exported (`resource.Repository`) because the
  application layer and tests depend on it.
- A repository **implementation** struct is exported (`ResourceRepository`)
  so `main.go` and the repository tests can name it; it is still only
  constructed through its constructor, which takes the package's small
  `db` interface (satisfied by both `*pgxpool.Pool` and a transaction) so
  the same implementation runs inside or outside a transaction:

```go
// internal/repository/postgres/resource_repository.go

// ResourceRepository is the PostgreSQL/PostGIS implementation of
// resource.Repository.
type ResourceRepository struct {
    db db
}

// NewResourceRepository constructs a ResourceRepository over conn.
func NewResourceRepository(conn db) *ResourceRepository {
    return &ResourceRepository{db: conn}
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
| HTTP handler struct | `<Feature>Handler` in package `internal/http` | `http.ResourceHandler`, `http.AuthHandler`, `http.HotspotHandler` |
| Application/use-case struct | `Service` (package already scopes it) | `resource.Service`, `audit.Service` |
| Repository interface | `Repository` (package-scoped), or `<Noun>Repository` when a package has more than one | `resource.Repository`; `authorization.RoleRepository`, `authorization.PermissionRepository` |
| Repository implementation | `<Feature>Repository` (exported) in package `postgres` | `postgres.ResourceRepository`, `postgres.UserRepository` |
| Constructor | `New<Type>` | `resource.NewService(...)`, `postgres.NewResourceRepository(...)`, `http.NewResourceHandler(...)` |

Handler methods are named after the operation, matching the API action, not
the HTTP verb alone: `List`, `Get`, `Create`, `Update`, `Delete`,
`ChangeStatus`, `Relocate` on `ResourceHandler`, and `Get` on
`ResourceHistoryHandler` — mirroring the endpoints in `API_CONTRACT.md`
sections 6–9.

Service methods use the same verbs, qualified with the domain noun, so the
mapping from handler to use case is immediately traceable:

```go
func (h *ResourceHandler) Relocate(w http.ResponseWriter, r *http.Request) { /* ... */ }
func (s *Service) RelocateResource(ctx context.Context, actingUserID string, actingRoleNames []string, id string, location Location) (*Resource, error) { /* ... */ }
```

Every protected use case takes the acting user's id and role names as its
first arguments after `ctx`, so it can enforce permissions and attribute
the resulting history/audit records without reaching into HTTP context.

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
// internal/http/resource_handler.go — transport types (unexported: only
// the handler in the same package ever names them)
type createResourceRequest struct {
    ID         string         `json:"id"`
    Name       string         `json:"name"`
    Type       string         `json:"type"`
    Status     string         `json:"status"`
    Attributes map[string]any `json:"attributes"`
    Location   locationDTO    `json:"location"`
}

type resourceResponse struct {
    ID         string         `json:"id"`
    Name       string         `json:"name"`
    Type       string         `json:"type"`
    Status     string         `json:"status"`
    Attributes map[string]any `json:"attributes"`
    Location   locationDTO    `json:"location"`
}
```

Naming rules:

- DTOs are suffixed `Request` / `Response` (or `DTO` for nested shapes used
  in both directions, e.g. `locationDTO`), and are unexported because they
  are only referenced from the handler file that declares them.
- Domain types carry no `json` struct tags; mapping is handled explicitly
  by conversion functions next to the DTOs (`resourceToResponse(r)`,
  `(req createResourceRequest) toDomain()`), so wire format changes do not
  ripple into the domain type.
- Timestamps are formatted with the shared `timeFormat` constant in
  `internal/http/common.go` (RFC 3339 / ISO 8601), never with ad hoc
  layouts per handler.
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
