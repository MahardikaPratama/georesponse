/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements the role/permission management use cases

	(UC-12: ListRoles, CreateRole, UpdateRole, DeleteRole,
	ListPermissions, AssignRolePermissions). The exact permission codes
	required by each operation (PermissionRoleRead, PermissionRoleManage,
	PermissionPermissionRead) are an implementation decision:
	BUSINESS_RULES.md fixes that authorization is role-based (BR-025)
	but not the concrete permission set.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package authorization

import (
	"context"
	"fmt"
	"time"

	"github.com/mahardika-pratama/georesponse-be/internal/audit"
	"github.com/mahardika-pratama/georesponse-be/internal/platform/idgen"
)

// Permission codes required by this package's own use cases.
const (
	PermissionRoleRead       = "role.read"
	PermissionRoleManage     = "role.manage"
	PermissionPermissionRead = "permission.read"
)

// Service implements the role/permission management use cases.
type Service struct {
	roles       RoleRepository
	permissions PermissionRepository
	audit       audit.Repository
}

// NewService constructs a Service.
func NewService(roles RoleRepository, permissions PermissionRepository, auditRepo audit.Repository) *Service {
	return &Service{roles: roles, permissions: permissions, audit: auditRepo}
}

// ListRoles returns every role, restricted to callers holding
// PermissionRoleRead (FR-031, FR-032).
func (s *Service) ListRoles(ctx context.Context, actingRoleNames []string) ([]Role, error) {
	if err := s.Require(ctx, actingRoleNames, PermissionRoleRead); err != nil {
		return nil, err
	}
	return s.roles.List(ctx)
}

// CreateRole persists a new role, restricted to callers holding
// PermissionRoleManage, and records a ROLE_CHANGED audit entry (FR-033,
// BR-028). If role.ID is empty, one is generated.
func (s *Service) CreateRole(ctx context.Context, actingUserID string, actingRoleNames []string, role Role) (*Role, error) {
	if err := s.Require(ctx, actingRoleNames, PermissionRoleManage); err != nil {
		return nil, err
	}

	if role.ID == "" {
		role.ID = idgen.New()
	}

	if err := s.roles.Create(ctx, role); err != nil {
		return nil, fmt.Errorf("create role %q: %w", role.Name, err)
	}

	if err := s.recordRoleChange(ctx, actingUserID, role.ID, "role created"); err != nil {
		return nil, err
	}

	return &role, nil
}

// UpdateRole replaces the mutable fields of an existing role, restricted
// to callers holding PermissionRoleManage, and records a ROLE_CHANGED
// audit entry.
func (s *Service) UpdateRole(ctx context.Context, actingUserID string, actingRoleNames []string, role Role) error {
	if err := s.Require(ctx, actingRoleNames, PermissionRoleManage); err != nil {
		return err
	}

	if err := s.roles.Update(ctx, role); err != nil {
		return fmt.Errorf("update role %q: %w", role.ID, err)
	}

	return s.recordRoleChange(ctx, actingUserID, role.ID, "role updated")
}

// DeleteRole permanently removes a role, restricted to callers holding
// PermissionRoleManage, and records a ROLE_CHANGED audit entry.
func (s *Service) DeleteRole(ctx context.Context, actingUserID string, actingRoleNames []string, roleID string) error {
	if err := s.Require(ctx, actingRoleNames, PermissionRoleManage); err != nil {
		return err
	}

	if err := s.roles.Delete(ctx, roleID); err != nil {
		return fmt.Errorf("delete role %q: %w", roleID, err)
	}

	return s.recordRoleChange(ctx, actingUserID, roleID, "role deleted")
}

// ListPermissions returns every defined permission, restricted to callers
// holding PermissionPermissionRead.
func (s *Service) ListPermissions(ctx context.Context, actingRoleNames []string) ([]Permission, error) {
	if err := s.Require(ctx, actingRoleNames, PermissionPermissionRead); err != nil {
		return nil, err
	}
	return s.permissions.List(ctx)
}

// AssignRolePermissions replaces the full set of permissions granted by
// roleID with permissionCodes, restricted to callers holding
// PermissionRoleManage, and records a PERMISSION_CHANGED audit entry
// (FR-033, BR-028).
func (s *Service) AssignRolePermissions(ctx context.Context, actingUserID string, actingRoleNames []string, roleID string, permissionCodes []string) error {
	if err := s.Require(ctx, actingRoleNames, PermissionRoleManage); err != nil {
		return err
	}

	if err := s.roles.SetPermissions(ctx, roleID, permissionCodes); err != nil {
		return fmt.Errorf("assign permissions to role %q: %w", roleID, err)
	}

	rec := audit.AuditRecord{
		ID:         idgen.New(),
		Operation:  audit.OperationPermissionChanged,
		OccurredAt: time.Now().UTC(),
		Details:    map[string]any{"roleId": roleID, "permissions": permissionCodes},
	}
	if actingUserID != "" {
		rec.UserID = &actingUserID
	}
	if err := s.audit.Insert(ctx, rec); err != nil {
		return fmt.Errorf("assign permissions to role %q: record audit: %w", roleID, err)
	}

	return nil
}

// recordRoleChange writes a ROLE_CHANGED audit entry for a role CRUD
// operation.
func (s *Service) recordRoleChange(ctx context.Context, actingUserID, roleID, note string) error {
	rec := audit.AuditRecord{
		ID:         idgen.New(),
		Operation:  audit.OperationRoleChanged,
		OccurredAt: time.Now().UTC(),
		Details:    map[string]any{"roleId": roleID, "note": note},
	}
	if actingUserID != "" {
		rec.UserID = &actingUserID
	}
	if err := s.audit.Insert(ctx, rec); err != nil {
		return fmt.Errorf("record role change for %q: %w", roleID, err)
	}
	return nil
}
