# Backend Validation

## 1. Purpose

This document is the backend-implementation companion to `API_CONTRACT.md`
section 12 and `DATA_CONTRACT.md` section 11, which establish *that* all
state-changing input must be validated on the backend and *what* categories
of data must be validated.

This document does not repeat that checklist. It defines *where in the
backend layering validation runs*, the concrete per-field rules used to
implement it, and how a validation failure is reported to the client as
`VALIDATION_ERROR` with field-level `details`.

Per `TECHNOLOGY_SELECTION.md` section 13.2 and `BUSINESS_RULES.md` BR-016 /
BR-042, backend validation is authoritative regardless of what the frontend
already checked. Invalid data must never be persisted.

---

## 2. Where Validation Runs

```text
HTTP Handler
   │  structural / type validation
   │  (missing fields, wrong JSON types, malformed request)
   ↓
Application / Use Case
   │  cross-field and business-rule validation
   │  (enum membership, coordinate bounds, type-specific attributes,
   │   state-dependent rules)
   ↓
Domain
   │  invariants enforced by construction
   │  (a constructed Resource/Location value is never in an invalid state)
   ↓
Repository
      persistence-level constraints (DB-level NOT NULL / CHECK constraints
      as a last line of defense, not the primary validation mechanism)
```

- **Handler-level** validation is purely structural: is the JSON well-formed,
  are required fields present, are types correct (string vs. number). This
  uses simple decode-time checks, not business rules.
- **Application/domain-level** validation enforces the rules that require
  knowledge of the domain: valid `Type`/`Status` enum values, coordinate
  ranges, type-specific attribute rules, and rules that depend on existing
  state (e.g. "resource must exist before it can be relocated").
- Domain constructors (`NewResource`, `NewLocation`) should make invalid
  states unrepresentable where practical, so that once a `Location` value
  exists in the domain layer, it is already known to satisfy BR-010.
- Database constraints (`NOT NULL`, `CHECK`, foreign keys) exist as a safety
  net, not as the mechanism the application relies on to produce
  user-facing validation errors — a constraint violation reaching the
  repository layer is treated as a `PERSISTENCE_ERROR`, not a
  `VALIDATION_ERROR` (see `BACKEND_ERROR_HANDLING.md`), because it indicates
  the application-level validation should have already caught it.

---

## 3. Resource Create / Update Validation

Applies to `POST /api/v1/resources` and `PUT /api/v1/resources/{id}`
(`API_CONTRACT.md` sections 6.3, 6.4).

The authoritative field-by-field rule for each field (what is valid, which
BR it enforces, and which failure code applies) is defined in
`API_CONTRACT.md` section 12 and is not repeated here. This section only
maps each field to the `field` value the backend reports in the `details`
array (section 9), including nesting not spelled out in that table, so a
validation failure can be traced to the exact request field:

| Field | Failure detail `field` |
|---|---|
| `id` | `id` |
| `name` | `name` |
| `type` | `type` |
| `status` | `status` |
| `attributes` | `attributes` or `attributes.<key>` (see section 4) |
| `location.latitude` | `location.latitude` |
| `location.longitude` | `location.longitude` |

`name` length is additionally bounded (e.g. `MAX_RESOURCE_NAME_LENGTH`,
mirrored from the frontend constant per `CODING_STANDARDS.md` section 9) —
an implementation detail not part of the `API_CONTRACT.md` section 12 table.

On update, the same field mapping applies to whatever fields are present in
the request; identity (`id`) is never mutated by the request body — the path
parameter is authoritative (BR-015).

---

## 4. Type-Specific Attribute Validation

Consistent with `DOMAIN_MODEL.md` section 6.2, attribute rules depend on
`type`:

```text
VEHICLE   → vehicle type: required, non-empty string
            capacity: required, integer >= 0

FACILITY  → facility type: required, non-empty string
            capacity: required, integer >= 0

EQUIPMENT → equipment type: required, non-empty string
            quantity: required, integer >= 0

IOT_DEVICE → device type: required, non-empty string
```

An unrecognized `type` fails at the `type` field itself
(`INVALID_RESOURCE_TYPE`) before attribute-level rules are evaluated. An
attribute failing its type-specific rule is reported against
`attributes.<attributeName>` in `details`, so the client can highlight the
exact field.

Attribute validation is implemented as one `AttributeValidator` per
`ResourceType`, dispatched through an `AttributeValidatorRegistry` (Strategy
pattern — see `BACKEND_ARCHITECTURE.md` section 8.2), not a single function
branching on `Type`. Adding a resource type means adding one new validator
file and registering it in `main.go`; no existing validator, the service, or
the handler is touched (Open/Closed Principle, `BACKEND_ARCHITECTURE.md`
section 8.1).

---

## 5. Status Change Validation

Applies to `PATCH /api/v1/resources/{id}/status` (`API_CONTRACT.md` section
7).

- `status` is required and must be one of the four defined values
  (`INVALID_RESOURCE_STATUS` if not).
- The resource identified by `{id}` must exist (`RESOURCE_NOT_FOUND` if not).
- The MVP does not define a restricted state-transition graph (e.g. it does
  not forbid `MAINTENANCE → AVAILABLE`); any defined status value is a valid
  target. If a transition restriction is introduced later, it is enforced at
  the application layer as an additional business rule, not at the handler.
- A successful status change must, in the same operation, write a status
  history record and an audit record (BR-007, BR-008) — this is not
  optional validation but a required side effect, tested per
  `BACKEND_TESTING.md` section 4.

---

## 6. Relocation Validation

Applies to `PATCH /api/v1/resources/{id}/location` (`API_CONTRACT.md`
section 8).

- `latitude` and `longitude` are required and must satisfy the coordinate
  bounds in section 3 (`INVALID_LOCATION` if not).
- The resource identified by `{id}` must exist (`RESOURCE_NOT_FOUND` if
  not).
- The operation must not accept or apply a `status` or `type` change — the
  relocation endpoint's request body has no such fields, so a client cannot
  submit them; the domain layer additionally must not derive a status change
  as a side effect of relocation (BR-013, `DOMAIN_MODEL.md` section 9.1).
- A successful relocation must, in the same operation, write a location
  history record and an audit record (BR-014).

---

## 7. Authentication Input Validation

Applies to `POST /api/v1/auth/login` (`API_CONTRACT.md` section 5.1).

- `identifier` is required, non-empty.
- `password` is required, non-empty; the backend does not enforce password
  complexity at login time (that belongs to account provisioning, out of
  scope for this MVP).
- Validation failure on missing/malformed fields returns `VALIDATION_ERROR`.
- A structurally valid but incorrect credential pair returns
  `AUTHENTICATION_FAILED` (401), not `VALIDATION_ERROR` — these are
  distinct failure categories: one means "the request is malformed," the
  other means "the request is well-formed but not authenticated" (BR-024).

---

## 8. Authorization Validation

Every protected, state-changing endpoint validates that the authenticated
user holds the required permission before the operation proceeds
(BR-026, BR-027):

```text
resource.create   → POST /api/v1/resources
resource.update   → PUT /api/v1/resources/{id}
resource.delete   → DELETE /api/v1/resources/{id}
resource.status   → PATCH /api/v1/resources/{id}/status
resource.relocate → PATCH /api/v1/resources/{id}/location
role.manage       → POST/PUT/DELETE /api/v1/roles, PUT /api/v1/roles/{id}/permissions
audit.read        → GET /api/v1/audit-logs
```

The exact permission-to-role mapping is an authorization implementation
detail (`API_CONTRACT.md` section 10) and is not enumerated further here.
A missing permission returns `AUTHORIZATION_DENIED` (403); this check runs
before the operation's business-rule validation executes, so an
unauthorized caller cannot use validation error responses to probe resource
state.

---

## 9. Reporting Field-Level `details`

`VALIDATION_ERROR` responses populate `details` as a list of field-level
problems, so the client can map each entry to a form field:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid resource data",
    "details": [
      { "field": "type", "message": "must be one of VEHICLE, FACILITY, EQUIPMENT, IOT_DEVICE" },
      { "field": "location.latitude", "message": "must be between -90 and 90" }
    ]
  }
}
```

Implementation notes:

- A single request may fail multiple field rules; the application layer
  collects all violations before returning, rather than failing fast on the
  first one, so the client can surface every problem at once.
- Nested fields use dot notation (`location.latitude`,
  `attributes.capacity`), matching the request body's own JSON shape.
- A single-field failure that maps to a more specific error code
  (`INVALID_RESOURCE_TYPE`, `INVALID_RESOURCE_STATUS`, `INVALID_LOCATION`)
  is returned using that specific code instead of the generic
  `VALIDATION_ERROR`, per `BACKEND_ERROR_HANDLING.md` section 6 — the more
  specific code takes precedence when only that one category of field is
  invalid. When multiple unrelated fields are invalid at once, the response
  falls back to `VALIDATION_ERROR` with each problem listed in `details`.

---

## 10. Scope Boundary

This document does not define:

- the full validation checklist by category (see `API_CONTRACT.md` section
  12 and `DATA_CONTRACT.md` section 11 — this document implements that
  checklist, it does not replace it);
- error code definitions or HTTP status mapping (see
  `BACKEND_ERROR_HANDLING.md`);
- frontend validation behavior (see `TECHNOLOGY_SELECTION.md` section 13.1);
- password hashing or token validation implementation (explicitly out of
  scope per `API_CONTRACT.md` section 15).

---

## 11. Validation Principle

Validation is authoritative on the backend regardless of what the frontend
already checked, and it runs before a single byte reaches persistence.

> If the backend did not check it, it is not valid — no matter what the
> frontend displayed.
