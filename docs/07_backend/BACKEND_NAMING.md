# Backend Naming

## 1. Purpose

This document defines the Go naming conventions for `georesponse-be`:
packages, files, handlers, use cases, repositories, DTOs, and tests. General
casing rules are in `CODING_STANDARDS.md` section 4 and Go rules in
section 14. Database table and column naming is in
`docs/08_database/DATABASE_SCHEMA.md` section 2, JSON field naming in
`DATA_CONTRACT.md` section 2, and the frontend counterpart of this document
is `docs/06_frontend/FRONTEND_NAMING.md`.

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
- Do not name a package after its layer alone (no package literally called
  `service` or `handler`). The feature name (`resource`, `auth`) is the
  package, and the layer is expressed by the file within it (`service.go`,
  `repository.go`). HTTP handlers are the exception: they live in
  `internal/http`, not in the feature package (section 3).

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
feature package, which keeps the database driver import out of the feature
package (`BACKEND_DEPENDENCIES.md` section 4). Two files differ from the
pattern: `user_repository.go` implements `auth.Repository` and is named
after the domain noun rather than the package, and
`authorization_repository.go` holds both `RoleRepository` and
`PermissionRepository`. The BMKG hotspot implementation follows the same
pattern under `internal/repository/bmkg/`.

File names use `snake_case.go`. Go tooling does not enforce this, but it is
the prevailing Go convention.

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
`ResourceHistoryHandler`, mirroring the endpoints in `API_CONTRACT.md`
sections 6 to 9.

Service methods use the same verbs qualified with the domain noun, so each
handler maps visibly to its use case:

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
kept in separate files (`CODING_STANDARDS.md` section 8):

```go
// internal/resource/resource.go: domain type
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
// internal/http/resource_handler.go: transport types (unexported, only
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
  `internal/http/common.go` (RFC 3339 / ISO 8601), never with a per-handler
  layout.
- Field names in DTOs mirror `DATA_CONTRACT.md`'s `camelCase` JSON naming
  exactly.

---

## 7. Constants

General naming rules (nouns for types, verbs for functions, no generic names
or unestablished abbreviations) are in `CODING_STANDARDS.md` section 4 and
apply to Go unchanged. The Go-specific addition is constant casing:
ordinary constants use `PascalCase` or `camelCase` per Go convention and are
grouped by concern. `SCREAMING_SNAKE_CASE` is used only when mirroring an
external contract value verbatim (e.g. HTTP header names).

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

- Test files are named `<file>_test.go` and colocated with the file under
  test.
- Test functions are named `Test<Type>_<Method>` or `Test<Function>`, with
  an optional scenario suffix: `TestLocation_Validate`,
  `TestValidateLocation`,
  `TestService_RelocateResource_PreservesIdentityTypeStatus`.
- Table-driven tests use a `tests` (or `cases`) slice of anonymous structs
  with a `name` field and `t.Run(tt.name, ...)`. See `BACKEND_TESTING.md`
  section 3 for an example.
- Test case names describe the scenario being verified
  (`"latitude above 90"`), not the assertion mechanics (`"test case 1"`).
