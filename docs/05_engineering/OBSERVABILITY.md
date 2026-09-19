# Observability

## 1. Purpose

This document defines the observability approach for GeoResponse: what the system logs, what it deliberately does not log, and how basic operational health is verified.

Observability here is scoped proportionately to a take-home project running as a modular monolith with a single deployment target. It satisfies `NFR-OBS-001` through `NFR-OBS-003` in `NON_FUNCTIONAL_REQUIREMENTS.md` without introducing infrastructure the project's scope does not justify.

---

## 2. Observability Principles

### 2.1 Proportionate to Scope

GeoResponse is a modular monolith with one backend service, one frontend, and one database. It does not run distributed transactions across services, so it does not need distributed tracing to reconstruct a request's path.

### 2.2 Structured Over Ad Hoc

Logs are structured (consistent fields: timestamp, level, message, context) rather than free-form strings, so they remain greppable and consistent across the codebase.

### 2.3 Signal Over Noise

Logging targets requests, errors, and meaningful business events — not every function call. Excessive logging is as harmful to observability as too little, because it buries the signal that actually matters during debugging.

---

## 3. Backend Logging

### 3.1 Request Logging

The backend applies a request-logging middleware at the HTTP boundary (Chi middleware chain, per `SYSTEM_ARCHITECTURE.md` section 4). Each request logs, at minimum:

```text
method
path
status code
duration
```

### 3.2 Error Logging

Errors are logged with context at the boundary where they are handled (typically the handler, per the error flow in `BACKEND_ERROR_HANDLING.md`), including:

- the wrapped error chain (`%w`), preserving the original cause;
- the operation being performed (e.g. `create resource`, `relocate resource`);
- the relevant identifier (resource ID, user ID) where available and non-sensitive.

Errors are logged once, at the boundary that handles them — not re-logged at every layer they pass through, to avoid duplicate noise for the same failure.

### 3.3 Business Events

Beyond requests and errors, the backend logs key business events that matter for tracing what happened to a resource over time:

```text
resource created
resource status changed (old status → new status)
resource relocated (previous location → new location)
resource deleted
authentication failure
authorization denial
```

These events complement — they do not replace — the structured audit trail defined in `API_CONTRACT.md` section 11. The audit trail is the durable, queryable record of who did what; application logs are the operational trace used for debugging and are not guaranteed to be retained indefinitely.

### 3.4 Log Levels

```text
debug  — verbose detail, local development only
info   — normal request/operation completion, business events
warn   — recoverable/unexpected condition, does not fail the request
error  — request failed, operation could not complete
```

---

## 4. Frontend Logging

The frontend uses the existing `logger` utility (`georesponse-fe/src/utils/logger/`) as the established client-side logging convention. It provides:

```ts
logger.info(message, context, data)
logger.warn(message, context, data)
logger.error(message, context, error)
logger.debug(message, context, data)
```

Each call produces a structured entry (`timestamp`, `level`, `message`, optional `context`, and — for `error` — the captured stack) rather than a bare `console.log`.

Frontend logging conventions:

- Use `logger.error` for failed API calls, map adapter failures, and unhandled component errors — always with a `context` string identifying the originating module (e.g. `"resourceApi"`, `"mapAdapter"`).
- Use `logger.warn` for degraded-but-recoverable conditions (e.g. a map layer failing to load while the rest of the map remains usable).
- Use `logger.info` sparingly, for meaningful lifecycle events, not for routine renders or state updates.
- Do not introduce a second, ad hoc logging mechanism (raw `console.*` calls) where the `logger` utility already covers the need — this keeps log output consistent and filterable by level, per `CODING_STANDARDS.md` section 2.

---

## 5. What Must Not Be Logged

Regardless of layer, the following must never appear in logs:

- passwords, tokens, or any authentication credential, in any form (plaintext or hashed);
- full request/response bodies containing credentials;
- secrets or configuration values sourced from environment variables (`ENVIRONMENT_MANAGEMENT.md`);
- unnecessary personally identifiable information beyond what is required to trace an operation (e.g. log a user ID, not a full profile);
- raw database connection strings.

This directly supports `NFR-SEC-004` (Credential Protection) and `NFR-OBS-002` (Request Traceability without exposing sensitive information).

---

## 6. Health Checks

The backend exposes a basic health-check endpoint sufficient to determine whether the service is running and able to serve requests, satisfying `NFR-AVAIL-002` and `NFR-DEP-005`. The exact endpoint path, response shape, and how it is used during deployment/startup verification are defined in `docs/11_devops/DEPLOYMENT.md`.

A health check in this project's scope means confirming the process is up and able to reach its database — it is not expected to report deep dependency health, since there are no downstream services beyond PostgreSQL.

---

## 7. What Is Explicitly Out of Scope

The following are intentionally **not** introduced at GeoResponse's current scope, consistent with `TECHNOLOGY_SELECTION.md`'s principle of avoiding premature infrastructure:

- an APM (Application Performance Monitoring) platform;
- distributed tracing (OpenTelemetry spans across services);
- a metrics aggregation stack (Prometheus/Grafana or equivalent);
- centralized log aggregation infrastructure (ELK, Loki, or equivalent);
- alerting/paging infrastructure.

A single-service modular monolith evaluated as a take-home submission does not have the operational surface that justifies this tooling. Structured logs, the audit trail, and a health-check endpoint provide sufficient visibility for the project's actual scale.

If GeoResponse's scope grows to multiple deployed services or a real production on-call rotation, this section should be revisited and the exclusion reconsidered — not assumed to hold forever.

---

## 8. Scope Boundary

This document does not define:

- the audit trail's data model or query API — see `API_CONTRACT.md` section 11 and `DATA_CONTRACT.md` section 9 (Audit Record);
- deployment or container health-check wiring — see `docs/11_devops/DEPLOYMENT.md`;
- error-to-HTTP-status mapping — see `docs/07_backend/BACKEND_ERROR_HANDLING.md`.

---

## 9. Observability Principle

> Log enough to explain what happened after the fact, without logging what should never leave the system.

Observability tooling should scale with the system's actual operational complexity, not with what is technically possible to add.
