# Security

## 1. Purpose

This document describes the security controls GeoResponse applies at each
boundary of the system and addresses `NON_FUNCTIONAL_REQUIREMENTS.md`
section 7 (Security). It lists only controls that are implemented. The
`User`/`Role`/`Permission` schema is in
`docs/08_database/DATABASE_SCHEMA.md`, and deployment-level network
security (TLS, firewalls) is in `docs/11_devops/DEPLOYMENT.md`.

---

## 2. Security Principles

### 2.1 Backend Is the Trust Boundary

The frontend is never an enforcement point. Validation, authentication,
and authorization are checked on the backend regardless of what the
frontend checked or hid (`DATA_CONTRACT.md` sections 7 and 13).

### 2.2 Fail Closed

When a security check cannot be completed (missing or invalid token,
unknown role, malformed request), the operation is denied.

---

## 3. Input Validation

The backend validates every state-changing request before it reaches
business logic or persistence; frontend validation is for user feedback
only. Field rules are in `API_CONTRACT.md` section 12, and the layering and
check order are in `docs/07_backend/BACKEND_VALIDATION.md`. This addresses
`NFR-REL-001` and `NFR-SEC-003`.

---

## 4. Authentication

Users log in with `POST /api/v1/auth/login` (`API_CONTRACT.md` section 5),
sending an `identifier` (the user's `id`) and a password.

- **Password storage:** passwords are stored only as bcrypt hashes
  (`users.password_hash`) and checked with
  `bcrypt.CompareHashAndPassword` (`internal/auth/service.go`). An unknown
  user and a wrong password return the same `401 AUTHENTICATION_FAILED`, so
  the response cannot be used to enumerate valid identifiers.
- **Token:** on success the backend issues a stateless token containing the
  user id and an expiry timestamp, signed with HMAC-SHA256 using
  `TOKEN_SECRET` (`internal/auth/token.go`). The lifetime is `TOKEN_TTL`,
  default 24 hours. There is no session table.
- **Transport:** the token is set in the `georesponse_token` cookie:
  `HttpOnly`, `SameSite=Lax`, `Secure` when `APP_ENV=production`, with
  `Max-Age` equal to the token lifetime. The frontend never reads the
  token.
- **Verification:** the `RequireAuth` middleware
  (`internal/http/middleware/auth.go`) checks the cookie's signature and
  expiry on every protected route. A missing, invalid, or expired token
  returns `401 AUTHENTICATION_FAILED`.
- **Logout:** `POST /api/v1/auth/logout` clears the cookie. Because tokens
  are stateless, the server keeps no revocation list; a copy of a token
  stays valid until it expires.
- Credentials and tokens are never logged (`OBSERVABILITY.md` section 5).

`TOKEN_SECRET` and `TOKEN_TTL` are described in
`docs/11_devops/ENVIRONMENT_MANAGEMENT.md` section 5.

---

## 5. Authorization

Authorization is enforced server-side on every protected operation, never
inferred from what the UI shows or hides.

```text
User → Role → Permission → Protected Operation
```

- The frontend may hide or disable an action for usability, but the
  backend checks the acting user's permissions before executing the
  operation (`DATA_CONTRACT.md` section 7).
- An authenticated request without the required permission returns
  `403 AUTHORIZATION_DENIED` (`API_CONTRACT.md` section 13).
- Role and permission management (`API_CONTRACT.md` section 10) requires
  the corresponding permission, and every change is recorded in the audit
  trail (`ROLE_CHANGED`, `PERMISSION_CHANGED`).

---

## 6. Error Disclosure

API errors follow the error contract in `API_CONTRACT.md` sections 4 and
13, mapped in Go as described in
`docs/07_backend/BACKEND_ERROR_HANDLING.md`.

- Clients receive stable `code` values. Stack traces, SQL errors, file
  paths, and internal package names never appear in a response body.
- An unexpected error returns `500 PERSISTENCE_ERROR` with a generic
  message; the underlying cause is logged server-side
  (`OBSERVABILITY.md` section 3.2).

---

## 7. Secrets and Configuration

Secrets (database credentials, `TOKEN_SECRET`) come from environment
variables and are never hard-coded or committed (`NFR-SEC-004`). The
`.env` / `.env.example` convention is in
`docs/11_devops/ENVIRONMENT_MANAGEMENT.md` section 6.

---

## 8. Web Security Hygiene

### 8.1 CORS

The backend allows cross-origin requests only from the origins listed in
`CORS_ALLOWED_ORIGINS` (default `http://localhost:5173`), never `*`. A
specific origin is required because the auth cookie is sent with
credentials. See `docs/11_devops/ENVIRONMENT_MANAGEMENT.md` section 5.

### 8.2 SQL Injection

All database access uses parameterized queries. User input is never
concatenated into SQL; queries built dynamically (such as the audit-log
filters) add only `$n` placeholders and pass values as arguments.

### 8.3 Dependency Hygiene

- Dependencies are pinned through lockfiles (`go.sum`,
  `package-lock.json`) so builds are reproducible (`NFR-REPRO-001`).
- New dependencies are added only for a concrete requirement
  (`DEPENDENCY_RULES.md` section 6); a smaller dependency surface is also a
  smaller attack surface.
- Dependency updates are reviewed as their own focused change (`chore:`
  commits, per `GIT_MANAGEMENT.md`).

---

## 9. Audit Trail

The audit trail (`DATA_CONTRACT.md` section 9) records resource creation,
update, status change, relocation, and deletion, plus role and permission
changes, addressing `NFR-SEC-006`. Viewing it requires the `audit.read`
permission.

Authentication failures and authorization denials are **not** written to
the audit trail. They appear only as `401` and `403` entries in the
backend request log (`OBSERVABILITY.md` section 3.1).

---

## 10. Out of Scope

The following are not part of the security posture for a take-home project
with a single local deployment target. They are the first things to
revisit if GeoResponse becomes a production system:

- formal penetration testing or a third-party security audit
- a web application firewall or dedicated DDoS mitigation
- compliance certification (SOC 2, ISO 27001, or similar)
- multi-factor authentication or SSO federation
- secrets-management infrastructure (Vault or equivalent) beyond
  environment variables
