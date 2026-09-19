# Product Scope

## 1. Purpose

This document defines the scope of GeoResponse to establish the
capabilities, features, and responsibilities of the product within the
current development cycle.

This document is used to:

- define features that are included in the product;
- define features that are outside the product scope;
- establish the MVP boundaries;
- identify potential future capabilities; and
- help AI Agents distinguish between in-scope requirements and requests
  that require an explicit scope change.

Changes to the product scope must be made explicitly and must not be
assumed by an AI Agent or developer.

---

## 2. Primary Scope

GeoResponse focuses on managing and monitoring resources that contain:

- identity;
- type;
- attributes;
- status; and
- geographic location.

The system provides capabilities to manage this information and present
it through resource lists, detailed views, and geographic
representations.

---

## 3. In Scope

### 3.1 Resource Management

The system supports resource management operations, including:

- creating resources;
- viewing resources;
- updating resources;
- deleting resources; and
- viewing resource details.

### 3.2 Resource Types

The system supports the concept of a resource that can represent
different types of real-world objects.

Resource types supported by the MVP may include:

- Vehicle;
- Facility;
- Equipment; and
- IoT Device.

The resource type model should be extensible without changing the
fundamental resource management concept.

### 3.3 Resource Attributes

Each resource contains information relevant to its type.

Common information includes:

- identifier;
- name;
- type;
- status;
- location; and
- other relevant attributes.

Specific attributes may differ between resource types.

### 3.4 Resource Status

The system manages the operational status of each resource.

Resource status provides information about the current operational
condition of a resource and can be used for resource discovery and
filtering.

### 3.5 Geographic Location

Each resource contains geographic location information represented by
coordinates.

Location information is used to:

- store the resource position;
- display resources on a map;
- support location-based resource discovery; and
- support geographic interactions.

### 3.6 Resource Discovery

Users can find resources based on available resource information.

Discovery capabilities include:

- searching by relevant resource information;
- filtering by resource type;
- filtering by resource status; and
- combining relevant filters.

### 3.7 Geospatial Visualization

The system provides a map-based representation of resources using their
geographic coordinates.

Users can select a resource on the map to view its relevant information.

### 3.8 Resource Information

Users can view resource information through:

- resource lists;
- resource details; and
- geographic map representations.

### 3.9 Resource Relocation

The system allows users to relocate a resource by updating its
geographic location. The updated location is reflected in resource
details and on the map, and the change is recorded in location history.

The detailed interaction flow is defined in `USE_CASES.md` (UC-09 —
Relocate Resource).

Resource relocation is initiated by a user. The system does not determine
the travel route or automatically dispatch resources.

### 3.10 Data Validation

The system validates resource data before it is persisted.

Validation covers the validity of resource information, including
fundamental resource attributes and geographic information.

### 3.11 Authentication and Authorization

- user authentication;
- role-based access control; and
- permission management.

### 3.12 Resource History

- status history;
- location history;
- resource change history; and
- audit trails.

### 3.13 API

The backend provides APIs through which the frontend communicates with
the resource management system.

The API is responsible for:

- resource operations;
- input validation;
- business rules;
- error handling; and
- data persistence.

### 3.14 Data Persistence

Resource information is persisted so that data remains available across
application restarts.

### 3.15 Testing and Quality

The product includes automated testing and code quality verification
appropriate to the implementation.

Quality verification may include:

- formatting;
- linting;
- unit testing;
- integration testing;
- test coverage;
- static analysis; and
- SonarQube analysis.

### 3.16 Containerization

The application can be run using containers to provide a consistent
application environment.

Containerization covers the components required to run the system in the
defined development and deployment environments.

---

## 4. Out of Scope

The following capabilities are outside the current product scope.

### 4.1 Disaster Prediction

GeoResponse does not provide:

- disaster prediction;
- disaster location prediction;
- disaster severity prediction; or
- machine learning for disaster prediction.

### 4.2 Early Warning System

GeoResponse is not an early warning system and does not generate or
distribute disaster warnings.

### 4.3 Navigation

The system does not provide:

- turn-by-turn navigation;
- route planning;
- shortest-path calculation; or
- real-time navigation.

### 4.4 Automated Dispatch

The system does not automatically dispatch resources based on disaster
conditions.

### 4.5 Resource Optimization

The system does not automatically optimize:

- resource placement;
- resource allocation;
- resource distribution; or
- resource scheduling.

### 4.6 Real-Time Tracking

GeoResponse does not provide continuous real-time tracking of resource
movement.

The location stored in the MVP represents the current managed location
of a resource rather than a continuous location stream.

### 4.7 Emergency Communication

The system does not provide:

- emergency messaging;
- radio communication;
- voice communication;
- SMS gateways; or
- emergency notification platforms.

### 4.8 Comprehensive Disaster Management

GeoResponse is not a comprehensive disaster management platform covering
the entire disaster management lifecycle, including:

- disaster planning;
- evacuation management;
- victim management;
- shelter management;
- emergency communication; or
- post-disaster recovery management.

### 4.9 External Sensor Management

Although an IoT Device can be represented as a resource, GeoResponse
does not directly manage sensor communication protocols or device
operations.

This includes:

- device provisioning;
- firmware management;
- MQTT infrastructure;
- sensor data ingestion; and
- device command execution.

---

## 5. MVP Scope

The MVP focuses on the following core workflows:

1. Users can view resources.
2. Users can search and filter resources.
3. Users can view resource details.
4. Users can view resources on a map.
5. Users can create resources.
6. Users can update resource information.
7. Users can update resource status.
8. Users can relocate resources to another geographic location.
9. Users can delete resources.
10. The system validates resource data.
11. The system persists resource information.
12. The system displays the updated resource location after relocation.

These workflows represent the minimum integrated product capability
required for the MVP.

---

## 6. Future Scope

The following capabilities may be considered for future development but
are not part of the MVP.

### 6.1 Advanced Geospatial Features

- radius-based search;
- spatial filtering;
- geographic clustering; and
- geofencing.

### 6.2 Real-Time Resource Updates

- real-time location updates;
- real-time status updates; and
- event streaming.

### 6.3 Advanced Resource Management

- resource assignment;
- resource allocation;
- dispatch workflows; and
- resource scheduling.

These capabilities may only become part of the product after the scope
has been explicitly updated.

---

## 7. Scope Boundaries

### 7.1 Resource vs. Disaster

GeoResponse manages resource information related to disaster response.

GeoResponse does not manage the complete information lifecycle of a
disaster event.

### 7.2 Location vs. Navigation

GeoResponse manages and visualizes the geographic location of resources.

GeoResponse does not determine how a user or resource should travel to
a destination.

### 7.3 Status vs. Prediction

GeoResponse stores resource status based on information provided to the
system.

GeoResponse does not predict future resource conditions.

### 7.4 Management vs. Automation

GeoResponse helps users manage resource information.

Operational decisions such as dispatch, allocation, and optimization are
not performed automatically by the system in the MVP.

### 7.5 Relocation vs. Navigation

GeoResponse supports resource relocation by updating the geographic
location of a resource based on a user-initiated action.

GeoResponse does not provide route planning, navigation, or travel
guidance for reaching the destination.

---

## 8. Assumptions

The MVP is developed under the following assumptions:

- Each resource has a unique identifier.
- Resource information is provided by users or trusted data sources.
- Resource locations are represented using geographic coordinates.
- Resource status is managed by the system based on changes made through
  supported operations.
- The amount of resource data used by the MVP is appropriate for the
  application's intended scale.
- Resource locations do not need to be updated in real time in the MVP.
- Resource relocation is performed explicitly by an authorized user or
  supported application workflow.

---

## 9. Constraints

GeoResponse is developed as a take-home project with a focus on
demonstrating software engineering capabilities.

Therefore, the implementation must:

- satisfy the core requirements defined by the take-home test;
- maintain a controlled product scope;
- avoid complexity that does not provide meaningful product or
  engineering value;
- use an architecture that can be extended in the future;
- provide appropriate automated testing;
- apply code quality verification;
- support reproducible execution using containers; and
- provide sufficient technical documentation.

---

## 10. Scope Change Policy

New requests or capabilities that are not defined in this document must
not be implemented as part of the MVP by default.

Before implementation, a proposed scope change must be evaluated against:

1. product goals;
2. user needs;
3. functional requirements;
4. architecture;
5. data model;
6. development effort; and
7. its impact on the existing scope.

An AI Agent must not expand the product scope based solely on assumptions,
implementation preferences, or an attempt to add additional features.

Any approved scope change must be reflected in the relevant product
documentation before it becomes part of the implementation.

---

## 11. Implementation Status at Submission

This section records, as of 2026-09-20, which parts of the scope above are
implemented, which are partial, and which are intentionally left out, so
that no gap is silent. It is a factual snapshot for the take-home
submission, not a change to the scope itself; the checkbox-level record of
what was verified in which environment is `IMPLEMENTATION_CHECKLIST.md`.

### 11.1 Implemented

Every functional requirement (`FR-001` to `FR-053`) and every use case
(`UC-01` to `UC-14`) has a backend implementation (`georesponse-be/`,
exposed under `/api/v1`), a frontend implementation (`georesponse-fe/`),
and automated tests, with the partial items in section 11.2. All out-of-
scope capabilities in section 4 remain unimplemented by design.

### 11.2 Partial

- **FR-033 / UC-12 — Manage Roles and Permissions.** The API supports the
  full model (`POST`/`PUT`/`DELETE /api/v1/roles`, `PUT
  /api/v1/roles/{id}/permissions`, `PUT /api/v1/users/{id}/roles`, all
  audited). The management UI exposes viewing roles and permissions,
  changing a role's permission set, and assigning roles to a user; creating,
  renaming, or deleting a role is available only through the API. Reason:
  the seeded roles cover the MVP actors, so role lifecycle in the UI was
  deferred in favour of permission and user-role assignment.
- **FR-002 / FR-020 — List and map page size.** The API paginates
  (`page`, `pageSize`, default 20, maximum 100). The frontend requests the
  first page with the default size and has no pagination control, so the
  list and map show at most the first 20 matching resources. Search and
  filters apply server-side, so any resource can still be found. Reason:
  the seeded dataset is well below the page size; a pagination control was
  deferred.
- **UC-05 — Map empty state.** When no resources match, the map renders no
  markers and the adjacent resource list shows the empty-state message;
  the map itself has no dedicated empty-state overlay.
- **API contract deviations.** A small number of endpoint-level
  differences between `docs/04_contracts/API_CONTRACT.md` and the shipped
  backend (update-body fields, page-size capping, a missing `updatedAt`,
  history endpoint authorization) are tabulated in that document's
  section 19.

### 11.3 Non-Functional Requirements Not Fully Demonstrated

The following `NON_FUNCTIONAL_REQUIREMENTS.md` items are implemented in
code where applicable but their stated verification has not been carried
out at this scope:

- `NFR-PERF-001` to `NFR-PERF-005` — no API, database, or frontend latency
  measurements were taken; the only benchmark performed is the map-library
  selection in `geo-map-benchmark/`.
- `NFR-SCAL-002`, `NFR-REL-004` — the "representative extension" and
  failure-injection verifications were not exercised.
- `NFR-TEST-005` — coverage is measured for the backend only (`go test
  -cover` in CI); frontend coverage reporting is not configured.
- `NFR-FE-005` — the layout is a fixed-width list beside the map, sized for
  desktop viewports; the narrow-viewport behaviour described in
  `docs/06_frontend/FRONTEND_UI_UX.md` section 9 is not implemented.
- `NFR-SEC-005` — no TLS termination is provisioned; the system is not
  exposed beyond a local environment (see `docs/11_devops/DEPLOYMENT.md`).
- `NFR-QUAL-003` — static analysis is `go vet` and ESLint; the SonarQube
  scripts exist but no Sonar server is provisioned.
- `NFR-API-004` — no dedicated contract-compatibility tests beyond the
  `tests/integration/` suite.

### 11.4 Verification Gaps

The Playwright end-to-end suite under `tests/e2e/` exists and is run
locally against the composed stack; it is not a CI stage. The API
integration suite under `tests/integration/` runs in CI against a live
backend and PostGIS service container.

### 11.5 Addition Beyond the Documented Scope

A read-only BMKG GeoHotspot situational-awareness overlay (`GET
/api/v1/hotspots`, a toggleable map layer) was added during implementation.
It is not part of sections 3 or 5, does not alter the `Resource` domain
model, and stores nothing; it is recorded here so that the implemented
system and this scope document do not silently diverge.
