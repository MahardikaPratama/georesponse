# Use Cases

## 1. Purpose

This document defines the primary use cases of GeoResponse from the
perspective of its users: what they need to accomplish, the preconditions,
the main and alternative flows, and the expected outcomes. It describes user
and business behavior only, not API endpoints, database design, components,
or deployment.

The implementation status of each use case at submission, including the
partially implemented ones, is recorded in `SCOPE.md` section 11. Changes to
the use cases follow `SCOPE.md` section 10.

---

## 2. Actors

### 2.1 Operator

An **Operator** manages resource information in GeoResponse. The Operator
can:

- view resources
- search and filter resources
- view resource details
- create resources
- update resource information
- change resource status
- relocate resources
- delete resources

### 2.2 Response Coordinator

A **Response Coordinator** uses GeoResponse to understand the current
distribution and condition of available resources. The Response Coordinator
can:

- view resources
- search and filter resources
- view resource details
- view resources on the map

The Response Coordinator does not manage resource records in the current
scope.

---

## 3. Use Case Overview

| ID | Use Case | Primary Actor |
|---|---|---|
| UC-01 | View Resources | Operator, Response Coordinator |
| UC-02 | View Resource Details | Operator, Response Coordinator |
| UC-03 | Search Resources | Operator, Response Coordinator |
| UC-04 | Filter Resources | Operator, Response Coordinator |
| UC-05 | View Resources on Map | Operator, Response Coordinator |
| UC-06 | Create Resource | Operator |
| UC-07 | Update Resource | Operator |
| UC-08 | Change Resource Status | Operator |
| UC-09 | Relocate Resource | Operator |
| UC-10 | Delete Resource | Operator |
| UC-11 | Authenticate User | User |
| UC-12 | Manage Roles and Permissions | Authorized Administrator |
| UC-13 | View Resource History | Operator, Response Coordinator |
| UC-14 | View Audit Trail | Authorized User |

---

## 4. Detailed Use Cases

## UC-01: View Resources

### Goal

Allow users to view the resources currently managed by GeoResponse.

### Actors

- Operator
- Response Coordinator

### Preconditions

- The system is available.
- Resource data can be retrieved.

### Main Flow

1. The user opens the resource management view.
2. The system retrieves available resources.
3. The system displays the resources.
4. Each resource shows enough information to identify its type, status, and
   location.

### Expected Result

The user can view the current resources managed by the system.

### Alternative Flows

- If no resources exist, the system displays an appropriate empty state.
- If resource retrieval fails, the system displays an appropriate error
  state.

---

## UC-02: View Resource Details

### Goal

Allow users to inspect the complete information of a specific resource.

### Actors

- Operator
- Response Coordinator

### Preconditions

- The requested resource exists.
- The user can access resource information.

### Main Flow

1. The user selects a resource.
2. The system retrieves the resource information.
3. The system displays the resource identity, type, attributes, status, and
   geographic location.

### Expected Result

The user can understand the selected resource and its current state.

### Alternative Flows

- If the resource no longer exists, the system informs the user that the
  resource cannot be found.
- If resource retrieval fails, the system displays an appropriate error
  state.

---

## UC-03: Search Resources

### Goal

Allow users to find resources using identifying information.

### Actors

- Operator
- Response Coordinator

### Preconditions

- The resource view is available.

### Main Flow

1. The user enters a search term.
2. The system evaluates the search term against supported resource
   information.
3. The system displays matching resources.

### Expected Result

The user can locate resources without manually inspecting the complete
resource list.

### Alternative Flows

- If no resources match the search term, the system displays an appropriate
  empty state.
- If the search term is empty, the system displays the available resources
  without applying the search criterion.

---

## UC-04: Filter Resources

### Goal

Allow users to narrow the resource list using resource criteria.

### Actors

- Operator
- Response Coordinator

### Preconditions

- The resource view is available.

### Main Flow

1. The user selects one or more filter criteria.
2. The system applies the selected criteria.
3. The system displays resources matching the criteria.

### Supported Filter Criteria

The current scope supports filtering by resource type and resource status.
Additional criteria may be introduced through future scope changes.

### Expected Result

The user can focus on resources relevant to the selected criteria.

### Alternative Flows

- If no resources match the selected criteria, the system displays an
  appropriate empty state.
- If filters are cleared, the system displays the unfiltered resource set.

---

## UC-05: View Resources on Map

### Goal

Allow users to understand the geographic distribution of resources.

### Actors

- Operator
- Response Coordinator

### Preconditions

- Resources exist.
- Each resource has a valid geographic location.

### Main Flow

1. The user opens the map view.
2. The system retrieves resources and their geographic locations.
3. The system displays the resources on a geographic map.
4. The user can identify the location of individual resources.
5. The user can select a resource to inspect its information.

### Expected Result

The user can understand where resources are geographically located.

### Alternative Flows

- If no resources exist, the map displays an appropriate empty state.
- If a resource cannot be displayed because its location is invalid, the
  system must not display an invalid geographic position and must report
  the data problem appropriately.

### Boundary

This use case provides geographic visualization only. It does not provide
route planning, navigation, travel tracking, or automated dispatch.

---

## UC-06: Create Resource

### Goal

Allow an Operator to add a new resource to GeoResponse.

### Actor

- Operator

### Preconditions

- The system is available.
- The Operator has access to resource management.

### Main Flow

1. The Operator opens the create resource form.
2. The Operator enters the required resource information.
3. The system validates the submitted information.
4. The system creates the resource.
5. The system persists the resource.
6. The system records the creation operation in the audit trail.
7. The system confirms successful creation.
8. The new resource becomes available in resource views and on the map.

### Required Information

A resource must contain a unique identity, resource type, required
attributes, resource status, and geographic location.

### Expected Result

A valid resource is created and becomes available for subsequent
management.

### Alternative Flows

- If required information is missing, the system rejects the submission and
  identifies the invalid fields.
- If the geographic coordinates are invalid, the system rejects the
  submission.
- If the resource identity conflicts with an existing resource, the system
  rejects the submission.
- If persistence fails, the resource must not be presented as successfully
  created.

---

## UC-07: Update Resource

### Goal

Allow an Operator to update information belonging to an existing resource.

### Actor

- Operator

### Preconditions

- The resource exists.
- The Operator has access to resource management.

### Main Flow

1. The Operator selects an existing resource.
2. The Operator modifies editable resource information.
3. The system validates the updated information.
4. The system persists the changes.
5. The system records the relevant change in resource history and the audit
   trail.
6. The system confirms the update.
7. Updated information is reflected in relevant resource views.

### Expected Result

The selected resource contains the newly submitted valid information, and
the change is preserved in resource history and audit records.

### Alternative Flows

- If the resource no longer exists, the system reports that the resource
  cannot be found.
- If submitted information is invalid, the system rejects the update.
- If persistence fails, the system must not report the update as
  successful.

### Boundary

A location change performed as a relocation is handled by **UC-09: Relocate
Resource**.

---

## UC-08: Change Resource Status

### Goal

Allow an Operator to change the operational status of an existing resource.

### Actor

- Operator

### Preconditions

- The resource exists.
- The Operator has access to resource management.

### Main Flow

1. The Operator selects an existing resource.
2. The Operator selects a new valid status.
3. The system validates the status.
4. The system persists the status change.
5. The system records the status change in status history and the audit
   trail.
6. The system confirms the update.
7. The updated status is reflected in resource views.

### Valid Resource Statuses

`AVAILABLE`, `IN_USE`, `MAINTENANCE`, and `UNAVAILABLE` (see
`DOMAIN_MODEL.md` section 7).

### Expected Result

The resource has the newly selected valid status, and the status change is
preserved in status history and audit records.

### Alternative Flows

- If the resource does not exist, the system reports that the resource
  cannot be found.
- If the selected status is invalid, the system rejects the change.
- If persistence fails, the system must not report the status change as
  successful.

### Boundary

Changing status does not automatically change the resource location.

---

## UC-09: Relocate Resource

### Goal

Allow an Operator to update the geographic location of an existing resource.

### Actor

- Operator

### Preconditions

- The resource exists.
- The Operator has access to resource management.
- The destination geographic coordinates are valid.

### Main Flow

1. The Operator selects an existing resource.
2. The Operator provides a destination geographic location.
3. The system validates the destination coordinates.
4. The system updates the resource location.
5. The system persists the updated location.
6. The system records the location change in location history and the
   audit trail.
7. The system confirms the relocation.
8. The updated location is reflected in the resource details and map view.

### Expected Result

The resource is associated with the new geographic location, and the
relocation is preserved in location history and audit records.

### Invariants

Relocation:

- does not create a new resource
- does not change the resource identity
- does not change the resource type
- does not automatically change the resource status

### Alternative Flows

- If the resource does not exist, the system reports that the resource
  cannot be found.
- If the destination coordinates are invalid, the system rejects the
  relocation.
- If persistence fails, the system must not report the relocation as
  successful.

### Boundary

This use case does not include route planning, navigation, travel tracking,
automated dispatch, or continuous GPS tracking.

---

## UC-10: Delete Resource

### Goal

Allow an Operator to remove an existing resource from the system.

### Actor

- Operator

### Preconditions

- The resource exists.
- The Operator has access to resource management.

### Main Flow

1. The Operator selects an existing resource.
2. The system requests confirmation.
3. The Operator confirms the deletion.
4. The system removes the resource.
5. The system records the deletion operation in the audit trail.
6. The system confirms successful deletion.
7. The deleted resource is no longer returned by resource queries or
   displayed on the map.

### Expected Result

The selected resource is deleted from the current resource dataset.

### Alternative Flows

- If the Operator cancels the confirmation, the resource remains unchanged.
- If the resource no longer exists, the system reports that the resource
  cannot be found.
- If deletion fails, the system must not report the deletion as successful.

### Deletion Model

The current scope permits resource deletion and does not require an archive
or deactivation workflow. The hard-delete decision is recorded in
`docs/08_database/DATABASE_ARCHITECTURE.md` section 6.4.

---

## UC-11: Authenticate User

### Goal

Allow a user to authenticate before accessing protected GeoResponse
functionality.

### Actor

- User

### Preconditions

- The user has valid credentials.
- The authentication service is available.

### Main Flow

1. The user submits authentication credentials.
2. The system validates the credentials.
3. The system establishes an authenticated session or equivalent
   authenticated context.
4. The system grants access to functionality permitted for the
   authenticated user.

### Expected Result

The user is authenticated and can access the functionality permitted by
their role and permissions.

### Alternative Flows

- If the credentials are invalid, authentication is rejected.
- If authentication cannot be completed, the system reports an appropriate
  authentication error.

### Boundary

This use case covers authentication only. It does not define a specific
identity provider or authentication technology.

---

## UC-12: Manage Roles and Permissions

### Goal

Allow an authorized user to manage role-based access and permissions.

### Actor

- Authorized Administrator

### Preconditions

- The user is authenticated.
- The user has permission to manage roles and permissions.

### Main Flow

1. The authorized user opens role and permission management.
2. The system displays available roles and permissions.
3. The user creates, updates, or assigns role and permission information as
   permitted.
4. The system validates the requested change.
5. The system persists the authorization change.
6. The system records the operation in the audit trail.

### Expected Result

The authorization configuration reflects the approved role and permission
changes.

### Alternative Flows

- If the user is not authorized, the system rejects the operation.
- If the submitted authorization data is invalid, the system rejects the
  change.
- If persistence fails, the system must not report the authorization change
  as successful.

---

## UC-13: View Resource History

### Goal

Allow users to inspect historical changes associated with a resource.

### Actors

- Operator
- Response Coordinator

### Preconditions

- The user is authenticated.
- The resource exists.
- The user has permission to view resource history.

### Main Flow

1. The user selects a resource.
2. The user opens the resource history.
3. The system retrieves historical records associated with the resource.
4. The system displays the available status history, location history, and
   resource change history.
5. The system presents historical information in a form that distinguishes
   previous state from the current resource state.

### Expected Result

The user can inspect how the selected resource changed over time.

### Alternative Flows

- If the resource does not exist, the system reports that the resource
  cannot be found.
- If no history exists, the system displays an appropriate empty state.
- If history retrieval fails, the system displays an appropriate error
  state.

### Boundary

This use case provides historical resource information. It does not provide
predictive analysis or automated recommendations.

---

## UC-14: View Audit Trail

### Goal

Allow an authorized user to inspect audit records for relevant system and
resource operations.

### Actor

- Authorized User

### Preconditions

- The user is authenticated.
- The user has permission to view audit trails.

### Main Flow

1. The authorized user opens the audit trail.
2. The system retrieves available audit records.
3. The system displays relevant audit information, such as:
   - operation
   - affected resource or entity, when applicable
   - authenticated user
   - timestamp
   - relevant change information, when available

### Expected Result

The authorized user can trace relevant operations performed within the
system.

### Alternative Flows

- If the user is not authorized, the system rejects access.
- If no audit records are available, the system displays an appropriate
  empty state.
- If audit retrieval fails, the system displays an appropriate error state.

### Boundary

The audit trail is for traceability and accountability. It is not a
general-purpose analytics or monitoring system.

---

## 5. Cross-Cutting Behavior

The following behavior applies across several use cases. The authoritative
rules are in `BUSINESS_RULES.md`.

### 5.1 Validation

The system validates resource information before creating or modifying a
resource (BR-016, BR-042). Validation covers, at minimum:

- required fields
- valid resource type (BR-003)
- valid resource status (BR-006)
- valid geographic coordinates (BR-010)
- unique resource identity (BR-001)

### 5.2 Other Cross-Cutting Rules

- Protected functionality requires authentication, and resource-management
  and administrative operations require the matching permission (BR-022,
  BR-027).
- Every resource has a valid geographic location before it is created or
  relocated (BR-009, BR-010).
- Updating attributes, status, or location preserves the resource identity
  and never creates another resource (BR-007, BR-012, BR-015).
- After a relocation, the stored location, the resource details, and the
  map all show the new coordinates (BR-040, BR-046).
- Status changes, relocations, and other relevant modifications produce the
  matching history and audit records, which stay associated with their
  resource or operation (BR-008, BR-014, BR-017, BR-029, BR-035).
- Failed validation, lookup, persistence, or deletion returns a failure
  result; an operation is reported as successful only when its state change
  has been persisted, and invalid input never results in an invalid
  persisted resource (BR-016, BR-018).

---

## 6. Use Case Relationships

The primary behavioral relationships between use cases are:

```text
                          ┌─────────────────────────┐
                          │       GeoResponse       │
                          └─────────────────────────┘
                                      │
        ┌─────────────────────────────┼──────────────────────────────┐
        │                             │                              │
        ▼                             ▼                              ▼
 Authentication &             Resource Discovery            Resource Management
 Authorization                       │                              │
        │                    ┌────────┴────────┐          ┌─────────┼─────────┐
        │                    ▼                 ▼          ▼         ▼         ▼
        ├── Authenticate   Search            Filter     Create    Update    Delete
        └── Manage Roles      │                 │                   │
            & Permissions     └────────┬────────┘                   ├── Change Status
                                       ▼                            └── Relocate
                                View Resources
                                       │
                                       ▼
                              View Resource Details
                                       │
                                       ▼
                              View Resources on Map

                         Resource History & Auditability
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                  View Resource   Status/Location  View Audit
                     History        /Change History   Trail
```

The diagram shows functional relationships, not technical dependencies
between software modules.

---

## 7. Use Case Boundaries

What the use cases cover, per concern. Everything outside this table is
excluded by `SCOPE.md` sections 4 and 7.

| Concern | Included |
|---|---|
| Resource | Create, view, update, search, filter, delete |
| Status | View, change, and inspect status history |
| Location | Store, view, update, and inspect location history |
| Relocation | Manually update resource location and preserve location history |
| History | Status, location, and resource change history |
| Audit | Trace relevant authenticated operations |
| Authentication | User authentication |
| Authorization | Roles and permissions |
| Map | Geographic visualization |
| Discovery | Search and filtering |
| Data | Validation and persistence |
| Disaster response | Resource information support |
