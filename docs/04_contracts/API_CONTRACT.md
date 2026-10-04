# API Contract

## 1. Purpose

This document defines the browser-facing REST + JSON API between the React
frontend and the Go backend of GeoResponse. It implements the API-related
functional requirements in `FUNCTIONAL_REQUIREMENTS.md` (FR-027 to FR-053),
supports the use cases in `USE_CASES.md` (UC-01 to UC-14), and enforces the
invariants in `BUSINESS_RULES.md` (BR-001 to BR-047).

Domain concepts (`Resource`, `Resource Type`, `Resource Status`,
`Location`, `Relocation`) follow `DOMAIN_MODEL.md`; object shapes follow
`DATA_CONTRACT.md`. Each section names the requirements it implements, and
section 15 maps every functional requirement to its endpoints. Known gaps
between this contract and the shipped backend are listed in section 19.

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

One operational endpoint sits outside the versioned prefix: `GET /health`
returns `200 {"status": "ok", "database": "ok"}` when the process is up and
can reach its database, or `503` with both values `"unavailable"`
otherwise. It is used by Docker Compose health checks and deployment
tooling, not by the frontend.

---

## 3. General HTTP Rules

### 3.1 Request

- Use JSON request bodies for create and update operations.
- Use path parameters for resource identifiers.
- Use query parameters for search, filtering, and pagination.
- The backend validates all state-changing input (section 12).
- Request bodies are decoded strictly: a malformed or empty body, or a body
  containing a field the endpoint does not define, is rejected with
  `400 VALIDATION_ERROR` rather than silently ignored.

### 3.2 Response

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
| 404 | Resource or other requested object not found |
| 409 | Operation conflicts with current state |
| 500 | Internal persistence or server failure |
| 502 | An upstream data provider (section 18) is unavailable |

### 3.3 Pagination Defaults

Collection endpoints that support pagination use these defaults unless
stated otherwise:

| Parameter | Default | Maximum |
|---|---|---|
| `page` | `1` | None |
| `pageSize` | `20` | `100` |

A `pageSize` above the maximum is rejected with `VALIDATION_ERROR`.

---

## 4. Response Format

### 4.1 Single Resource

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

### 4.2 Resource Collection

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

### 4.3 Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request data does not satisfy validation rules",
    "details": [
      { "field": "name", "message": "must not be empty" }
    ]
  }
}
```

`details`, when present, is an array of `{ "field", "message" }` entries.
It is omitted entirely (not `null`, not `[]`) when the error carries no
field-level information. This is the case for every code other than
`VALIDATION_ERROR`, and for `VALIDATION_ERROR` responses raised by the
domain layer rather than by request decoding (section 12). In the current
backend, only request-decoding failures carry `details`, as a single entry
with an empty `field` (section 19).

The frontend relies on the stable error `code`, not on the human-readable
`message`.

---

## 5. Authentication

Implements: FR-027 to FR-029, BR-022 to BR-024, UC-11.

How the authenticated context is transmitted is an implementation decision
left open by the requirements. The current backend uses an `HttpOnly`,
`SameSite=Lax` cookie named `georesponse_token` (marked `Secure` when
`APP_ENV=production`), set on login and cleared on logout, so the frontend
never handles a token directly. Every protected endpoint below reads that
cookie; a request without a valid one receives `401 AUTHENTICATION_FAILED`.

### 5.1 Login

```http
POST /api/v1/auth/login
```

Request:

```json
{
  "identifier": "user-001",
  "password": "..."
}
```

The credential format is an implementation decision; in the current
backend `identifier` is the user's `id` (the users table has no separate
username or email column).

A successful response (`200`) establishes an authenticated context and
returns the authenticated user's identity in the same shape as
`GET /api/v1/auth/me`.

Invalid credentials are rejected with `401 AUTHENTICATION_FAILED`, and no
authenticated context is established.

---

### 5.2 Logout

```http
POST /api/v1/auth/logout
```

Ends the caller's authenticated context. This endpoint requires an existing
authenticated context; calling it without one returns
`401 AUTHENTICATION_FAILED`.

A successful logout returns `204` with no response body. After logout, the
previous authenticated context no longer grants access to protected
operations.

---

### 5.3 Current User

```http
GET /api/v1/auth/me
```

Returns the identity and authorization information of the authenticated
user. Requires an authenticated context; otherwise returns
`401 AUTHENTICATION_FAILED`.

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

## 6. Resource Management

Implements: FR-001 to FR-009, BR-001 to BR-004, BR-015 to BR-021, UC-01,
UC-02, UC-06, UC-07, UC-10.

### 6.1 List Resources

```http
GET /api/v1/resources
```

Supported query parameters:

| Parameter | Purpose | Notes |
|---|---|---|
| `search` | Free-text match against supported resource information | Optional; an empty value returns unfiltered results. Currently a case-insensitive substring match on `name` |
| `type` | Filter by resource type | One of the values in `DATA_CONTRACT.md` section 3.2 |
| `status` | Filter by resource status | One of the values in `DATA_CONTRACT.md` section 3.3 |
| `page` | Page number | Default `1` |
| `pageSize` | Page size | Default `20`, maximum `100` |

Multiple filters may be combined; the result contains only resources that
satisfy all selected criteria.

Example:

```http
GET /api/v1/resources?search=vehicle&type=VEHICLE&status=AVAILABLE&page=1&pageSize=20
```

If no resources match, the response is an empty `data` array with
`meta.total` of `0`, not an error.

This endpoint is also the data source for the map view; the frontend
derives map markers from each returned resource's `location`.

---

### 6.2 Get Resource

```http
GET /api/v1/resources/{id}
```

Returns the selected resource. If it does not exist, the backend returns
`404 RESOURCE_NOT_FOUND`.

---

### 6.3 Create Resource

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

The caller supplies the resource `id`. The `attributes` object is
type-specific; the attribute keys per type are in `DATA_CONTRACT.md`
section 3.4. The attribute set may be extended without changing this
endpoint's shape.

The backend validates the complete request before persistence (section
12). If `id` conflicts with an existing resource, it returns
`409 RESOURCE_ID_CONFLICT`. A successful creation returns `201` with the
created resource and records the operation in the audit trail.

---

### 6.4 Update Resource

```http
PUT /api/v1/resources/{id}
```

The operation may update resource information, including:

- name
- type
- status
- attributes
- location

The resource keeps its identity. A location change through this endpoint
is a general information update; a location change made as a relocation
must use `PATCH /api/v1/resources/{id}/location` (section 8) so that
relocation invariants and location history apply.

The backend validates the requested changes before persistence and, on
success, records the change in resource change history and the audit
trail. If the resource does not exist, it returns `404 RESOURCE_NOT_FOUND`.

---

### 6.5 Delete Resource

```http
DELETE /api/v1/resources/{id}
```

The frontend asks for confirmation before invoking deletion; confirmation
is a frontend concern and not part of this API call.

The backend enforces authorization and, on success, records the deletion
in the audit trail and returns `204`. Afterwards the resource is no longer
returned by `GET /api/v1/resources` or `GET /api/v1/resources/{id}`. If the
resource does not exist, the backend returns `404 RESOURCE_NOT_FOUND`.

Deletion is a hard delete of the current resource record; prior history
and audit records remain available (`DATABASE_ARCHITECTURE.md` section
6.4).

---

## 7. Resource Status

Implements: FR-010 to FR-012, BR-005 to BR-008, UC-08.

### 7.1 Change Resource Status

```http
PATCH /api/v1/resources/{id}/status
```

Request:

```json
{
  "status": "MAINTENANCE"
}
```

`status` must be one of the values in `DATA_CONTRACT.md` section 3.3.

The backend validates the status, persists the change, and records status
history and audit information. A status change does not change the
resource's location, just as a relocation does not change its status
(section 8; `DOMAIN_MODEL.md` section 9.1).

If the resource does not exist, the backend returns
`404 RESOURCE_NOT_FOUND`. If the submitted status is not a defined value,
it returns `400 INVALID_RESOURCE_STATUS`.

---

## 8. Resource Relocation

Implements: FR-022 to FR-026, BR-009 to BR-014, UC-09.

### 8.1 Relocate Resource

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

1. validate the destination coordinates
2. update the resource location
3. preserve the resource identity
4. preserve the resource type
5. not change the resource status
6. record location history
7. record the operation in the audit trail

Relocation updates the existing resource and never creates a new one. It
does not perform route planning, navigation, travel tracking, or automated
dispatch (`DOMAIN_MODEL.md` section 9.2, `SCOPE.md` sections 4.3 and
4.4).

If the resource does not exist, the backend returns
`404 RESOURCE_NOT_FOUND`. If the destination coordinates are invalid, it
returns `400 INVALID_LOCATION` and does not apply the relocation.

After a successful response, the frontend updates the resource position on
the map.

---

## 9. Resource History

Implements: FR-034 to FR-037, BR-029 to BR-034, UC-13.

### 9.1 View Resource History

```http
GET /api/v1/resources/{id}/history
```

Supported query parameters:

| Parameter | Purpose | Notes |
|---|---|---|
| `type` | Restrict the response to one history category | One of `status`, `location`, `change`; omitted returns all categories |
| `page` | Page number | Default `1`, applied per category when `type` is omitted |
| `pageSize` | Page size | Default `20`, maximum `100` |

The response contains status history, location history, and resource
change history:

```json
{
  "data": {
    "statusHistory": [],
    "locationHistory": [],
    "changeHistory": []
  }
}
```

Entry shapes are defined in `DATA_CONTRACT.md` section 8; the rules for
what history records and how it may be interpreted are BR-029 to BR-034.

Access is restricted to authorized users. If the resource does not exist,
the backend returns `404 RESOURCE_NOT_FOUND`. If no history exists, it
returns empty arrays for the applicable categories, not an error.

---

## 10. Authorization and Administration

Implements: FR-030 to FR-033, BR-025 to BR-028, UC-12.

The role and permission model is defined by the authorization
implementation. The API enforces permissions on protected operations
whether the request comes from the GeoResponse frontend or another API
client.

### 10.1 List Roles

```http
GET /api/v1/roles
```

### 10.2 List Permissions

```http
GET /api/v1/permissions
```

### 10.3 Role Management

```http
POST /api/v1/roles
PUT /api/v1/roles/{id}
DELETE /api/v1/roles/{id}
```

### 10.4 Permission Assignment

```http
PUT /api/v1/roles/{id}/permissions
```

### 10.5 User Role Assignment

```http
PUT /api/v1/users/{id}/roles
```

Assigns the set of roles held by a user. This endpoint governs which roles
a user holds; section 10.4 governs which permissions a role grants.
Together they implement role-based access control.

These operations are restricted to authorized administrators, and changes
are recorded in the audit trail. A caller without the required permission
receives `403 AUTHORIZATION_DENIED`.

### 10.6 Request and Response Shapes

The `Role`, `Permission`, and `User` representations are defined in
`DATA_CONTRACT.md` sections 5 to 7. Endpoint-specific shapes:

| Endpoint | Request body | Success response |
|---|---|---|
| `GET /api/v1/roles` | None | `200 { "data": [Role, ...] }` (not paginated; no `meta`) |
| `GET /api/v1/permissions` | None | `200 { "data": [Permission, ...] }` (not paginated; no `meta`) |
| `POST /api/v1/roles` | `{ "id": "role-002", "name": "coordinator" }` (`id` optional; generated when omitted) | `201 { "data": Role }` |
| `PUT /api/v1/roles/{id}` | `{ "name": "coordinator" }` | `200 { "data": Role }` |
| `DELETE /api/v1/roles/{id}` | None | `204` |
| `PUT /api/v1/roles/{id}/permissions` | `{ "permissions": ["resource.read", ...] }`; replaces the role's full permission set | `204` |
| `PUT /api/v1/users/{id}/roles` | `{ "roles": ["operator", ...] }`; role **names**, replaces the user's full role set | `204` |

A role, permission code, or user that does not exist returns
`404 RESOURCE_NOT_FOUND`. A role `name` that collides with an existing role
returns `400 VALIDATION_ERROR`.

---

## 11. Audit Trail

Implements: FR-038 to FR-040, BR-035 to BR-039, UC-14.

### 11.1 View Audit Trail

```http
GET /api/v1/audit-logs
```

The endpoint is restricted to users with the required permission; a caller
without it receives `403 AUTHORIZATION_DENIED`.

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

`page` defaults to `1` and `pageSize` to `20` (maximum `100`), per section
3.3. `operation` takes one of the operation values defined in
`DATA_CONTRACT.md` section 9. `startTime` and `endTime` are inclusive
RFC 3339 / ISO 8601 timestamps (e.g. `2026-09-19T10:30:00Z`); a value that
does not parse is ignored rather than rejected.

The response uses the paginated collection envelope (section 4.2) with
`AuditRecord` items as defined in `DATA_CONTRACT.md` section 9, most recent
first. Each record identifies the operation type, the time, the user, the
affected resource, and relevant change information, where available.

Audit records represent only successfully completed operations. If no
records match the filters, the backend returns an empty `data` array, not
an error.

---

## 12. Validation

Implements: FR-041 to FR-043, FR-045, FR-046, BR-016, BR-042, and the
validation-related alternative flows in `USE_CASES.md` section 5.1.

All state-changing endpoints validate input before executing the
operation. Backend validation is authoritative; frontend validation
improves user experience but is not the enforcement mechanism
(`TECHNOLOGY_SELECTION.md` section 13.2). Where in the backend each check
runs is described in `BACKEND_VALIDATION.md`.

| Field | Rule | Source | Failure Code |
|---|---|---|---|
| `id` | Required; unique among active resources | BR-001 | `VALIDATION_ERROR` (missing) / `RESOURCE_ID_CONFLICT` (duplicate) |
| `name` | Required; non-empty | BR-002 | `VALIDATION_ERROR` |
| `type` | Required; one of the defined resource types | BR-003 | `INVALID_RESOURCE_TYPE` |
| `status` | Required; one of the defined resource statuses | BR-005, BR-006 | `INVALID_RESOURCE_STATUS` |
| `attributes` | Validated according to the rules for the resource's type | BR-004 | `VALIDATION_ERROR` |
| `location.latitude` | Required; `-90` to `90` | BR-009, BR-010 | `INVALID_LOCATION` |
| `location.longitude` | Required; `-180` to `180` | BR-009, BR-010 | `INVALID_LOCATION` |
| Authentication credentials | Required for `POST /auth/login` | BR-024 | `AUTHENTICATION_FAILED` |
| Authorization | Caller must hold the required permission for the operation | BR-026, BR-027 | `AUTHORIZATION_DENIED` |

Invalid data is never persisted, and an operation is never reported as
successful when validation, authorization, or persistence did not
complete.

When validation fails, the response identifies the invalid field(s) through
the `details` array of the error response (sections 4.3 and 13).

---

## 13. Error Contract

Implements: FR-043, FR-047, FR-051 to FR-053.

The API uses stable machine-readable error codes so the frontend can react
to error conditions without parsing human-readable text.

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
| `PERSISTENCE_ERROR` | 500 | The operation could not be completed due to a persistence failure (also returned for any unrecognized server-side error) |
| `HOTSPOT_UPSTREAM_UNAVAILABLE` | 502 | BMKG hotspot data (section 18) could not be fetched and no previously fetched result is available |

`VALIDATION_ERROR` also covers conditions without a more specific code: a
missing `id` or `name`, a missing or invalid type-specific attribute, a
request body with an unknown field, and a role name conflict (section
10.6).

Example:

```json
{
  "error": {
    "code": "INVALID_LOCATION",
    "message": "Geographic coordinates are missing or out of range"
  }
}
```

`details` appears only on `VALIDATION_ERROR` responses that carry
field-level information (section 4.3).

Error messages are for humans; error codes are for application logic. A
persistence failure is never reported to the caller as a successful
operation.

---

## 14. API Versioning

The API version is part of the URL:

```text
/api/v1/...
```

Breaking changes use a new API version instead of silently changing the
meaning of an existing contract.

---

## 15. Requirement Traceability

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
| FR-013 to FR-015 Geographic Location | `location` field on resource endpoints |
| FR-016 Search Resources | `GET /api/v1/resources?search=` |
| FR-017 to FR-019 Filter Resources | `GET /api/v1/resources?type=&status=` |
| FR-020 to FR-022 Geospatial Visualization | `GET /api/v1/resources`, `PATCH /api/v1/resources/{id}/location` |
| FR-023 to FR-026 Resource Relocation | `PATCH /api/v1/resources/{id}/location` |
| FR-027 to FR-029 Authentication | `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` |
| FR-030 to FR-033 Authorization | `GET/POST/PUT/DELETE /api/v1/roles`, `GET /api/v1/permissions`, `PUT /api/v1/roles/{id}/permissions`, `PUT /api/v1/users/{id}/roles` |
| FR-034 to FR-037 Resource History | `GET /api/v1/resources/{id}/history` |
| FR-038 to FR-040 Audit Trail | `GET /api/v1/audit-logs` |
| FR-041 to FR-043 Data Validation | Section 12 (all state-changing endpoints) |
| FR-044 Provide Resource Management APIs | This document |
| FR-045, FR-046 Validate/Enforce via API | Section 12 (all state-changing endpoints) |
| FR-047 Provide API Error Responses | Section 13 |
| FR-048 to FR-050 Data Persistence | Enforced by the backend behind every state-changing endpoint; not directly observable in the API shape |
| FR-051 Handle Resource Not Found | `404 RESOURCE_NOT_FOUND` |
| FR-052 Handle Unauthorized Access | `403 AUTHORIZATION_DENIED` |
| FR-053 Handle Persistence Failure | `500 PERSISTENCE_ERROR` |

---

## 16. Scope Boundary

This contract does not define:

- database tables or SQL schema
- database indexes
- Go package structure
- map-library implementation details
- authentication token implementation
- password hashing implementation
- deployment configuration
- gRPC services
- WebSocket/SSE protocols

Those details belong to `DATABASE_SCHEMA.md`, `BACKEND_ARCHITECTURE.md`,
`FRONTEND_ARCHITECTURE.md`, `SECURITY.md`, and `DEPLOYMENT.md`.

Consistent with `SCOPE.md` section 4, there are no endpoints for route
planning, automated dispatch, resource optimization, real-time or
continuous location tracking, or external sensor integration.
Radius-based or bounding-box spatial search (`SCOPE.md` section 6.1) is
future scope and not part of this contract until the product scope is
updated. The read-only BMKG hotspot overlay (section 18) is situational
context drawn on the map, not a managed resource, sensor integration, or
dispatch capability.

---

## 17. Frontend and Backend Responsibilities

The API is the stable boundary between the frontend and backend. The
frontend must not:

- access the database directly
- depend on Go implementation details
- enforce business rules only in the UI
- depend on MapLibre-specific API structures

The backend is responsible for validation, authorization, business rules,
persistence, and consistent error handling.

---

## 18. Situational Awareness: BMKG Hotspots

A read-only overlay of fire and heat-anomaly detections from BMKG's public
GeoHotspot service, drawn on the map alongside resources. A hotspot is
never an application-managed `Resource`: it cannot be created, edited,
relocated, or deleted through this API, has no status or history, and
triggers no dispatch.

### 18.1 List Hotspots

```http
GET /api/v1/hotspots
```

Requires an authenticated context (section 5).

| Parameter | Purpose | Notes |
|---|---|---|
| `hours` | Recency window: detections within the `hours` hours ending at BMKG's most recent observation | Default `24`, maximum `72`; a value that is missing, non-numeric, `<= 0`, or `> 72` falls back to `24` |

The window ends at the newest observation BMKG has published, not at the
current time: the GeoHotspot feed is published with a lag of days, so a
wall-clock window would be empty exactly when the latest available data
matters most. Clients can read how current the overlay is from
`observedDate` and `originDate`; results are ordered newest first. BMKG's
layer returns at most 2,000 features per query, so a busy window is
truncated to the 2,000 most recent detections.

The response uses the collection envelope (section 4.2). It is not
paginated: `meta.page` is always `1` and `meta.pageSize` equals
`meta.total`.

```json
{
  "data": [
    {
      "id": "12345",
      "latitude": -2.1234,
      "longitude": 113.5678,
      "region": "Kalimantan",
      "province": "Kalimantan Tengah",
      "regency": "Kotawaringin Timur",
      "district": "Mentaya Hilir Utara",
      "observedDate": "2026-09-19",
      "observedTime": "05:50",
      "updatedAt": "2026-09-19T06:00:00Z",
      "originDate": "2026-09-19T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 1, "total": 1 }
}
```

Field meanings are in `DATA_CONTRACT.md` section 16. If BMKG is
unreachable, the backend serves the last successfully fetched list
(possibly stale); only when no prior result exists does it return
`502 HOTSPOT_UPSTREAM_UNAVAILABLE` (section 13).

---

## 19. Known Implementation Deviations at Submission

As of 2026-09-20 the shipped backend differs from this contract in the
points below. The contract text above is the intended behaviour and is
left unchanged (see also `SCOPE.md` section 11).

| Section | Contract says | Implementation does |
|---|---|---|
| 6.4 Update Resource | Body may also carry `status` and `location` | Body accepts only `name`, `type`, `attributes`; a body containing `status` or `location` is rejected with `400 VALIDATION_ERROR` (strict decoding). Status and location change only through 7.1 and 8.1. |
| 3.3, 6.1, 9.1, 11.1 Pagination | `pageSize` above 100 is rejected with `400 VALIDATION_ERROR` | `pageSize` above 100 is silently capped to 100; non-positive values fall back to the defaults. |
| `DATA_CONTRACT.md` 3.1 | Resource payload includes `updatedAt` | `updatedAt` is stored but not emitted in the resource response. |
| 9.1 View Resource History | Restricted to authorized users | Requires authentication only; no `resource.read` permission check. |
| `DATA_CONTRACT.md` 12 | Optional fields are `null` | History and audit optional fields (`changedBy`, `userId`, `resourceId`) are omitted from the JSON when absent. |
| 12 / 13 Validation `details` | `details` names the failing field | Domain validation failures carry no `details`; request-decoding failures carry one entry with an empty `field`. |
| 10.3 Update Role | Response is a role object | `permissions` serialises as `null` instead of `[]` on `PUT /api/v1/roles/{id}` only. |
