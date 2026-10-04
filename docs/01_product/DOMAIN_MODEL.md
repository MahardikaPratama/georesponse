# Domain Model

## 1. Purpose

This document defines the core domain concepts of GeoResponse and how they
relate. It is the shared reference for the frontend, backend, database, API
contract, and business rules, and describes what each concept means in the
product, not how it is implemented.

Table structures, API endpoints, source layout, and frameworks are out of
scope here. The wire format is in `docs/04_contracts/DATA_CONTRACT.md` and
the rules that enforce these concepts are in `BUSINESS_RULES.md`.

## 2. Core Domain Concept

The primary domain concept in GeoResponse is `Resource`: a real-world object
managed by GeoResponse in the context of disaster response.

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

`Resource` is a real-world object whose information GeoResponse manages to
support disaster response monitoring and management. A resource has an
identity, type, attributes, operational status, and geographic location.

### 3.2 Characteristics

Each resource:

- has a unique identity
- has a name or other identifying information
- has exactly one resource type
- has an operational status
- may have type-specific attributes
- has geographic location information
- may have its information changed while the system manages it

### 3.3 Examples

A resource may represent a vehicle, a facility, equipment, or an IoT device.
Additional resource types may be introduced later without changing the
fundamental resource concept.

## 4. Resource Identity

`Identity` is the information that distinguishes one resource from another.
It includes at least a unique identifier and an identifying name.

The identifier is the primary identity of a resource within the system. The
name helps users recognize and distinguish resources. A resource's identity
does not change when its status or location changes.

## 5. Resource Type

`Resource Type` defines the category of real-world object a resource
represents. The MVP supports:

```text
VEHICLE
FACILITY
EQUIPMENT
IOT_DEVICE
```

A resource has one type at a time. The type determines which additional
attributes are relevant to the resource (see section 6.2).

## 6. Resource Attributes

`Attributes` are additional information describing the characteristics of a
resource.

### 6.1 Common Attributes

Attributes shared across resources include name, type, status, and
location.

### 6.2 Type-Specific Attributes

Some attributes are relevant only to specific resource types:

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

These are conceptual; the actual attribute keys and their validation are
defined by the requirements and `docs/04_contracts/DATA_CONTRACT.md`
section 3.4. Type-specific attributes must not change the fundamental
identity or meaning of the resource.

## 7. Resource Status

`Status` represents the operational condition of a resource as known to the
system. The MVP uses:

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

A resource's status represents its condition at a given point in time and
may change while the resource is managed by the system.

## 8. Resource Location

`Location` represents the geographic location of a resource. It is a
fundamental part of the resource model because GeoResponse is a geospatial
application. In the MVP, location is a latitude and longitude pair.

Location is used to:

- display resources on a map
- identify where resources are
- support location-based resource discovery
- update resource locations through relocation

## 9. Resource Relocation

`Resource Relocation` is a user-initiated change to the geographic location
of an existing resource.

```text
Current Location
       ↓
Relocation Action
       ↓
Destination Location
       ↓
Updated Resource Location
```

Relocation does not change the identity of the resource. It does not change
the resource type unless a separate operation changes that type.

### 9.1 Relocation Characteristics

When a resource is relocated:

- it remains the same resource
- its identifier is unchanged
- its type is unchanged
- its status is unchanged unless a separate status change occurs
- its location is updated to the destination location
- the time of the location change may be recorded by the system

### 9.2 Relocation Boundary

Relocation only represents a location change managed by the system. It does
not include route planning, navigation, travel tracking, automated dispatch,
or continuous GPS tracking.

## 10. Resource Lifecycle

A resource follows a lifecycle driven by resource management operations:

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

A resource may undergo many information changes during its lifecycle. A
status change or relocation modifies the existing resource; it never
creates a new one.

## 11. Domain Relationships

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

- one `Resource` has one `Identity`, one `Type`, one `Status`, and one
  `Location`
- one `Resource` may have multiple `Attributes`
- one `Resource` may undergo multiple information changes during its
  lifecycle
- `Relocation` changes the `Location` of an existing resource

## 12. Domain Invariants

The domain invariants are enforced as business rules in
`BUSINESS_RULES.md`:

| Invariant | Rules |
|---|---|
| Every resource has a unique identifier | BR-001 |
| Every resource has a valid type | BR-003 |
| Every resource has a valid status | BR-005, BR-006 |
| Location uses valid geographic coordinates | BR-009, BR-010 |
| Relocation applies to an existing resource and never creates a new one | BR-012 |
| Status, location, or attribute changes preserve identity | BR-007, BR-012, BR-015 |

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

`Resource` is the primary domain concept. `Entity` may be used when
referring to the original take-home brief or as a generic technical term,
but it is not the domain term in GeoResponse.

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

Each layer may use a different technical representation, but it must
preserve the meaning of the domain concepts. A change to the domain model
must be checked for its impact on the business rules, functional
requirements, API and data contracts, frontend, backend, and database.
