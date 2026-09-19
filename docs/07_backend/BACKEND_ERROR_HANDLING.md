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

func (r *ResourceRepository) FindByID(ctx context.Context, id string) (*resource.Resource, error) {
    row := r.pool.QueryRow(ctx, findResourceByIDQuery, id)

    res, err := scanResource(row)
    if errors.Is(err, pgx.ErrNoRows) {
        return nil, fmt.Errorf("find resource %q: %w", id, resource.ErrNotFound)
    }
    if err != nil {
        return nil, fmt.Errorf("find resource %q: %w", id, err)
    }

    return res, nil
}
```

Unclassified persistence failures (connection errors, unexpected driver
errors) are wrapped and returned as-is; the application/handler layer treats
anything it does not specifically recognize as a persistence failure
(`PERSISTENCE_ERROR`).

---

## 4. Domain / Application Layer

The domain package defines sentinel errors for conditions the application
must react to distinctly:

```go
// internal/resource/resource.go

var (
    ErrNotFound         = errors.New("resource not found")
    ErrInvalidType       = errors.New("invalid resource type")
    ErrInvalidStatus     = errors.New("invalid resource status")
    ErrInvalidLocation   = errors.New("invalid geographic location")
)
```

The application/use-case layer wraps errors with operation context as they
cross its boundary, and does not discard the underlying cause:

```go
// internal/resource/service.go

func (s *Service) Relocate(ctx context.Context, id string, loc Location) (*Resource, error) {
    if err := loc.Validate(); err != nil {
        return nil, fmt.Errorf("relocate resource %q: %w", id, err)
    }

    res, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("relocate resource %q: %w", id, err)
    }

    // ... apply relocation, persist history + audit record
    return res, nil
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
// internal/http/httpresponse/error.go

func WriteError(w http.ResponseWriter, err error) {
    switch {
    case errors.Is(err, resource.ErrNotFound):
        writeJSONError(w, http.StatusNotFound, "RESOURCE_NOT_FOUND", "Resource not found", nil)

    case errors.Is(err, resource.ErrInvalidType):
        writeJSONError(w, http.StatusBadRequest, "INVALID_RESOURCE_TYPE", "Invalid resource type", nil)

    case errors.Is(err, resource.ErrInvalidStatus):
        writeJSONError(w, http.StatusBadRequest, "INVALID_RESOURCE_STATUS", "Invalid resource status", nil)

    case errors.Is(err, resource.ErrInvalidLocation):
        writeJSONError(w, http.StatusBadRequest, "INVALID_LOCATION", "Invalid geographic coordinates", nil)

    case errors.As(err, &validationErr):
        writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid resource data", validationErr.Details())

    case errors.Is(err, auth.ErrInvalidCredentials):
        writeJSONError(w, http.StatusUnauthorized, "AUTHENTICATION_FAILED", "Invalid credentials", nil)

    case errors.Is(err, authorization.ErrPermissionDenied):
        writeJSONError(w, http.StatusForbidden, "AUTHORIZATION_DENIED", "Permission denied", nil)

    default:
        // Unrecognized error: log with full detail, return a generic
        // persistence/server error without leaking internals.
        logging.FromContext(r.Context()).Error("unhandled error", "error", err)
        writeJSONError(w, http.StatusInternalServerError, "PERSISTENCE_ERROR", "Unexpected server error", nil)
    }
}
```

Handlers call this at their single error-return point:

```go
// internal/resource/handler.go

func (h *Handler) Relocate(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")

    var req RelocateRequest
    if err := decodeJSON(r, &req); err != nil {
        httpresponse.WriteError(w, fmt.Errorf("decode relocate request: %w", validationError(err)))
        return
    }

    res, err := h.service.Relocate(r.Context(), id, req.ToLocation())
    if err != nil {
        httpresponse.WriteError(w, err)
        return
    }

    httpresponse.WriteData(w, http.StatusOK, res.ToResponse())
}
```

This keeps the mapping table (error → code → HTTP status) in one place
instead of duplicated across every handler.

---

## 6. Error Code Mapping Reference

| Domain condition | Error code | HTTP status |
|---|---|---|
| Structural/field validation failure | `VALIDATION_ERROR` | 400 |
| Invalid resource type | `INVALID_RESOURCE_TYPE` | 400 |
| Invalid resource status | `INVALID_RESOURCE_STATUS` | 400 |
| Invalid latitude/longitude | `INVALID_LOCATION` | 400 |
| No/invalid credentials | `AUTHENTICATION_FAILED` | 401 |
| Authenticated but not permitted | `AUTHORIZATION_DENIED` | 403 |
| Resource/entity does not exist | `RESOURCE_NOT_FOUND` | 404 |
| Unrecognized/persistence failure | `PERSISTENCE_ERROR` | 500 |

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
                logging.FromContext(r.Context()).Error("panic recovered", "panic", rec)
                httpresponse.WriteError(w, fmt.Errorf("unexpected failure: %v", rec))
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
