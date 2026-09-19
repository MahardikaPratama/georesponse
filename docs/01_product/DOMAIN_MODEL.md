# Domain Model

## 1. Purpose

This document defines the core domain concepts used by GeoResponse and the relationships between those concepts.

The domain model serves as a shared reference for:

- frontend;
- backend;
- database;
- API contract;
- business rules; and
- AI Agents.

The domain model describes the meaning of a concept within the product, not its implementation details.

This document does not define:

- database table structures;
- API endpoints;
- source code structure;
- frameworks;
- libraries; or
- frontend and backend implementation details.

## 2. Core Domain Concept

The primary domain concept in GeoResponse is `Resource`.

A resource represents a real-world object managed by GeoResponse in the context of disaster response.

A resource consists of:

```text
Resource
├── Identity
├── Type
├── Attributes
├── Status
└── Location
```

## 3. Resource

### 3.1 Definition

`Resource` is a real-world object whose information is managed by GeoResponse to support disaster response resource monitoring and management.

A resource has an identity, type, attributes, operational status, and geographic location.

### 3.2 Characteristics

Each resource:

- has a unique identity;
- has a name or identifying information;
- has one resource type;
- has an operational status;
- may have type-specific attributes;
- has geographic location information; and
- may undergo information changes while managed by the system.

### 3.3 Examples

A resource may represent:

- a vehicle;
- a facility;
- equipment; or
- an IoT device.

Additional resource types may be introduced in the future without changing the fundamental resource concept.

## 4. Resource Identity

`Identity` contains the information used to distinguish one resource from another.

Identity includes at least:

- a unique identifier; and
- an identifying name.

The identifier is the primary identity of a resource within the system.

The name helps users recognize and distinguish resources.

A resource's identity does not change when its status or location changes.

## 5. Resource Type

`Resource Type` defines the category of real-world object represented by a resource.

The MVP supports the following resource types:

```text
VEHICLE
FACILITY
EQUIPMENT
IOT_DEVICE
```

A resource has one type at a time.

The resource type determines the context for additional attributes that are relevant to that resource.

Examples include:

```text
Vehicle
├── vehicle type
└── capacity

Facility
├── facility type
└── capacity

Equipment
├── equipment type
└── quantity

IoT Device
└── device type
```

These type-specific attributes are conceptual examples. The actual attributes are defined by the requirements and data contract.

## 6. Resource Attributes

`Attributes` are additional information describing the characteristics of a resource.

### 6.1 Common Attributes

Attributes that may be shared across resources include:

- name;
- type;
- status; and
- location.

### 6.2 Type-Specific Attributes

Some attributes are relevant only to specific resource types.

Examples include:

```text
Vehicle
→ vehicle type
→ capacity

Facility
→ facility type
→ capacity

Equipment
→ equipment type
→ quantity

IoT Device
→ device type
```

Type-specific attributes must not change the fundamental identity or meaning of the resource.

## 7. Resource Status

`Status` represents the operational condition of a resource known to the system.

The MVP uses the following statuses:

```text
AVAILABLE
IN_USE
MAINTENANCE
UNAVAILABLE
```

### 7.1 AVAILABLE

The resource is available for use.

### 7.2 IN_USE

The resource is currently being used.

### 7.3 MAINTENANCE

The resource is undergoing maintenance and is not available for normal use.

### 7.4 UNAVAILABLE

The resource is not available for use.

A resource's status represents its condition at a given point in time and may change while the resource is managed by the system.

## 8. Resource Location

`Location` represents the geographic location of a resource.

Location is a fundamental part of the resource model because GeoResponse is a geospatial resource management application.

In the MVP, location is represented using:

- latitude; and
- longitude.

Location information is used to:

- display resources on a map;
- identify resource locations;
- support location-based resource discovery; and
- update resource locations through resource relocation.

## 9. Resource Relocation

`Resource Relocation` represents a change to the geographic location of an existing resource initiated by a user.

The conceptual flow is:

```text
Current Location
       ↓
Relocation Action
       ↓
Destination Location
       ↓
Updated Resource Location
```

Relocation does not change the identity of the resource.

Relocation does not change the resource type unless a separate operation explicitly changes that type.

### 9.1 Relocation Characteristics

When a resource is relocated:

- the relocated resource remains the same resource;
- its identifier remains unchanged;
- its type remains unchanged;
- its status remains unchanged unless a separate status change occurs;
- its location is updated to the destination location; and
- the time of the location change may be recorded by the system.

### 9.2 Relocation Boundary

Resource relocation only represents a location change managed by the system.

It does not include:

- route planning;
- navigation;
- travel tracking;
- automated dispatch; or
- continuous GPS tracking.

## 10. Resource Lifecycle

A resource follows a lifecycle based on resource management operations.

The primary lifecycle is:

```text
Create
  ↓
Active Management
  ↓
Update
  ↓
Relocation / Status Change
  ↓
Update
  ↓
Delete
```

A resource may undergo multiple information changes during its lifecycle.

A status change or relocation modifies the existing resource rather than creating a new resource.

## 11. Domain Relationships

The primary relationships between domain concepts are:

```text
                    Resource
                       │
          ┌────────────┼────────────┐
          │            │            │
          ↓            ↓            ↓
       Identity       Type        Status
          │
          │
          ├─────────────────────────┐
          │                         │
          ↓                         ↓
      Attributes                 Location
                                    │
                                    ↓
                              Relocation
```

Conceptually:

- one `Resource` has one `Identity`;
- one `Resource` has one `Type`;
- one `Resource` has one `Status`;
- one `Resource` has one `Location`;
- one `Resource` may have multiple `Attributes`;
- one `Resource` may undergo multiple information changes during its lifecycle; and
- `Relocation` changes the `Location` of an existing resource.

## 12. Domain Invariants

The domain has the following fundamental invariants.

### 12.1 Resource Identity

Every resource must have a unique identifier.

### 12.2 Resource Type

Every resource must have a valid resource type.

### 12.3 Resource Status

Every resource must have a valid status.

### 12.4 Resource Location

Resource location must use valid geographic coordinates.

### 12.5 Resource Relocation

Relocation must be applied to an existing resource.

Relocation must not create a new resource.

### 12.6 Resource Consistency

Changing a resource's status or location must not unintentionally change its identity.

## 13. Domain Terminology

The following terms must be used consistently throughout GeoResponse:

| Term | Definition |
|---|---|
| Resource | A real-world object managed by the system |
| Resource Type | The category of a resource |
| Identity | Information that identifies a resource |
| Attribute | Information describing characteristics of a resource |
| Status | The operational condition of a resource |
| Location | Geographic information describing the resource's location |
| Relocation | A change to the geographic location of a resource |
| Operator | A user who manages resource information |
| Response Coordinator | A user who monitors resource conditions and distribution |

`Resource` is the primary domain concept.

The term `Entity` may be used when referring to the original take-home requirement or as a generic technical concept, but it is not the primary domain term in GeoResponse.

## 14. Domain Model and Implementation

The domain model must be represented consistently across the system:

```text
Domain Model
     │
     ├── Frontend
     ├── API Contract
     ├── Backend
     └── Database
```

Each layer may use a different technical representation, but the representation must preserve the meaning of the domain concepts.

Changes to the domain model must consider their impact on:

- business rules;
- functional requirements;
- API contract;
- data contract;
- frontend;
- backend; and
- database.
