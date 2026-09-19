# API Contract

## 1. Purpose

This document defines the browser-facing API contract for GeoResponse.

The API provides the communication boundary between the React + TypeScript
frontend and the Go backend.

The API is the implementation of the API-related functional requirements
defined in `FUNCTIONAL_REQUIREMENTS.md` (sections 11–18, FR-027–FR-053) and
must support the behavior described by `USE_CASES.md` (UC-01–UC-14) and the
invariants defined by `BUSINESS_RULES.md` (BR-001–BR-047), for:

- resource management;
- resource discovery;
- resource status;
- resource relocation;
- authentication;
- authorization;
- resource history;
- audit trail;
- validation; and
- error handling.

The domain concepts referenced throughout this document (`Resource`,
`Resource Type`, `Resource Status`, `Location`, `Relocation`) follow the
definitions in `DOMAIN_MODEL.md`. Capabilities not defined in `SCOPE.md`
(such as route planning, automated dispatch, or real-time tracking) are not
part of this contract.

The API is resource-oriented and uses REST + JSON.

Section 15 provides a full traceability table from functional requirements
to the endpoints defined in this document.

---

## 2. Base URL

All application endpoints are versioned under:

```text
/api/v1
```

Example:

```http
GET /api/v1/resources
```

---

## 3. General HTTP Rules

### Request

- Use JSON request bodies for create and update operations.
- Use path parameters for resource identifiers.
- Use query parameters for search, filtering, and pagination.
- Validate all state-changing input on the backend (FR-041, FR-045).

### Response

Common success status codes:

| Status | Meaning |
|---|---|
| 200 | Request completed successfully |
| 201 | Resource created successfully |
| 204 | Request completed successfully with no response body |

Common error status codes:

| Status | Meaning |
|---|---|
| 400 | Invalid request or validation error |
| 401 | Authentication required or authentication failed |
| 403 | Authenticated user does not have permission |
| 404 | Resource or requested entity not found |
| 409 | Operation conflicts with current state |
| 500 | Internal persistence or server failure |

### Pagination Defaults

Collection endpoints that support pagination use the following defaults
unless stated otherwise:

| Parameter | Default | Maximum |
|---|---|---|
| `page` | `1` | — |
| `pageSize` | `20` | `100` |

A `pageSize` above the maximum is rejected with `VALIDATION_ERROR`.

---

## 4. Response Format

### Single Resource

```json
{
  "data": {
    "id": "resource-001",
    "name": "Vehicle A",
    "type": "VEHICLE",
    "status": "AVAILABLE",
    "attributes": {},
    "location": {
      "latitude": -6.9147,
      "longitude": 107.6098
    }
  }
}
```

### Resource Collection

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

### Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid resource data",
    "details": []
  }
}
```

The frontend should rely on the stable error `code` rather than parsing the
human-readable `message` (FR-043).

---

# 5. Authentication

Implements FR-027, FR-028, FR-029, BR-022, BR-023, BR-024, and UC-11
(Authenticate User).

## 5.1 Login

```http
POST /api/v1/auth/login
```

Request:

```json
{
  "identifier": "user@example.com",
  "password": "..."
}
```

The exact authentication credential format is an implementation decision.

A successful response establishes an authenticated context (BR-023) and
returns the authenticated user's identity in the same shape as
`GET /api/v1/auth/me`.

If the submitted credentials are invalid, the backend must reject the
request with `401 AUTHENTICATION_FAILED` and must not establish an
authenticated context (BR-024, FR-028).

---

## 5.2 Logout

```http
POST /api/v1/auth/logout
```

Ends the caller's authenticated context. This endpoint requires an existing
authenticated context; calling it without one returns `401
AUTHENTICATION_FAILED`.

A successful logout returns `204` with no response body. After logout, the
previously authenticated context must no longer grant access to protected
operations (BR-022).

---

## 5.3 Current User

```http
GET /api/v1/auth/me
```

Returns the identity and relevant authorization information of the
authenticated user (FR-029). Requires an authenticated context; otherwise
returns `401 AUTHENTICATION_FAILED`.

Example:

```json
{
  "data": {
    "id": "user-001",
    "name": "User",
    "roles": ["operator"]
  }
}
```

---

# 6. Resource Management

Implements FR-001–FR-009, BR-001–BR-004, BR-015–BR-021, and UC-01, UC-02,
UC-06, UC-07, UC-10.

## 6.1 List Resources

```http
GET /api/v1/resources
```

Supported query parameters:

| Parameter | Purpose | Notes |
|---|---|---|
| `search` | Free-text match against supported resource information (FR-016, BR-043) | Optional; an empty value returns unfiltered results |
| `type` | Filter by resource type (FR-017, BR-044) | One of `VEHICLE`, `FACILITY`, `EQUIPMENT`, `IOT_DEVICE` |
| `status` | Filter by resource status (FR-018, BR-044) | One of `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `UNAVAILABLE` |
| `page` | Page number | Default `1` |
| `pageSize` | Page size | Default `20`, maximum `100` |

Multiple filters may be combined (FR-019); the resulting resource set must
satisfy all selected filter criteria (BR-045).

Example:

```http
GET /api/v1/resources?search=vehicle&type=VEHICLE&status=AVAILABLE&page=1&pageSize=20
```

The backend applies the filters and returns only resources satisfying all
selected criteria. If no resources match, the response returns an empty
`data` array with an accurate `meta.total` of `0` (UC-01, UC-03, UC-04
"empty state" alternative flows) rather than an error.

This endpoint is also the data source for the map view (FR-020, UC-05);
the frontend derives map markers from each returned resource's `location`.

---

## 6.2 Get Resource

```http
GET /api/v1/resources/{id}
```

Returns the selected resource and its relevant information (FR-003,
UC-02).

If the resource does not exist, the backend returns `404
RESOURCE_NOT_FOUND` (FR-051, UC-02 alternative flow).

---

## 6.3 Create Resource

```http
POST /api/v1/resources
```

Request:

```json
{
  "id": "resource-001",
  "name": "Vehicle A",
  "type": "VEHICLE",
  "status": "AVAILABLE",
  "attributes": {
    "vehicleType": "Ambulance",
    "capacity": 4
  },
  "location": {
    "latitude": -6.9147,
    "longitude": 107.6098
  }
}
```

The `attributes` object is type-specific (DOMAIN_MODEL.md section 6.2, BR-004).
Representative examples:

```text
Vehicle    → vehicleType, capacity
Facility   → facilityType, capacity
Equipment  → equipmentType, quantity
IoT Device → deviceType
```

The exact attribute set per type is defined by `DATA_CONTRACT.md` and
backend validation rules; it may be extended without changing this
endpoint's shape.

The backend validates the complete request before persistence (FR-001,
BR-016, BR-042). If `id` conflicts with an existing resource, the backend
returns `409 RESOURCE_ID_CONFLICT` (BR-001, UC-06 alternative flow). A
successful creation returns `201` with the created resource and records
the operation in the audit trail (FR-038, BR-035).

---

## 6.4 Update Resource

```http
PUT /api/v1/resources/{id}
```

The operation may update resource information, including:

- name;
- type;
- status;
- attributes; and
- location.

The resource identity remains associated with the same resource (FR-004,
BR-015). A location change made through this endpoint is treated as a
general information update; a location change made specifically as a
relocation action must use `PATCH /api/v1/resources/{id}/location`
(section 8) so that relocation-specific invariants and location history
apply (UC-07 boundary).

The backend validates the requested changes before persistence (FR-041,
BR-016) and, on success, records the change in resource change history and
the audit trail (FR-037, BR-017). If the resource does not exist, the
backend returns `404 RESOURCE_NOT_FOUND`.

---

## 6.5 Delete Resource

```http
DELETE /api/v1/resources/{id}
```

The frontend must provide a confirmation mechanism before invoking deletion
(FR-005, UC-10); confirmation itself is a frontend concern and is not part
of this API call.

The backend must enforce authorization (BR-020) and, on success, record the
deletion in the audit trail (FR-038, BR-021). A successful deletion returns
`204`. After deletion, the resource must no longer be returned by
`GET /api/v1/resources` or `GET /api/v1/resources/{id}` (FR-005, UC-10). If
the resource does not exist at the time of the operation, the backend
returns `404 RESOURCE_NOT_FOUND` (BR-019).

GeoResponse's MVP deletion model is a hard delete of the current resource
record; the resource's prior history and audit trail remain available
independently of the deleted record (`DATABASE_ARCHITECTURE.md`).

---

# 7. Resource Status

Implements FR-010–FR-012, BR-005–BR-008, and UC-08 (Change Resource
Status).

## 7.1 Change Resource Status

```http
PATCH /api/v1/resources/{id}/status
```

Request:

```json
{
  "status": "MAINTENANCE"
}
```

Supported statuses:

```text
AVAILABLE
IN_USE
MAINTENANCE
UNAVAILABLE
```

The backend validates the status (FR-012, BR-006), persists the change,
and records status history and audit information (FR-011, BR-008). A
status change must not automatically change the resource's location
(BR business rule symmetry with section 8; see also `DOMAIN_MODEL.md`
section 9.1).

If the resource does not exist, the backend returns `404
RESOURCE_NOT_FOUND`. If the submitted status is not one of the defined
values, the backend returns `400 INVALID_RESOURCE_STATUS`.

---

# 8. Resource Relocation

Implements FR-023–FR-026, BR-009–BR-014, and UC-09 (Relocate Resource).

## 8.1 Relocate Resource

```http
PATCH /api/v1/resources/{id}/location
```

Request:

```json
{
  "latitude": -6.9150,
  "longitude": 107.6102
}
```

The backend must:

1. validate the destination coordinates (FR-024, BR-010);
2. update the resource location (FR-025);
3. preserve the resource identity (BR-012);
4. preserve the resource type (FR-025);
5. not automatically change the resource status (FR-025);
6. record location history (FR-026, BR-014); and
7. record the operation in the audit trail (FR-026, BR-035).

Relocation updates the existing resource; it must not create a new resource
(BR-012) and does not perform route planning, navigation, travel tracking,
or automated dispatch (`DOMAIN_MODEL.md` section 9.2, `SCOPE.md` section
4.3–4.4).

If the resource does not exist, the backend returns `404
RESOURCE_NOT_FOUND`. If the destination coordinates are invalid, the
backend returns `400 INVALID_LOCATION` and must not apply the relocation
(BR-010).

After a successful response, the frontend updates the resource position on
the map (FR-022, UC-09).

---

# 9. Resource History

Implements FR-034–FR-037, BR-029–BR-034, and UC-13 (View Resource
History).

## 9.1 View Resource History

```http
GET /api/v1/resources/{id}/history
```

Supported query parameters:

| Parameter | Purpose | Notes |
|---|---|---|
| `type` | Restrict the response to one history category | One of `status`, `location`, `change`; omitted returns all categories |
| `page` | Page number | Default `1`, applied per category when `type` is omitted |
| `pageSize` | Page size | Default `20`, maximum `100` |

The response contains, at minimum:

- status history;
- location history; and
- resource change history.

Example:

```json
{
  "data": {
    "statusHistory": [],
    "locationHistory": [],
    "changeHistory": []
  }
}
```

Each history entry must contain enough information to determine the
previous value, the new value, when the change occurred, and the
responsible user when user identity is available (FR-035, FR-036, FR-037).

History entries only represent successfully completed changes (BR-030); a
history record must not be detached from the resource it belongs to
(BR-029) and must not be interpreted as a continuous tracking stream
(BR-032, `DOMAIN_MODEL.md` section 9.2).

Access must be restricted to authorized users (UC-13 precondition). If the
resource does not exist, the backend returns `404 RESOURCE_NOT_FOUND`
(UC-13 alternative flow). If no history exists, the backend returns an
empty result for the applicable categories rather than an error (UC-13
alternative flow).

---

# 10. Authorization and Administration

Implements FR-030–FR-033, BR-025–BR-028, and UC-12 (Manage Roles and
Permissions).

The exact role and permission model is defined by the authorization
implementation. The API must enforce permissions on protected operations
(FR-031, BR-026) regardless of whether the operation originates from the
GeoResponse frontend or another API client (FR-032, BR-027).

## 10.1 List Roles

```http
GET /api/v1/roles
```

## 10.2 List Permissions

```http
GET /api/v1/permissions
```

## 10.3 Role Management

```http
POST /api/v1/roles
PUT /api/v1/roles/{id}
DELETE /api/v1/roles/{id}
```

## 10.4 Permission Assignment

```http
PUT /api/v1/roles/{id}/permissions
```

## 10.5 User Role Assignment

```http
PUT /api/v1/users/{id}/roles
```

Assigns the set of roles held by a user. This endpoint governs which roles
a user holds; `10.4` governs which permissions a role grants. Together they
implement the role-based access control model required by FR-030 and
BR-025.

These operations must be restricted to authorized administrators (BR-025)
and changes must be recorded in the audit trail (FR-033, BR-028). A caller
without the required permission receives `403 AUTHORIZATION_DENIED`
(FR-032).

---

# 11. Audit Trail

Implements FR-038–FR-040, BR-035–BR-039, and UC-14 (View Audit Trail).

## 11.1 View Audit Trail

```http
GET /api/v1/audit-logs
```

The endpoint is restricted to users with the required permission (FR-040,
UC-14); a caller without that permission receives `403
AUTHORIZATION_DENIED`.

Supported filters:

```text
userId
resourceId
operation
startTime
endTime
page
pageSize
```

`page` defaults to `1` and `pageSize` defaults to `20` (maximum `100`), per
section 3.

The API returns enough information to trace relevant operations, including
where available:

- operation type (FR-039, BR-036);
- operation time (FR-039, BR-037);
- user (FR-039, BR-038);
- affected resource; and
- relevant change information.

At minimum, auditable operations include:

```text
RESOURCE_CREATED
RESOURCE_UPDATED
RESOURCE_STATUS_CHANGED
RESOURCE_RELOCATED
RESOURCE_DELETED
ROLE_CHANGED
PERMISSION_CHANGED
```

An audit record must only represent a successfully completed operation; a
failed or rejected operation must not be recorded as a successful state
change (BR-039, BR-018). If no audit records match the applied filters,
the backend returns an empty `data` array rather than an error (UC-14
alternative flow).

---

# 12. Validation

Implements FR-041–FR-043, FR-045, FR-046, BR-016, BR-042, and the
validation-related alternative flows in `USE_CASES.md` section 5.1.

All state-changing API endpoints must validate input before executing the
operation (FR-041, FR-045). Validation is authoritative on the backend;
frontend validation improves user experience but must not be relied upon
as the enforcement mechanism (FR-046, `TECHNOLOGY_SELECTION.md` section
13.2).

| Field | Rule | Source | Failure Code |
|---|---|---|---|
| `id` | Required; unique among active resources | BR-001 | `VALIDATION_ERROR` (missing) / `RESOURCE_ID_CONFLICT` (duplicate) |
| `name` | Required; non-empty | BR-002 | `VALIDATION_ERROR` |
| `type` | Required; one of the defined resource types | BR-003 | `INVALID_RESOURCE_TYPE` |
| `status` | Required; one of the defined resource statuses | BR-005, BR-006 | `INVALID_RESOURCE_STATUS` |
| `attributes` | Validated according to the rules applicable to the resource's type | BR-004 | `VALIDATION_ERROR` |
| `location.latitude` | Required; `-90` to `90` | BR-009, BR-010 | `INVALID_LOCATION` |
| `location.longitude` | Required; `-180` to `180` | BR-009, BR-010 | `INVALID_LOCATION` |
| Authentication credentials | Required for `POST /auth/login` | BR-024 | `AUTHENTICATION_FAILED` |
| Authorization | Caller must hold the required permission for the operation | BR-026, BR-027 | `AUTHORIZATION_DENIED` |

Invalid data must not be persisted (FR-042, BR-042); an operation must not
be reported as successful when validation, authorization, or persistence
did not complete successfully (BR-018, BR-030).

When validation fails, the response must provide enough information for
the caller to identify the invalid field(s) (FR-043) using the `details`
array of the error response (section 13).

---

# 13. Error Contract

The API uses stable machine-readable error codes so the frontend can react
to error conditions without parsing human-readable text (FR-043, FR-047).

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request data does not satisfy validation rules |
| `INVALID_RESOURCE_TYPE` | 400 | Resource type is missing or not one of the defined types |
| `INVALID_RESOURCE_STATUS` | 400 | Resource status is missing or not one of the defined statuses |
| `INVALID_LOCATION` | 400 | Geographic coordinates are missing or out of range |
| `AUTHENTICATION_FAILED` | 401 | Credentials are invalid, missing, or the authenticated context has expired |
| `AUTHORIZATION_DENIED` | 403 | Authenticated user lacks the required permission |
| `RESOURCE_NOT_FOUND` | 404 | The requested resource, role, permission, or user does not exist |
| `RESOURCE_ID_CONFLICT` | 409 | A resource with the submitted identifier already exists |
| `PERSISTENCE_ERROR` | 500 | The operation could not be completed due to a persistence failure |

Example:

```json
{
  "error": {
    "code": "INVALID_LOCATION",
    "message": "Invalid geographic coordinates",
    "details": {
      "field": "location"
    }
  }
}
```

Error messages are intended for humans; error codes are intended for
application logic (FR-043). A persistence failure must never be reported
to the caller as a successful operation (FR-053, BR-018).

---

# 14. API Versioning

The API version is part of the URL:

```text
/api/v1/...
```

Breaking changes should use a new API version rather than silently changing
the meaning of an existing contract.

---

# 15. Requirement Traceability

This table maps the functional requirements in `FUNCTIONAL_REQUIREMENTS.md`
to the endpoints that implement them.

| Requirement | Endpoint(s) |
|---|---|
| FR-001 Create Resource | `POST /api/v1/resources` |
| FR-002 View Resource List | `GET /api/v1/resources` |
| FR-003 View Resource Details | `GET /api/v1/resources/{id}` |
| FR-004 Update Resource | `PUT /api/v1/resources/{id}` |
| FR-005 Delete Resource | `DELETE /api/v1/resources/{id}` |
| FR-006, FR-007 Resource Type | `type` field on resource endpoints |
| FR-008, FR-009 Resource Attributes | `attributes` field on resource endpoints |
| FR-010 Display Resource Status | `status` field on resource endpoints |
| FR-011, FR-012 Change Resource Status | `PATCH /api/v1/resources/{id}/status` |
| FR-013–FR-015 Geographic Location | `location` field on resource endpoints |
| FR-016 Search Resources | `GET /api/v1/resources?search=` |
| FR-017–FR-019 Filter Resources | `GET /api/v1/resources?type=&status=` |
| FR-020–FR-022 Geospatial Visualization | `GET /api/v1/resources`, `PATCH /api/v1/resources/{id}/location` |
| FR-023–FR-026 Resource Relocation | `PATCH /api/v1/resources/{id}/location` |
| FR-027–FR-029 Authentication | `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` |
| FR-030–FR-033 Authorization | `GET/POST/PUT/DELETE /api/v1/roles`, `GET /api/v1/permissions`, `PUT /api/v1/roles/{id}/permissions`, `PUT /api/v1/users/{id}/roles` |
| FR-034–FR-037 Resource History | `GET /api/v1/resources/{id}/history` |
| FR-038–FR-040 Audit Trail | `GET /api/v1/audit-logs` |
| FR-041–FR-043 Data Validation | Section 12 (all state-changing endpoints) |
| FR-044 Provide Resource Management APIs | This document |
| FR-045, FR-046 Validate/Enforce via API | Section 12 (all state-changing endpoints) |
| FR-047 Provide API Error Responses | Section 13 |
| FR-048–FR-050 Data Persistence | Enforced by the backend behind every state-changing endpoint; not directly observable in the API shape |
| FR-051 Handle Resource Not Found | `404 RESOURCE_NOT_FOUND` |
| FR-052 Handle Unauthorized Access | `403 AUTHORIZATION_DENIED` |
| FR-053 Handle Persistence Failure | `500 PERSISTENCE_ERROR` |

---

# 16. Scope Boundary

This contract does not define:

- database tables or SQL schema;
- database indexes;
- Go package structure;
- map-library implementation details;
- authentication token implementation;
- password hashing implementation;
- deployment configuration;
- gRPC services; or
- WebSocket/SSE protocols.

Those details belong to their respective technical documents
(`DATABASE_SCHEMA.md`, `BACKEND_ARCHITECTURE.md`,
`FRONTEND_ARCHITECTURE.md`, `SECURITY.md`, `DEPLOYMENT.md`).

Consistent with `SCOPE.md` section 4, this contract also does not provide
endpoints for route planning, automated dispatch, resource optimization,
real-time/continuous location tracking, or external sensor integration.
Radius-based or bounding-box spatial search (`SCOPE.md` section 6.1) is
future scope and is intentionally not part of this contract until the
product scope is explicitly updated.

---

# 17. Contract Principle

The API is the stable boundary between the frontend and backend.

The frontend must not:

- access the database directly;
- depend on Go implementation details;
- enforce business rules only in the UI; or
- depend on MapLibre-specific API structures.

The backend remains responsible for validation, authorization, business
rules, persistence, and consistent error handling.
