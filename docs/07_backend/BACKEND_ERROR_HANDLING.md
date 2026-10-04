# Backend Error Handling

## 1. Purpose

This document describes error handling in `georesponse-be`: how errors are
created and wrapped as they cross layers, how they are translated into the
API error contract, and what must never reach the client. It applies the
Go rules in `CODING_STANDARDS.md` section 10. The full list of error codes
is owned by `API_CONTRACT.md` section 13, and field-level validation rules
by `BACKEND_VALIDATION.md`. Retry and circuit-breaker behavior is not
required at the current scope.

---

## 2. Error Flow Across Layers

```text
Repository Implementation
   (raw driver / SQL error)
        ↓  wrap with context, classify
Domain / Application Error
   (sentinel or typed error, e.g. resource.ErrNotFound)
        ↓  map to API error code + HTTP status
HTTP Handler
        ↓
{"error": {"code", "message", "details"}}
```

Each layer translates the error and never swallows it. The original error
is preserved with `%w` so it stays inspectable with `errors.Is` /
`errors.As`.

---

## 3. Repository Layer

The repository implementation is the only place that sees raw driver/SQL
errors (`pgx` errors, constraint violations, connection failures). It
translates the conditions the application must react to into domain
sentinel errors, so the use case never has to inspect a `pgx` error.

```go
// internal/repository/postgres/resource_repository.go

func (r *ResourceRepository) GetByID(ctx context.Context, id string) (*resource.Resource, error) {
    query := fmt.Sprintf("SELECT %s FROM resources WHERE id = $1", selectResourceColumns)

    res, err := scanResource(activeConn(ctx, r.db).QueryRow(ctx, query, id))
    if errors.Is(err, pgx.ErrNoRows) {
        return nil, fmt.Errorf("get resource %q: %w", id, resource.ErrNotFound)
    }
    if err != nil {
        return nil, fmt.Errorf("get resource %q: %w", id, err)
    }

    return res, nil
}
```

A unique-constraint violation on insert is classified the same way, into
`resource.ErrIDConflict` (→ `409 RESOURCE_ID_CONFLICT`) or
`authorization.ErrNameConflict` (→ `400 VALIDATION_ERROR`).

Unclassified persistence failures (connection errors, unexpected driver
errors) are wrapped and returned as-is; the application/handler layer treats
anything it does not specifically recognize as a persistence failure
(`PERSISTENCE_ERROR`).

---

## 4. Domain / Application Layer

The domain package defines sentinel errors for conditions the application
must react to distinctly:

```go
// internal/resource/resource.go, location.go, attribute_validator.go

var (
    ErrMissingID        = errors.New("resource: id must not be empty")
    ErrMissingName      = errors.New("resource: name must not be empty")
    ErrInvalidType      = errors.New("resource: type is not a recognized resource type")
    ErrInvalidStatus    = errors.New("resource: status is not a recognized resource status")
    ErrInvalidLocation  = errors.New("resource: location coordinates are out of valid range")
    ErrMissingAttribute = errors.New("resource: required attribute is missing")
    ErrInvalidAttribute = errors.New("resource: attribute has an invalid value")
    ErrNotFound         = errors.New("resource: not found")
    ErrIDConflict       = errors.New("resource: id already in use")
)
```

Other packages follow the same `<package>: ...` message convention
(`auth.ErrInvalidCredentials`, `auth.ErrInvalidToken`, `auth.ErrNotFound`,
`authorization.ErrPermissionDenied`, `authorization.ErrNotFound`,
`authorization.ErrNameConflict`, `hotspot.ErrUpstreamUnavailable`).

The application/use-case layer wraps errors with operation context as they
cross its boundary, and does not discard the underlying cause:

```go
// internal/resource/service.go

func (s *Service) RelocateResource(ctx context.Context, actingUserID string, actingRoleNames []string, id string, location Location) (*Resource, error) {
    if err := s.checker.Require(ctx, actingRoleNames, PermissionResourceUpdate); err != nil {
        return nil, err
    }
    if err := location.Validate(); err != nil {
        return nil, err
    }

    current, err := s.repo.GetByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("relocate resource %q: %w", id, err)
    }

    // ... within one transaction: update location, record location
    // history, record RESOURCE_RELOCATED audit entry
    return current, nil
}
```

Business-rule violations (e.g. BR-010 invalid coordinates) are returned as
the corresponding domain sentinel/typed error, not as a raw string error and
not as an HTTP status code. The domain layer has no notion of HTTP.

---

## 5. Handler Layer: Centralized Translation

Handlers do not write their own error responses. A single function,
`WriteError` in `internal/http/httpresponse/error.go`, maps known errors to
the error contract with one `switch` over `errors.Is` / `errors.As`
(section 6 lists every case). Its shape:

```go
// internal/http/httpresponse/error.go (excerpt)
func WriteError(w http.ResponseWriter, r *http.Request, err error) {
    var validationErr *ValidationError

    switch {
    case errors.Is(err, resource.ErrNotFound),
        errors.Is(err, auth.ErrNotFound),
        errors.Is(err, authorization.ErrNotFound):
        writeError(w, http.StatusNotFound, "RESOURCE_NOT_FOUND", "The requested resource does not exist", nil)

    case errors.As(err, &validationErr):
        writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Request data does not satisfy validation rules", validationErr.Details())

    // ... one case per row of the table in section 6

    default:
        logging.FromContext(r.Context()).Error("unhandled error", "error", err)
        writeError(w, http.StatusInternalServerError, "PERSISTENCE_ERROR", "The operation could not be completed", nil)
    }
}
```

`WriteError` takes the request so the `default` branch can log through the
logger the Logging middleware attached to the request context. Handlers
call it at each error return, and decode bodies through
`httpresponse.DecodeJSON`, which already returns a `*ValidationError`:

```go
// internal/http/resource_handler.go

func (h *ResourceHandler) Relocate(w http.ResponseWriter, r *http.Request) {
    userID, roleNames := actorFromRequest(r)
    id := chi.URLParam(r, "id")

    var req relocateRequest
    if err := httpresponse.DecodeJSON(r, &req); err != nil {
        httpresponse.WriteError(w, r, err)
        return
    }

    res, err := h.service.RelocateResource(r.Context(), userID, roleNames, id, resource.Location{Latitude: req.Latitude, Longitude: req.Longitude})
    if err != nil {
        httpresponse.WriteError(w, r, err)
        return
    }
    httpresponse.WriteData(w, http.StatusOK, resourceToResponse(*res))
}
```

The mapping from error to code to HTTP status therefore lives in one place.

---

## 6. Error Code Mapping Reference

| Domain condition | Go error value(s) | Error code | HTTP status |
|---|---|---|---|
| Malformed body / unknown field (with `details`) | `*httpresponse.ValidationError` | `VALIDATION_ERROR` | 400 |
| Missing id/name, bad attribute, role name conflict (no `details`) | `resource.ErrMissingID`, `ErrMissingName`, `ErrMissingAttribute`, `ErrInvalidAttribute`, `authorization.ErrNameConflict` | `VALIDATION_ERROR` | 400 |
| Invalid resource type | `resource.ErrInvalidType` | `INVALID_RESOURCE_TYPE` | 400 |
| Invalid resource status | `resource.ErrInvalidStatus` | `INVALID_RESOURCE_STATUS` | 400 |
| Invalid latitude/longitude | `resource.ErrInvalidLocation` | `INVALID_LOCATION` | 400 |
| No/invalid credentials, missing/invalid/expired token | `auth.ErrInvalidCredentials`, `auth.ErrInvalidToken` | `AUTHENTICATION_FAILED` | 401 |
| Authenticated but not permitted | `authorization.ErrPermissionDenied` | `AUTHORIZATION_DENIED` | 403 |
| Resource, user, role, or permission does not exist | `resource.ErrNotFound`, `auth.ErrNotFound`, `authorization.ErrNotFound` | `RESOURCE_NOT_FOUND` | 404 |
| Duplicate resource id | `resource.ErrIDConflict` | `RESOURCE_ID_CONFLICT` | 409 |
| Unrecognized/persistence failure, recovered panic | anything else | `PERSISTENCE_ERROR` | 500 |
| BMKG unreachable and nothing cached | `hotspot.ErrUpstreamUnavailable` | `HOTSPOT_UPSTREAM_UNAVAILABLE` | 502 |

The code definitions are owned by `API_CONTRACT.md` section 13; this table
records only the mapping to Go error values and HTTP statuses.

---

## 7. Not Leaking Internal Details

- Raw SQL errors, driver error strings, stack traces, and file paths must
  never appear in the `message` or `details` fields of a client-facing error
  response.
- `details` carries structured, field-level validation information (see
  `BACKEND_VALIDATION.md`), not free-form internal diagnostics.
- The `default` branch is generic: an unrecognized error becomes
  `PERSISTENCE_ERROR` with a fixed message, whatever the underlying error
  says.

---

## 8. Server-Side Logging vs. Client-Facing Contract

The same error produces two separate outputs:

```text
error
  ├── Server log: structured JSON with the full wrapped error chain,
  │    for operators and debugging
  └── HTTP response: API_CONTRACT.md envelope (code, safe message,
       field-level details), for the client
```

Every error that reaches the `default` branch of `WriteError` is logged at
error level with its full wrapped chain before the generic response is
returned. That log line does not carry the request ID itself; the access
log line the Logging middleware writes for the same request does
(`request_id`, method, path, status, duration). Recognized domain errors
(`RESOURCE_NOT_FOUND`, validation errors, and so on) are expected outcomes
and are not logged at error level.

---

## 9. Panic Recovery

The recovery middleware sits early in the middleware chain
(`BACKEND_ARCHITECTURE.md` section 6) and turns an unrecovered panic into a
`500 PERSISTENCE_ERROR` response instead of crashing the process:

```go
// internal/http/middleware/recovery.go

func Recovery(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if rec := recover(); rec != nil {
                logging.FromContext(r.Context()).Error("panic recovered", "panic", fmt.Sprintf("%v", rec))
                httpresponse.WriteError(w, r, fmt.Errorf("unexpected failure: %v", rec))
            }
        }()
        next.ServeHTTP(w, r)
    })
}
```

Panic recovery is for genuinely unexpected failures, such as a nil
dereference caused by a bug. Expected failure paths (not found, validation,
invalid state) are always returned as `error` values, never raised with
`panic` (`CODING_STANDARDS.md` section 10).
