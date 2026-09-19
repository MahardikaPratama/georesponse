# Security

## 1. Purpose

This document defines GeoResponse's security posture: the practical controls applied at each boundary of the system.

The posture is proportionate to the project's scope — a take-home submission evaluated in a local/controlled environment — while still satisfying the baseline expectations in `NON_FUNCTIONAL_REQUIREMENTS.md` section 7 (Security). It is not written as enterprise compliance documentation, and it does not claim controls that are not actually implemented.

---

## 2. Security Principles

### 2.1 Backend Is the Trust Boundary

The frontend is never trusted as an enforcement point. Every security-relevant decision — validation, authentication, authorization — is re-checked on the backend regardless of what the frontend already checked or hid from the user, per `DATA_CONTRACT.md` section 7 and section 13.

### 2.2 Fail Closed

When a security check cannot be completed confidently (missing token, unknown role, malformed request), the operation is denied rather than allowed by default.

### 2.3 Proportionate Controls

Controls match the project's actual exposure. GeoResponse does not implement enterprise controls (SSO federation, hardware security modules, formal penetration testing) that would be disproportionate to a take-home project, but it does not skip the fundamentals either.

---

## 3. Input Validation

All state-changing API endpoints validate input on the backend before it reaches business logic or persistence, per `API_CONTRACT.md` section 12 and `DATA_CONTRACT.md`.

Validated inputs include, where applicable:

```text
identifier
name
resource type      (must be one of the DOMAIN_MODEL.md enum values)
resource status    (must be one of the DOMAIN_MODEL.md enum values)
geographic coordinates (valid latitude/longitude ranges)
resource attributes
authorization context
```

Frontend validation exists for user experience (immediate feedback), but it is never treated as authoritative. Invalid data must not reach persistence regardless of what the frontend allowed through, satisfying `NFR-REL-001` and `NFR-SEC-003`.

---

## 4. Authentication

GeoResponse authenticates users through the `POST /api/v1/auth/login` endpoint defined in `API_CONTRACT.md` section 5. A successful login establishes an authenticated context that is presented on subsequent requests (token-based authentication).

This document describes authentication generically rather than over-specifying an implementation detail that belongs elsewhere:

- credentials are never logged, per `OBSERVABILITY.md` section 5;
- credentials are never stored in plaintext;
- the exact token/session mechanism (its format, expiry, and storage) is an implementation decision made at the point authentication is built, and is not fixed by this document — `API_CONTRACT.md` section 15 explicitly excludes authentication token implementation details from the contract layer.

Protected endpoints require a valid authenticated context. An unauthenticated request to a protected endpoint returns `401`, per `API_CONTRACT.md` section 3.

---

## 5. Authorization

Authorization is enforced **server-side, on every protected operation** — never inferred from what the frontend UI shows or hides.

```text
User → Role → Permission → Protected Operation
```

Rules:

- The frontend may hide a button or disable an action for UX purposes, but that is a convenience, not a security control. The backend independently checks the acting user's permissions before executing the operation, per `DATA_CONTRACT.md` section 7: "The backend is responsible for enforcing permissions. Frontend visibility controls are not sufficient for authorization."
- An authenticated-but-unauthorized request to a protected operation returns `403`, per `API_CONTRACT.md` section 3.
- Administrative operations (role and permission management, per `API_CONTRACT.md` section 10) are restricted to users holding the required permission, and changes to roles/permissions are themselves recorded in the audit trail.

---

## 6. Error Disclosure

API errors follow the structured error contract in `API_CONTRACT.md` section 13 and `BACKEND_ERROR_HANDLING.md`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid resource data",
    "details": []
  }
}
```

- Stable, machine-readable `code` values are returned to the client; internal implementation details (stack traces, SQL errors, file paths, internal package names) are never included in the response body.
- Internal error detail is logged server-side (per `OBSERVABILITY.md` section 3.2), not exposed to the caller.
- `500` responses return a generic persistence/server-failure message — the underlying cause stays server-side.

---

## 7. Secrets and Configuration

- All secrets (database credentials, any authentication signing secret) are supplied through environment variables, never hard-coded in source, per `NFR-SEC-004` and `docs/11_devops/ENVIRONMENT_MANAGEMENT.md`.
- `.env` files containing real values are never committed; only `.env.example` with placeholder values is version-controlled, per `GIT_MANAGEMENT.md` section 7.
- Configuration is separated from source code so the same build can run against different environment values without a code change, per `NFR-DEP-003`.

---

## 8. Web Security Hygiene

### 8.1 CORS

The backend restricts Cross-Origin Resource Sharing to the frontend's configured origin(s) rather than allowing all origins (`*`). The allowed origin is environment-configurable, following the same convention as other environment-specific configuration in `docs/11_devops/ENVIRONMENT_MANAGEMENT.md`.

### 8.2 SQL Injection

All database access uses parameterized queries. Raw string concatenation of user input into SQL is not permitted at any layer, per `CODING_STANDARDS.md` and the repository boundary in `DEPENDENCY_RULES.md`.

### 8.3 Dependency Hygiene

- Dependencies are pinned through the project's lockfiles (`go.sum`, frontend lockfile) so builds are reproducible, per `NFR-REPRO-001`.
- New dependencies are added only when justified by a concrete requirement, per `DEPENDENCY_RULES.md` section 6 — a smaller dependency surface is also a smaller attack surface.
- Dependency updates are reviewed as their own focused change (`chore:` commits per `GIT_MANAGEMENT.md`), not silently bundled into unrelated feature work.

---

## 9. Audit Trail as a Security Control

Security-sensitive operations — authentication failures, authorization denials, resource creation/update/deletion, status changes, relocations, role/permission changes — are recorded in the audit trail defined in `API_CONTRACT.md` section 11, satisfying `NFR-SEC-006`. The audit trail is restricted to users holding the required permission to view it.

---

## 10. Explicitly Out of Scope

Consistent with the project's take-home scope and `TECHNOLOGY_SELECTION.md`'s principle of avoiding premature infrastructure, the following are **not** part of this project's security posture:

- formal penetration testing or a third-party security audit;
- a web application firewall or dedicated DDoS mitigation layer;
- compliance certification (SOC 2, ISO 27001, or similar);
- multi-factor authentication or SSO federation;
- secrets-management infrastructure (Vault or equivalent) beyond environment variables.

These are not rejected as bad practice in general — they are simply disproportionate to a take-home project with a single controlled deployment target. If GeoResponse's scope grew into a real production system, this section is what should be revisited first.

---

## 11. Scope Boundary

This document does not define:

- the exact authentication token format or signing algorithm — an implementation detail, per `API_CONTRACT.md` section 15;
- password hashing algorithm choice — an implementation detail;
- the database schema for `User`/`Role`/`Permission` — see `docs/08_database/DATABASE_SCHEMA.md`;
- deployment-level network security (TLS termination, firewall rules) — see `docs/11_devops/DEPLOYMENT.md`.

---

## 12. Security Principle

> Validate everything at the backend boundary, trust nothing the frontend claims about permissions, and never let an internal error detail leak to the client.

Security controls in this project exist to make the documented trust boundary real in the running system, not to perform compliance theater disproportionate to a take-home submission.
