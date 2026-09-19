# Business Rules

## 1. Purpose

This document defines the business rules that govern how GeoResponse manages
resources, resource status, geographic location, authentication,
authorization, resource history, and auditability.

Business rules represent constraints and invariants that must remain valid
regardless of how the system is implemented.

These rules are used as a reference for:

- domain behavior;
- functional requirements;
- backend validation;
- API behavior;
- data integrity;
- authorization;
- resource history; and
- automated testing.

Business rules must not depend on a specific frontend, backend framework,
database technology, or deployment environment.

---

# 2. Resource Rules

## BR-001 — Resource Must Have a Unique Identity

Every resource must have a unique identifier within GeoResponse.

Two active resource records must not share the same identifier.

The identifier must remain associated with the same resource throughout its
lifecycle.

---

## BR-002 — Resource Must Have a Name

Every resource must have a name that allows users to identify the resource
in resource lists and detail views.

The name must satisfy the validation requirements defined by the system.

---

## BR-003 — Resource Must Have a Valid Type

Every resource must have a valid resource type.

The MVP supports the following resource types:

- `VEHICLE`
- `FACILITY`
- `EQUIPMENT`
- `IOT_DEVICE`

A resource cannot be persisted with an undefined resource type.

---

## BR-004 — Resource Type Determines Applicable Attributes

A resource may contain attributes that are specific to its resource type.

Type-specific attributes must be validated according to the rules applicable
to that resource type.

The addition of a new resource type must not invalidate the fundamental
resource model.

---

# 3. Resource Status Rules

## BR-005 — Resource Must Have a Status

Every resource must have a current operational status.

A resource cannot be persisted without a valid status.

---

## BR-006 — Resource Status Must Use a Defined Value

The current domain model defines the following resource statuses:

- `AVAILABLE`
- `IN_USE`
- `MAINTENANCE`
- `UNAVAILABLE`

A resource must not contain an undefined status value.

---

## BR-007 — Status Change Must Preserve Resource Identity

Changing a resource's status must not create a new resource.

The resource identifier remains unchanged after a status change.

---

## BR-008 — Status Change Must Be Recorded

Every successful resource status change must produce a corresponding status
history record.

The history must preserve sufficient information to determine:

- the previous status;
- the new status;
- when the change occurred; and
- the user responsible for the change, when user identity is available.

---

# 4. Geographic Location Rules

## BR-009 — Resource Must Have a Geographic Location

Every resource must have a geographic location.

A resource cannot be created or persisted without a valid geographic
location.

---

## BR-010 — Geographic Location Must Contain Valid Coordinates

A resource location must be represented using valid geographic coordinates.

The system must reject invalid geographic coordinates.

At minimum, the coordinate values must satisfy the valid geographic ranges
defined by the application.

---

## BR-011 — Location Represents the Current Managed Position

The resource location represents the current geographic position known and
managed by GeoResponse.

The MVP does not interpret this location as a continuous real-time tracking
stream.

---

## BR-012 — Location Change Must Preserve Resource Identity

Changing a resource's location must update the existing resource.

A location change must not create a new resource.

---

## BR-013 — Location Change Must Be User-Initiated

A resource relocation must result from an explicitly initiated operation by
an authorized user or supported application workflow.

The system must not automatically determine or execute a travel route.

---

## BR-014 — Location Change Must Be Recorded

Every successful resource relocation must produce a location history record.

The history must preserve sufficient information to determine:

- the previous location;
- the new location;
- when the change occurred; and
- the user responsible for the change, when user identity is available.

---

# 5. Resource Modification Rules

## BR-015 — Resource Updates Must Preserve Identity

Updating resource attributes must not change the resource's identity.

The resource remains the same domain entity after the update.

---

## BR-016 — Resource Updates Must Be Validated

Resource information must be validated before it is persisted.

Invalid resource information must not result in an invalid persisted state.

---

## BR-017 — Successful Resource Changes Must Be Recorded

Relevant changes to a resource must produce a corresponding resource change
history record.

The history must allow the system to determine what information changed and
when the change occurred.

---

## BR-018 — Failed Operations Must Not Be Reported as Successful

An operation must only be reported as successful when the corresponding
state change has been successfully completed and persisted.

A validation, persistence, or authorization failure must not result in a
success response for the intended operation.

---

# 6. Resource Deletion Rules

## BR-019 — Only Existing Resources Can Be Deleted

A resource can only be deleted if the resource exists at the time of the
operation.

---

## BR-020 — Resource Deletion Requires Authorization

Deleting a resource requires an authenticated user with the required
permission.

---

## BR-021 — Resource Deletion Must Be Auditable

A successful resource deletion must produce an audit record.

The audit record should preserve sufficient information to establish:

- which resource was deleted;
- who performed the deletion;
- when the deletion occurred; and
- what operation was performed.

---

# 7. Authentication Rules

## BR-022 — Protected Operations Require Authentication

Users must be authenticated before accessing functionality that requires
authentication.

Unauthenticated users must not be permitted to perform protected
operations.

---

## BR-023 — Authentication Must Establish User Identity

A successful authentication operation must establish the identity of the
authenticated user.

The authenticated identity is used as the basis for authorization and
auditability.

---

## BR-024 — Invalid Authentication Must Be Rejected

Invalid authentication credentials must not establish an authenticated
session or equivalent authenticated context.

---

# 8. Authorization Rules

## BR-025 — Authorization Is Role-Based

Access to protected operations is determined through roles and permissions.

A user's role determines which permissions may be assigned to or exercised
by that user.

---

## BR-026 — Permission Must Be Enforced by the System

Authorization must be enforced by the system.

The frontend user interface must not be considered the authoritative
mechanism for enforcing permissions.

---

## BR-027 — Unauthorized Operations Must Be Rejected

A user without the required permission must not be allowed to perform the
corresponding protected operation.

This applies regardless of whether the operation is initiated through the
user interface or another API client.

---

## BR-028 — Authorization Changes Must Be Auditable

Changes to roles or permissions must produce an audit record.

The audit record should identify:

- the operation performed;
- the affected user, role, or permission;
- the authenticated user who performed the operation; and
- when the change occurred.

---

# 9. Resource History Rules

## BR-029 — Resource History Belongs to a Resource

A resource history record must be associated with the resource to which the
record belongs.

History must not be detached from its corresponding resource.

---

## BR-030 — History Must Represent Completed Changes

A history record must only represent a change that has been successfully
completed.

Failed or rejected operations must not be recorded as successful state
changes.

---

## BR-031 — Status History Must Represent Status Changes

A status history record represents a successful transition from a previous
resource status to a new resource status.

It must not represent an unrelated resource modification.

---

## BR-032 — Location History Must Represent Location Changes

A location history record represents a successful change from a previous
resource location to a new resource location.

It must not be used to represent continuous location tracking.

---

## BR-033 — Resource Change History Must Represent Relevant Changes

Resource change history records relevant modifications to resource
information.

The record must provide enough information to determine what changed and
when the change occurred.

---

## BR-034 — History Must Not Replace Current Resource State

Historical records describe previous states or changes.

The current resource record remains the authoritative representation of the
resource's current state.

---

# 10. Audit Trail Rules

## BR-035 — Relevant Operations Must Be Auditable

Operations that affect protected system state must be recorded in the audit
trail.

This includes, where applicable:

- resource creation;
- resource updates;
- status changes;
- resource relocation;
- resource deletion;
- role changes; and
- permission changes.

---

## BR-036 — Audit Records Must Identify the Operation

An audit record must identify the operation that occurred.

---

## BR-037 — Audit Records Must Contain a Timestamp

An audit record must contain the time at which the audited operation
occurred.

---

## BR-038 — Audit Records Should Identify the Actor

Where an operation is performed by an authenticated user, the audit record
should identify the user responsible for the operation.

---

## BR-039 — Audit Records Must Not Misrepresent Failed Operations

An audit record must distinguish between an attempted operation and a
successfully completed state-changing operation where the system records
both.

A failed operation must not be represented as a successful state change.

---

# 11. Data Consistency Rules

## BR-040 — Current State Must Be Consistent With Successful Changes

After a successful state-changing operation, the current resource state must
reflect the resulting change.

For example:

- after a status change, the current status reflects the new status;
- after a relocation, the current location reflects the new location; and
- after an attribute update, the current resource information reflects the
  updated values.

---

## BR-041 — History Must Be Consistent With Current State

The latest successful historical state change must be consistent with the
current resource state when the corresponding history type applies.

For example, the latest successful location change should correspond to the
resource's current location.

---

## BR-042 — Validation Must Precede Persistence

Resource data must pass the applicable validation rules before it becomes
persistent application state.

---

# 12. Resource Discovery Rules

## BR-043 — Search Must Operate on Available Resource Information

Search results must be derived from resource information supported by the
application.

Search must not invent or infer resource information that is not stored or
otherwise provided to the system.

---

## BR-044 — Filters Must Reflect Resource State

Resource filters must operate on valid resource attributes or state.

At minimum, filtering supports:

- resource type; and
- resource status.

---

## BR-045 — Combined Filters Must Narrow the Result Set

When multiple compatible filters are applied, the resulting resource set
must satisfy all selected filter conditions.

---

# 13. Geographic Visualization Rules

## BR-046 — Map Representation Must Use Resource Location

A resource displayed on the map must be positioned using its current valid
geographic location.

---

## BR-047 — Invalid Locations Must Not Produce Invalid Map Positions

A resource with invalid geographic coordinates must not be rendered at an
invalid geographic position.

Invalid location data must be rejected during validation or handled as an
error according to the application's data integrity rules.

---

# 14. Business Rule Precedence

When multiple business rules apply to the same operation, the following
principles apply:

1. Data validity must be established before persistence.
2. Authorization must be established before protected state-changing
   operations.
3. The current resource state must remain consistent with successful
   operations.
4. Historical records must represent completed changes accurately.
5. Audit records must provide traceability for relevant operations.

Business rules must remain independent of implementation details.

---

# 15. Rule Maintenance

Business rules are derived from:

- product scope;
- domain model;
- approved requirements; and
- confirmed business decisions.

When a business rule changes:

1. identify the affected rule;
2. update the relevant source document;
3. update this document;
4. review affected use cases and requirements;
5. update automated tests that verify the rule; and
6. only then implement the changed behavior.

AI Agents must not invent business rules when the required behavior is not
defined by the project's authoritative documentation.
