# Backend Validation

## 1. Purpose

This document describes how `georesponse-be` implements validation: where
in the layering each check runs, the order of checks, and how a failure is
reported, including field-level `details`. The field-by-field rules are
owned by `API_CONTRACT.md` section 12 and the validation categories by
`DATA_CONTRACT.md` section 11; error codes and HTTP statuses are owned by
`BACKEND_ERROR_HANDLING.md`. Frontend validation is supplementary and is
covered in `TECHNOLOGY_SELECTION.md` section 13.

Backend validation is authoritative regardless of what the frontend already
checked (BR-016, BR-042). Invalid data is never persisted.

---

## 2. Where Validation Runs

```text
HTTP Handler
   │  structural / type validation
   │  (malformed JSON, unknown fields, wrong JSON types)
   ↓
Application / Use Case
   │  cross-field and business-rule validation
   │  (enum membership, coordinate bounds, type-specific attributes,
   │   state-dependent rules)
   ↓
Domain
   │  invariants checked by explicit validators
   │  (Resource.Validate, Location.Validate, attribute validators)
   ↓
Repository
      persistence-level constraints (DB-level NOT NULL / CHECK constraints
      as a last line of defense, not the primary validation mechanism)
```

- **Handler-level** validation is purely structural and lives in one
  place, `httpresponse.DecodeJSON`: is the body well-formed JSON, does it
  contain only fields the endpoint defines (`DisallowUnknownFields`), and
  are the JSON types correct (string vs. number)? Any failure is an
  `httpresponse.ValidationError`, returned as `400 VALIDATION_ERROR`.
  Handlers do not check required-field presence; a missing field decodes
  to its zero value and the domain rejects it.
- **Application/domain-level** validation enforces the rules that require
  knowledge of the domain: presence of `id`/`name`, valid `Type`/`Status`
  enum values, coordinate ranges, type-specific attribute rules, and rules
  that depend on existing state (e.g. "resource must exist before it can be
  relocated"). Each is a sentinel error (`resource.ErrMissingID`,
  `resource.ErrInvalidType`, `resource.ErrInvalidLocation`, ...) mapped to
  its code in `BACKEND_ERROR_HANDLING.md` section 6.
- The domain exposes explicit validators (`Resource.Validate()`,
  `Location.Validate()`, `resource.ValidateLocation(lat, lng)`) rather than
  guarding constructors; `resource.Service` calls them before any
  repository write, so nothing invalid reaches persistence.
- Database constraints (`NOT NULL`, `CHECK`, foreign keys) are a safety
  net. A constraint violation reaching the repository layer means
  application validation missed something, so it surfaces as
  `PERSISTENCE_ERROR`, not `VALIDATION_ERROR`. The exceptions are the
  unique-key violations the repository classifies explicitly
  (`BACKEND_ERROR_HANDLING.md` section 3).

---

## 3. Resource Create / Update Validation

Applies to `POST /api/v1/resources` and `PUT /api/v1/resources/{id}`
(`API_CONTRACT.md` sections 6.3, 6.4).

The authoritative field-by-field rule for each field (what is valid, which
BR it enforces, and which failure code applies) is defined in
`API_CONTRACT.md` section 12 and is not repeated here. The checks run in
this order in `resource.Service`, stopping at the first failure:

```text
Resource.Validate()            id present → name present → type valid →
                               status valid → location in range
AttributeValidatorRegistry     type-specific attribute rules (section 4)
Repository.Create              id uniqueness (RESOURCE_ID_CONFLICT)
```

The backend does not currently bound `name` length beyond non-empty; the
frontend's `MAX_RESOURCE_NAME_LENGTH` (`CODING_STANDARDS.md` section 9) is
a UI-only convenience until a backend rule is introduced.

On update (`PUT`), the request body carries only `name`, `type`, and
`attributes`. Identity (`id`) is never mutated by the request body (the
path parameter is authoritative, BR-015), and `status`/`location` are
always carried over from the stored record. A body that includes them is
rejected as an unknown field (`VALIDATION_ERROR`). Status and location
change only through their dedicated `PATCH` endpoints (sections 5, 6).

---

## 4. Type-Specific Attribute Validation

Consistent with `DOMAIN_MODEL.md` section 6.2, attribute rules depend on
`type`:

```text
VEHICLE    → vehicleType:   required, JSON string
             capacity:      required, JSON number >= 0

FACILITY   → facilityType:  required, JSON string
             capacity:      required, JSON number >= 0

EQUIPMENT  → equipmentType: required, JSON string
             quantity:      required, JSON number >= 0

IOT_DEVICE → deviceType:    required, JSON string
```

Keys not listed are accepted and stored as-is; an empty string or a
non-integer number currently passes (only presence, JSON type, and
non-negativity are checked). An unrecognized `type` fails at the `type`
field itself (`INVALID_RESOURCE_TYPE`) before attribute-level rules are
evaluated. A missing attribute wraps `resource.ErrMissingAttribute` and an
invalid one wraps `resource.ErrInvalidAttribute`; both surface as
`VALIDATION_ERROR` with the offending key named in the server-side error
only (see section 9).

Attribute validation is implemented as one `AttributeValidator` per
`ResourceType`, dispatched through an `AttributeValidatorRegistry`
(`BACKEND_ARCHITECTURE.md` section 8.2).

---

## 5. Status Change Validation

Applies to `PATCH /api/v1/resources/{id}/status` (`API_CONTRACT.md` section
7).

- `status` is required and must be one of the four defined values
  (`INVALID_RESOURCE_STATUS` if not).
- The resource identified by `{id}` must exist (`RESOURCE_NOT_FOUND` if not).
- The MVP does not define a restricted state-transition graph (e.g. it does
  not forbid `MAINTENANCE → AVAILABLE`); any defined status value is a valid
  target. A transition restriction added later belongs in the application
  layer, not the handler.
- A successful status change writes, in the same transaction, a status
  history record and an audit record (BR-007, BR-008). This is a required
  side effect, tested per `BACKEND_TESTING.md` section 4.

---

## 6. Relocation Validation

Applies to `PATCH /api/v1/resources/{id}/location` (`API_CONTRACT.md`
section 8).

- `latitude` and `longitude` are required and must be within the ranges in
  `API_CONTRACT.md` section 12 (`INVALID_LOCATION` if not).
- The resource identified by `{id}` must exist (`RESOURCE_NOT_FOUND` if
  not).
- The request body has no `status` or `type` field, so a client cannot
  submit them, and the domain does not derive a status change from a
  relocation (BR-013, `DOMAIN_MODEL.md` section 9).
- A successful relocation writes, in the same transaction, a location
  history record and an audit record (BR-014).

---

## 7. Authentication Input Validation

Applies to `POST /api/v1/auth/login` (`API_CONTRACT.md` section 5.1).

- `identifier` is the user's `id`; `password` is compared against the
  stored bcrypt hash. Password complexity is not checked at login; it
  belongs to account provisioning, which is out of scope.
- A malformed body, or one with unknown fields, returns `VALIDATION_ERROR`.
- A missing or empty `identifier`/`password`, like an incorrect pair,
  returns `AUTHENTICATION_FAILED` (401): the service performs the lookup
  and hash comparison regardless and reports a single `ErrInvalidCredentials`,
  so the response never reveals whether the identifier exists (BR-024).

---

## 8. Authorization Validation

Every protected endpoint checks that the authenticated user holds the
required permission before the operation proceeds (BR-026, BR-027). The
permission each endpoint requires:

```text
resource.read     → GET /api/v1/resources, GET /api/v1/resources/{id}
resource.create   → POST /api/v1/resources
resource.update   → PUT /api/v1/resources/{id},
                    PATCH /api/v1/resources/{id}/status,
                    PATCH /api/v1/resources/{id}/location
resource.delete   → DELETE /api/v1/resources/{id}
role.read         → GET /api/v1/roles
role.manage       → POST/PUT/DELETE /api/v1/roles, PUT /api/v1/roles/{id}/permissions,
                    PUT /api/v1/users/{id}/roles
permission.read   → GET /api/v1/permissions
audit.read        → GET /api/v1/audit-logs
(authentication only)
                  → GET /api/v1/resources/{id}/history, GET /api/v1/hotspots,
                    POST /api/v1/auth/logout, GET /api/v1/auth/me
```

The codes are constants in the owning package
(`resource.PermissionResourceRead`, `authorization.PermissionRoleManage`,
`auth.PermissionUserRolesManage`, `audit.PermissionAuditRead`, ...).
The permission-to-role mapping is seed data (`database/seeds`) and is not
enumerated here. A missing permission returns `AUTHORIZATION_DENIED` (403);
the check is the first statement of each protected use case, before the
operation's business-rule validation executes, so an unauthorized caller
cannot use validation error responses to probe resource state.

---

## 9. Reporting Field-Level `details`

Only a failure detected by `httpresponse.DecodeJSON` (malformed JSON, an
unknown field, or a wrong JSON type) produces `details`. It is a list with
one `{ "field", "message" }` entry, and `field` is an empty string because
`encoding/json` does not expose the field path reliably:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request data does not satisfy validation rules",
    "details": [
      { "field": "", "message": "request body is not valid JSON: json: unknown field \"colour\"" }
    ]
  }
}
```

Implementation notes:

- Domain-level failures (`ErrMissingID`, `ErrMissingName`,
  `ErrMissingAttribute`, `ErrInvalidAttribute`, role name conflicts) are
  reported as `VALIDATION_ERROR` with no `details` key in the response
  (the field is `omitempty`). The specific cause is in the server log only.
- Validation fails fast: the first violated rule is returned, in the order
  given in section 3. A client that submits several invalid fields learns
  about them one response at a time.
- Populating `field` with dot-notation paths (`location.latitude`,
  `attributes.capacity`) is the intended direction when the frontend needs
  field-level reporting.
- A failure that has a more specific error code (`INVALID_RESOURCE_TYPE`,
  `INVALID_RESOURCE_STATUS`, `INVALID_LOCATION`, `RESOURCE_ID_CONFLICT`)
  uses that code instead of `VALIDATION_ERROR` (`BACKEND_ERROR_HANDLING.md`
  section 6).
