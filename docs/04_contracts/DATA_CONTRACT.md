# Data Contract

## 1. Purpose

This document defines the application-level data exchanged between the
frontend and backend.

It describes the meaning and structure of the main data objects without
defining the physical database schema.

---

## 2. General Conventions

### Identifier

Every resource and other persistent entity has a stable unique identifier.

The identifier must be unique among active resources (`BUSINESS_RULES.md`
BR-001). Submitting a duplicate identifier during creation is rejected with
`RESOURCE_ID_CONFLICT` (`API_CONTRACT.md` section 13).

Example:

```json
{
  "id": "resource-001"
}
```

### JSON Naming

JSON field names use `camelCase`.

Example:

```json
{
  "resourceId": "resource-001",
  "updatedAt": "2026-09-19T10:30:00Z"
}
```

### Timestamp

Timestamps use ISO 8601 format.

Example:

```text
2026-09-19T10:30:00Z
```

### Geographic Coordinates

API objects represent a location as:

```json
{
  "latitude": -6.9147,
  "longitude": 107.6098
}
```

Latitude must be in the range:

```text
-90 to 90
```

Longitude must be in the range:

```text
-180 to 180
```

When GeoJSON is used, GeoJSON coordinate order applies:

```text
[longitude, latitude]
```

---

# 3. Resource

A `Resource` represents a real-world object managed by GeoResponse.

## 3.1 Required Information

A resource contains, at minimum:

```text
id
name
type
status
location
attributes
```

Example:

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
  },
  "updatedAt": "2026-09-19T10:30:00Z"
}
```

---

## 3.2 Resource Types

The MVP supports:

```text
VEHICLE
FACILITY
EQUIPMENT
IOT_DEVICE
```

These are the canonical wire-format values for the `type` field, matching
`DOMAIN_MODEL.md` section 5 and using the same `SCREAMING_SNAKE_CASE`
convention as `status` (section 3.3). Product-level documents
(`SCOPE.md`, `USE_CASES.md`, `FUNCTIONAL_REQUIREMENTS.md`) may refer to
these types by their human-readable names (Vehicle, Facility, Equipment,
IoT Device); this contract defines the value actually exchanged over the
API.

The model should allow additional resource types to be introduced without
changing the fundamental resource concept.

---

## 3.3 Resource Status

The MVP supports:

```text
AVAILABLE
IN_USE
MAINTENANCE
UNAVAILABLE
```

Status changes are part of the resource's history and audit trail.

---

## 3.4 Resource Attributes

Attributes contain information relevant to the specific resource type.

The attribute keys follow the type-specific examples defined in
`DOMAIN_MODEL.md` section 6.2:

```json
{
  "type": "VEHICLE",
  "attributes": {
    "vehicleType": "Ambulance",
    "capacity": 4
  }
}
```

```json
{
  "type": "FACILITY",
  "attributes": {
    "facilityType": "Field Hospital",
    "capacity": 50
  }
}
```

```json
{
  "type": "EQUIPMENT",
  "attributes": {
    "equipmentType": "Water Pump",
    "quantity": 10
  }
}
```

```json
{
  "type": "IOT_DEVICE",
  "attributes": {
    "deviceType": "Flood Sensor"
  }
}
```

The exact attribute set depends on the resource type.

The backend is responsible for validating applicable attributes.

---

# 4. Resource Location

A resource must always have a geographic location.

```json
{
  "location": {
    "latitude": -6.9147,
    "longitude": 107.6098
  }
}
```

A location update changes the resource's geographic position while preserving:

- resource identity;
- resource type; and
- current status.

A successful location change creates a location history record and an audit
record.

---

# 5. User

A `User` represents an authenticated application user.

Example:

```json
{
  "id": "user-001",
  "name": "Example User",
  "roles": ["operator"]
}
```

Authentication credentials are not part of the general application data
returned to the frontend.

## 5.1 Assigning Roles to a User

The set of roles held by a user is updated through
`PUT /api/v1/users/{id}/roles` (`API_CONTRACT.md` section 10.5).

Request:

```json
{
  "roles": ["operator"]
}
```

The request replaces the user's complete role set. The response returns
the updated `User` representation shown in section 5.

---

# 6. Role

A `Role` groups permissions that determine which protected operations a user
can perform.

Example:

```json
{
  "id": "role-001",
  "name": "operator",
  "permissions": [
    "resource.read",
    "resource.create",
    "resource.update"
  ]
}
```

The exact role set is an authorization implementation decision.

---

# 7. Permission

A `Permission` represents an allowed protected operation.

Example:

```json
{
  "id": "permission-001",
  "code": "resource.update",
  "name": "Update Resource"
}
```

The backend is responsible for enforcing permissions. Frontend visibility
controls are not sufficient for authorization.

---

# 8. Resource History

Resource history records changes affecting a resource.

History contains three main categories:

```text
Status History
Location History
Resource Change History
```

## 8.1 Status History

```json
{
  "id": "history-001",
  "resourceId": "resource-001",
  "previousStatus": "AVAILABLE",
  "newStatus": "IN_USE",
  "changedAt": "2026-09-19T10:30:00Z",
  "changedBy": "user-001"
}
```

## 8.2 Location History

```json
{
  "id": "history-002",
  "resourceId": "resource-001",
  "previousLocation": {
    "latitude": -6.9147,
    "longitude": 107.6098
  },
  "newLocation": {
    "latitude": -6.9150,
    "longitude": 107.6102
  },
  "changedAt": "2026-09-19T10:35:00Z",
  "changedBy": "user-001"
}
```

## 8.3 Resource Change History

```json
{
  "id": "history-003",
  "resourceId": "resource-001",
  "changes": [
    {
      "field": "name",
      "before": "Vehicle A",
      "after": "Vehicle B"
    }
  ],
  "changedAt": "2026-09-19T10:40:00Z",
  "changedBy": "user-001"
}
```

The history model must provide enough information to determine the affected
resource, relevant before/after values when available, time of change, and
responsible user when user identity is available.

---

# 9. Audit Record

An `AuditRecord` represents a traceable operation that affects system state.

Example:

```json
{
  "id": "audit-001",
  "operation": "RESOURCE_UPDATED",
  "userId": "user-001",
  "resourceId": "resource-001",
  "occurredAt": "2026-09-19T10:40:00Z",
  "details": {}
}
```

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

The audit record is separate from resource history because auditability
covers system operations, while resource history focuses on changes to a
resource.

---

# 10. GeoJSON Representation

GeoJSON may be used when geographic data needs to be represented as map
features.

Example:

```json
{
  "type": "Feature",
  "properties": {
    "resourceId": "resource-001",
    "name": "Vehicle A"
  },
  "geometry": {
    "type": "Point",
    "coordinates": [107.6098, -6.9147]
  }
}
```

GeoJSON is a representation format for geographic data. It is not the
domain model of `Resource`.

The API should therefore avoid coupling the entire resource contract to
MapLibre-specific structures.

---

# 11. Validation

The backend validates persistent application data before it becomes valid
system state.

Validation covers, where applicable:

- identifier;
- name;
- resource type;
- resource status;
- geographic location;
- resource attributes;
- authentication input; and
- authorization requirements.

Invalid data must not be persisted.

---

# 12. Null and Optional Values

Optional fields should have a consistent representation.

When a field is explicitly nullable, use:

```json
{
  "description": null
}
```

Do not use multiple representations for the same semantic state.

---

# 13. Data Ownership

### Backend

The backend is responsible for:

- validating data;
- applying business rules;
- enforcing authorization;
- maintaining persistence;
- maintaining resource history;
- maintaining audit records; and
- providing API-compatible representations.

### Frontend

The frontend is responsible for:

- displaying data;
- collecting user input;
- presenting validation feedback;
- managing UI state; and
- formatting data for presentation.

The frontend is not the source of truth for persistent application data.

---

# 14. Scope Boundary

This contract does not define:

- database tables;
- database columns;
- foreign keys;
- database indexes;
- SQL queries;
- migration structure;
- password storage;
- token format; or
- physical storage implementation.

Those concerns belong to database, security, and implementation
documentation.

---

# 15. Contract Principle

The data contract defines a stable application-level representation.

Internal implementation changes should not require unnecessary changes to
the frontend as long as the public data contract remains compatible.
