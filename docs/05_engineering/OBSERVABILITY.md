# Observability

## 1. Purpose

This document describes what GeoResponse logs, what it must never log, and
how basic health is checked. It addresses `NFR-OBS-001` through
`NFR-OBS-003` in `NON_FUNCTIONAL_REQUIREMENTS.md`. The audit trail's data
model is in `DATA_CONTRACT.md` section 9, error-to-status mapping is in
`docs/07_backend/BACKEND_ERROR_HANDLING.md`, and container health-check
wiring is in `docs/11_devops/DEPLOYMENT.md`.

---

## 2. Principles

- **Sized to the system.** GeoResponse is a modular monolith with one
  backend, one frontend, and one database. No request crosses services, so
  distributed tracing is not needed.
- **Structured logs.** Log entries have consistent fields (timestamp,
  level, message, context) instead of free-form strings, so they stay
  searchable.
- **Signal over noise.** Log requests, failures, and meaningful lifecycle
  events, not every function call.

---

## 3. Backend Logging

The backend logs JSON to stdout through `log/slog`, configured in
`internal/platform/logging`. The minimum level comes from `LOG_LEVEL`
(`debug`, `info`, `warn`, `error`; default `info`).

### 3.1 Request Logging

The `Logging` middleware (`internal/http/middleware/logging.go`) is
mounted on the Chi router after Chi's `RequestID` middleware
(`internal/http/router.go`). It writes one `http_request` entry per request
with:

```text
method
path
status
duration
request_id
```

The middleware also attaches the logger to the request context so later
code can log with it.

### 3.2 Error Logging

Errors are logged once, where they are handled, not at every layer they
pass through:

- `httpresponse.WriteError` logs any error that has no mapped error code as
  `unhandled error`, with the full wrapped (`%w`) error chain, before
  returning a generic `500`. The wrapped messages carry the operation
  context (e.g. `create resource: ...`).
- The `Recovery` middleware logs a recovered panic as `panic recovered`.
- Mapped client errors (`4xx`) are not logged separately; their status
  appears in the request log entry.

Start-up, migration, and shutdown events are logged from `cmd/api/main.go`.

### 3.3 Business Events

The backend does not write separate log entries for business events.
Resource changes and role/permission changes are recorded durably in the
audit trail and resource history (`DATA_CONTRACT.md` sections 8 and 9),
which is the queryable record of who did what. Authentication failures and
authorization denials are visible only as `401` and `403` request log
entries.

### 3.4 Log Levels

```text
debug  verbose detail, local development only
info   normal request/operation completion, lifecycle events
warn   recoverable or unexpected condition that does not fail the request
error  request failed, operation could not complete
```

---

## 4. Frontend Logging

The frontend uses the `logger` utility in `georesponse-fe/src/utils/logger/`:

```ts
logger.info(message, context, data)
logger.warn(message, context, data)
logger.error(message, context, error)
logger.debug(message, context, data)
```

Each call produces a structured entry (`timestamp`, `level`, `message`,
optional `context`, and for `error`, the captured stack) instead of a bare
`console.log`.

- Use `logger.error` for failed API calls, map adapter failures, and
  unhandled component errors, with a `context` string naming the module
  (e.g. `"resourceApi"`, `"mapAdapter"`).
- Use `logger.warn` for degraded but recoverable conditions (e.g. a map
  layer failing to load while the rest of the map works).
- Use `logger.info` sparingly, for meaningful lifecycle events, not
  routine renders or state updates.
- Do not add raw `console.*` calls where `logger` covers the need, so
  output stays consistent and filterable by level.

---

## 5. What Must Not Be Logged

In any layer, never log:

- passwords, tokens, or any authentication credential, plaintext or hashed
- full request or response bodies containing credentials
- secrets or configuration values from environment variables
  (`docs/11_devops/ENVIRONMENT_MANAGEMENT.md`)
- personal information beyond what is needed to trace an operation (log a
  user ID, not a profile)
- raw database connection strings

This supports `NFR-SEC-004` (Credential Protection) and `NFR-OBS-002`
(Request Traceability).

---

## 6. Health Checks

`GET /health` reports whether the backend process is running and can reach
its database (a connection-pool ping); there are no other downstream
dependencies to report on. The response shape is in `API_CONTRACT.md`
section 2, and its use during deployment and in Docker Compose is in
`docs/11_devops/DEPLOYMENT.md` section 6. This addresses `NFR-AVAIL-002`
and `NFR-DEP-005`.

---

## 7. Out of Scope

The following are not introduced at the current scope, in line with
`TECHNOLOGY_SELECTION.md` section 3.6 (avoid premature infrastructure):

- an APM (Application Performance Monitoring) platform
- distributed tracing (OpenTelemetry spans across services)
- a metrics stack (Prometheus/Grafana or equivalent)
- centralized log aggregation (ELK, Loki, or equivalent)
- alerting or paging

Structured logs, the audit trail, and the health endpoint give enough
visibility for a single-service system. Revisit this list if GeoResponse
grows to multiple deployed services or a production on-call rotation.
