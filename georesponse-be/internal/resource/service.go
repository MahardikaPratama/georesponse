/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements the resource management use cases: CreateResource,

	GetResource, ListResources, UpdateResource, DeleteResource,
	ChangeResourceStatus, and RelocateResource (UC-06 through UC-10,
	UC-08, UC-09).

	HistoryRecorder and PermissionChecker are declared here, narrowly,
	rather than importing internal/resourcehistory and
	internal/authorization directly: resourcehistory already imports
	this package for the Status/Location types its history records
	carry, so this package importing resourcehistory back would be an
	import cycle. authorization.Service satisfies PermissionChecker
	structurally without this package needing to import it either,
	keeping this package easy to unit-test with fakes.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import (
	"context"
	"fmt"
	"reflect"
	"time"

	"github.com/mahardika-pratama/georesponse-be/internal/audit"
	"github.com/mahardika-pratama/georesponse-be/internal/platform/idgen"
)

// Permission codes required by this package's use cases. The exact codes
// are an implementation decision (BUSINESS_RULES.md fixes that
// authorization is role-based, BR-025, but not a concrete permission set).
const (
	PermissionResourceCreate = "resource.create"
	PermissionResourceRead   = "resource.read"
	PermissionResourceUpdate = "resource.update"
	PermissionResourceDelete = "resource.delete"
)

// FieldChange describes one field's change for a resource change-history
// record.
type FieldChange struct {
	Field  string
	Before any
	After  any
}

// HistoryRecorder records resource history. Implemented by
// resourcehistory.Service.
type HistoryRecorder interface {
	RecordStatusChange(ctx context.Context, resourceID string, previous, newStatus Status, changedBy *string) error
	RecordLocationChange(ctx context.Context, resourceID string, previous, newLocation Location, changedBy *string) error
	RecordChange(ctx context.Context, resourceID string, changes []FieldChange, changedBy *string) error
}

// PermissionChecker enforces that the caller holds a given permission.
// Implemented by authorization.Service.
type PermissionChecker interface {
	Require(ctx context.Context, roleNames []string, permissionCode string) error
}

// TxRunner runs a sequence of repository writes atomically. Implemented by
// internal/platform/transaction.Runner (declared here, narrowly, so this
// package need not import that one just to name the type it already
// structurally matches).
type TxRunner interface {
	WithinTx(ctx context.Context, fn func(ctx context.Context) error) error
}

// Service implements the resource management use cases.
type Service struct {
	repo       Repository
	history    HistoryRecorder
	audit      audit.Repository
	validators *AttributeValidatorRegistry
	checker    PermissionChecker
	tx         TxRunner
}

// NewService constructs a Service.
func NewService(
	repo Repository,
	history HistoryRecorder,
	auditRepo audit.Repository,
	validators *AttributeValidatorRegistry,
	checker PermissionChecker,
	tx TxRunner,
) *Service {
	return &Service{
		repo:       repo,
		history:    history,
		audit:      auditRepo,
		validators: validators,
		checker:    checker,
		tx:         tx,
	}
}

// CreateResource validates res, checks its id is not already in use (via
// the repository's uniqueness enforcement), persists it, and records a
// RESOURCE_CREATED audit entry (FR-001, BR-001, BR-016, BR-042, UC-06).
func (s *Service) CreateResource(ctx context.Context, actingUserID string, actingRoleNames []string, res Resource) (*Resource, error) {
	if err := s.checker.Require(ctx, actingRoleNames, PermissionResourceCreate); err != nil {
		return nil, err
	}

	if err := res.Validate(); err != nil {
		return nil, err
	}
	if err := s.validators.Validate(res.Type, res.Attributes); err != nil {
		return nil, err
	}

	err := s.tx.WithinTx(ctx, func(ctx context.Context) error {
		if err := s.repo.Create(ctx, res); err != nil {
			return err
		}
		return s.recordAudit(ctx, actingUserID, audit.OperationResourceCreated, &res.ID, nil)
	})
	if err != nil {
		return nil, fmt.Errorf("create resource %q: %w", res.ID, err)
	}

	return &res, nil
}

// GetResource returns the resource identified by id (FR-003, UC-02).
func (s *Service) GetResource(ctx context.Context, actingRoleNames []string, id string) (*Resource, error) {
	if err := s.checker.Require(ctx, actingRoleNames, PermissionResourceRead); err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, id)
}

// ListResources returns the resources matching f (FR-002, FR-016 through
// FR-019, UC-01, UC-03, UC-04).
func (s *Service) ListResources(ctx context.Context, actingRoleNames []string, f Filters) ([]Resource, int, error) {
	if err := s.checker.Require(ctx, actingRoleNames, PermissionResourceRead); err != nil {
		return nil, 0, err
	}
	return s.repo.List(ctx, f)
}

// UpdateResource replaces the identity-preserving mutable fields (name,
// type, attributes) of an existing resource, records what changed as a
// change-history entry, and records a RESOURCE_UPDATED audit entry
// (FR-004, BR-015, BR-017, UC-07). Status and location are always taken
// from the current record, never from updated: those go through
// ChangeResourceStatus and RelocateResource instead (the BR symmetry note
// in API_CONTRACT.md section 7.1/8).
func (s *Service) UpdateResource(ctx context.Context, actingUserID string, actingRoleNames []string, updated Resource) (*Resource, error) {
	if err := s.checker.Require(ctx, actingRoleNames, PermissionResourceUpdate); err != nil {
		return nil, err
	}

	current, err := s.repo.GetByID(ctx, updated.ID)
	if err != nil {
		return nil, fmt.Errorf("update resource %q: %w", updated.ID, err)
	}

	updated.Status = current.Status
	updated.Location = current.Location

	if err := updated.Validate(); err != nil {
		return nil, err
	}
	if err := s.validators.Validate(updated.Type, updated.Attributes); err != nil {
		return nil, err
	}

	changes := diffResource(*current, updated)

	err = s.tx.WithinTx(ctx, func(ctx context.Context) error {
		if err := s.repo.Update(ctx, updated); err != nil {
			return err
		}
		if len(changes) > 0 {
			if err := s.history.RecordChange(ctx, updated.ID, changes, optionalUserID(actingUserID)); err != nil {
				return err
			}
		}
		return s.recordAudit(ctx, actingUserID, audit.OperationResourceUpdated, &updated.ID, nil)
	})
	if err != nil {
		return nil, fmt.Errorf("update resource %q: %w", updated.ID, err)
	}

	return &updated, nil
}

// DeleteResource permanently removes the resource identified by id and
// records a RESOURCE_DELETED audit entry, atomically (FR-005, BR-019,
// BR-021, UC-10; DATABASE_ARCHITECTURE.md section 6.4).
//
// The audit record is written before the delete, not after: audit_records
// .resource_id has a foreign key to resources(id) (ON DELETE SET NULL), so
// inserting it after the resource row is gone would violate that
// constraint even inside the same transaction — Postgres checks a foreign
// key immediately, not at commit. Writing it first means resource_id is
// still valid at insert time; the subsequent delete then sets it to NULL
// via that same ON DELETE SET NULL, exactly as it does for any other
// audit record referencing a resource that is later deleted.
func (s *Service) DeleteResource(ctx context.Context, actingUserID string, actingRoleNames []string, id string) error {
	if err := s.checker.Require(ctx, actingRoleNames, PermissionResourceDelete); err != nil {
		return err
	}

	err := s.tx.WithinTx(ctx, func(ctx context.Context) error {
		if err := s.recordAudit(ctx, actingUserID, audit.OperationResourceDeleted, &id, nil); err != nil {
			return err
		}
		return s.repo.Delete(ctx, id)
	})
	if err != nil {
		return fmt.Errorf("delete resource %q: %w", id, err)
	}

	return nil
}

// ChangeResourceStatus updates only the status of the resource identified
// by id, records a status-history entry, and records a
// RESOURCE_STATUS_CHANGED audit entry (FR-011, FR-012, BR-006, BR-008,
// UC-08). It never modifies location (API_CONTRACT.md section 7.1).
func (s *Service) ChangeResourceStatus(ctx context.Context, actingUserID string, actingRoleNames []string, id string, status Status) (*Resource, error) {
	if err := s.checker.Require(ctx, actingRoleNames, PermissionResourceUpdate); err != nil {
		return nil, err
	}
	if !status.Valid() {
		return nil, ErrInvalidStatus
	}

	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("change status of resource %q: %w", id, err)
	}
	previousStatus := current.Status

	err = s.tx.WithinTx(ctx, func(ctx context.Context) error {
		if err := s.repo.UpdateStatus(ctx, id, status); err != nil {
			return err
		}
		if err := s.history.RecordStatusChange(ctx, id, previousStatus, status, optionalUserID(actingUserID)); err != nil {
			return err
		}
		return s.recordAudit(ctx, actingUserID, audit.OperationResourceStatusChanged, &id, map[string]any{
			"previousStatus": string(previousStatus),
			"newStatus":      string(status),
		})
	})
	if err != nil {
		return nil, fmt.Errorf("change status of resource %q: %w", id, err)
	}

	current.Status = status
	return current, nil
}

// RelocateResource updates only the location of the resource identified
// by id, records a location-history entry, and records a
// RESOURCE_RELOCATED audit entry (FR-023 through FR-026, BR-009 through
// BR-014, UC-09). It preserves id, type, and status unchanged.
func (s *Service) RelocateResource(ctx context.Context, actingUserID string, actingRoleNames []string, id string, location Location) (*Resource, error) {
	if err := s.checker.Require(ctx, actingRoleNames, PermissionResourceUpdate); err != nil {
		return nil, err
	}
	if err := location.Validate(); err != nil {
		return nil, err
	}

	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("relocate resource %q: %w", id, err)
	}
	previousLocation := current.Location

	err = s.tx.WithinTx(ctx, func(ctx context.Context) error {
		if err := s.repo.UpdateLocation(ctx, id, location); err != nil {
			return err
		}
		if err := s.history.RecordLocationChange(ctx, id, previousLocation, location, optionalUserID(actingUserID)); err != nil {
			return err
		}
		return s.recordAudit(ctx, actingUserID, audit.OperationResourceRelocated, &id, nil)
	})
	if err != nil {
		return nil, fmt.Errorf("relocate resource %q: %w", id, err)
	}

	current.Location = location
	return current, nil
}

// recordAudit writes one audit trail entry. actingUserID is omitted from
// the record when empty.
func (s *Service) recordAudit(ctx context.Context, actingUserID string, op audit.Operation, resourceID *string, details map[string]any) error {
	rec := audit.AuditRecord{
		ID:         idgen.New(),
		Operation:  op,
		ResourceID: resourceID,
		OccurredAt: time.Now().UTC(),
		Details:    details,
	}
	if actingUserID != "" {
		rec.UserID = &actingUserID
	}
	if err := s.audit.Insert(ctx, rec); err != nil {
		return fmt.Errorf("record audit %s: %w", op, err)
	}
	return nil
}

// diffResource returns the FieldChanges between before and after, covering
// only the fields UpdateResource can change (name, type, attributes).
func diffResource(before, after Resource) []FieldChange {
	var changes []FieldChange

	if before.Name != after.Name {
		changes = append(changes, FieldChange{Field: "name", Before: before.Name, After: after.Name})
	}
	if before.Type != after.Type {
		changes = append(changes, FieldChange{Field: "type", Before: string(before.Type), After: string(after.Type)})
	}
	if !reflect.DeepEqual(before.Attributes, after.Attributes) {
		changes = append(changes, FieldChange{Field: "attributes", Before: before.Attributes, After: after.Attributes})
	}

	return changes
}

// optionalUserID returns nil for an empty id, otherwise a pointer to it,
// matching the "when user identity is available" (BR-008, BR-014)
// optionality of history's ChangedBy field.
func optionalUserID(id string) *string {
	if id == "" {
		return nil
	}
	return &id
}
