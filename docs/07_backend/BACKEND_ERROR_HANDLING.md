# Backend Error Handling

## 1. Purpose

This document expands `CODING_STANDARDS.md` section 10 (Go rules) into a
full error-handling strategy for `georesponse-be`: how errors are created and
wrapped as they cross layers, how they are translated into the
`API_CONTRACT.md` error contract, and what must never reach the client.

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

Each layer only translates the error, it does not swallow it. The original
error is preserved with `%w` so it remains inspectable with `errors.Is` /
`errors.As`, per `CODING_STANDARDS.md` section 10.

---

## 3. Repository Layer

The repository implementation is the only place that sees raw driver/SQL
errors (`pgx` errors, constraint violations, connection failures). It must
translate them into domain-meaningful sentinel or typed errors before
returning to the application layer — it must not return a raw `pgx` error
up through the use case.

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
not as an HTTP status code — the domain layer has no notion of HTTP.

---

## 5. Handler Layer: Centralized Translation

Handlers do not each hand-roll their own error-to-response logic. A single
translation function in `internal/http/httpresponse` maps known domain
errors to the `API_CONTRACT.md` error contract:

```go
// internal/http/httpresponse/error.go (abridged)

func WriteError(w http.ResponseWriter, r *http.Request, err error) {
    var validationErr *ValidationError

    switch {
    case errors.Is(err, resource.ErrNotFound), errors.Is(err, auth.ErrNotFound), errors.Is(err, authorization.ErrNotFound):
        writeError(w, http.StatusNotFound, "RESOURCE_NOT_FOUND", "The requested resource does not exist", nil)
    case errors.Is(err, resource.ErrIDConflict):
        writeError(w, http.StatusConflict, "RESOURCE_ID_CONFLICT", "A resource with this id already exists", nil)
    case errors.Is(err, resource.ErrInvalidType):
        writeError(w, http.StatusBadRequest, "INVALID_RESOURCE_TYPE", "Resource type is missing or not recognized", nil)
    case errors.Is(err, resource.ErrInvalidStatus):
        writeError(w, http.StatusBadRequest, "INVALID_RESOURCE_STATUS", "Resource status is missing or not recognized", nil)
    case errors.Is(err, resource.ErrInvalidLocation):
        writeError(w, http.StatusBadRequest, "INVALID_LOCATION", "Geographic coordinates are missing or out of range", nil)
    case errors.As(err, &validationErr):
        writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Request data does not satisfy validation rules", validationErr.Details())
    case errors.Is(err, resource.ErrMissingID), errors.Is(err, resource.ErrMissingName),
        errors.Is(err, resource.ErrMissingAttribute), errors.Is(err, resource.ErrInvalidAttribute),
        errors.Is(err, authorization.ErrNameConflict):
        writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Request data does not satisfy validation rules", nil)
    case errors.Is(err, auth.ErrInvalidCredentials), errors.Is(err, auth.ErrInvalidToken):
        writeError(w, http.StatusUnauthorized, "AUTHENTICATION_FAILED", "Authentication failed", nil)
    case errors.Is(err, authorization.ErrPermissionDenied):
        writeError(w, http.StatusForbidden, "AUTHORIZATION_DENIED", "You do not have permission to perform this operation", nil)
    case errors.Is(err, hotspot.ErrUpstreamUnavailable):
        writeError(w, http.StatusBadGateway, "HOTSPOT_UPSTREAM_UNAVAILABLE", "BMKG hotspot data is temporarily unavailable", nil)
    default:
        // Unrecognized error: log with full detail, return a generic
        // persistence/server error without leaking internals.
        logging.FromContext(r.Context()).Error("unhandled error", "error", err)
        writeError(w, http.StatusInternalServerError, "PERSISTENCE_ERROR", "The operation could not be completed", nil)
    }
}
```

`WriteError` takes the request so it can reach the request-scoped logger
(request ID included) for the `default` branch. Handlers call it at their
single error-return point, and decode bodies through
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

This keeps the mapping table (error → code → HTTP status) in one place
instead of duplicated across every handler.

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

The full code list is owned by `API_CONTRACT.md` section 13; this table only
records the mapping to Go error values and HTTP statuses used in the handler
translation layer.

---

## 7. Not Leaking Internal Details

- Raw SQL errors, driver error strings, stack traces, and file paths must
  never appear in the `message` or `details` fields of a client-facing error
  response.
- `details` carries structured, field-level validation information (see
  `BACKEND_VALIDATION.md`), not free-form internal diagnostics.
- The `default` branch in the translation layer is intentionally generic:
  an unrecognized error becomes `PERSISTENCE_ERROR` with a fixed message,
  regardless of what the underlying error actually says.

---

## 8. Server-Side Logging vs. Client-Facing Contract

These are two distinct outputs from the same error and must not be
conflated:

```text
error
  ├── Server log (structured, full detail: stack context, wrapped chain,
  │    request ID, user ID when available) — for operators/debugging
  └── HTTP response (API_CONTRACT.md envelope: code, human message,
       field-level details) — for the client
```

Every error that reaches the `default` branch of the translation layer (i.e.
every error not specifically recognized) is logged server-side with its full
wrapped chain before a generic response is returned. Recognized domain
errors (`RESOURCE_NOT_FOUND`, validation errors, etc.) represent expected
outcomes and do not need error-level logging; they may be logged at a lower
level (e.g. debug/info) if request tracing is useful.

---

## 9. Panic Recovery

A recovery middleware sits early in the middleware chain
(`BACKEND_ARCHITECTURE.md` section 6) and converts an unrecovered panic into
a `500 PERSISTENCE_ERROR`-style response instead of crashing the process:

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

Panic recovery exists for genuinely unexpected failures (e.g. a nil
dereference caused by a bug). It must not become a substitute for returning
errors: expected failure paths (not found, validation, invalid state) are
always returned as `error` values per `CODING_STANDARDS.md` section 10 ("Return
errors instead of using `panic` for expected runtime failures"), never
triggered via panic.

---

## 10. Scope Boundary

This document does not define:

- the full list of error codes (see `API_CONTRACT.md` section 13);
- field-level validation rules (see `BACKEND_VALIDATION.md`);
- logging infrastructure/format configuration beyond the split described in
  section 8;
- retry or circuit-breaker behavior (not required by current scope).

---

## 11. Error Handling Principle

An error is translated exactly once, at a single boundary, into the stable
client contract — and never loses its original cause on the way there.

> The client sees a stable code and a safe message. The server log sees
> everything.
