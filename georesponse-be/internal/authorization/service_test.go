/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests Service's role/permission management use cases and

	the Require guard, against hand-written fakes, covering BR-026/
	BR-027 (permission enforcement) and BR-028 (authorization changes
	must be auditable).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package authorization

import (
	"context"
	"errors"
	"testing"

	"github.com/mahardika-pratama/georesponse-be/internal/audit"
)

type fakeRoleRepository struct {
	roles map[string]Role

	createErr, updateErr, deleteErr, setPermissionsErr error
	createCalls, setPermissionsCalls                   int
}

func newFakeRoleRepository() *fakeRoleRepository {
	return &fakeRoleRepository{roles: map[string]Role{}}
}

func (f *fakeRoleRepository) List(ctx context.Context) ([]Role, error) {
	var out []Role
	for _, r := range f.roles {
		out = append(out, r)
	}
	return out, nil
}

func (f *fakeRoleRepository) GetByID(ctx context.Context, id string) (*Role, error) {
	r, ok := f.roles[id]
	if !ok {
		return nil, ErrNotFound
	}
	cp := r
	return &cp, nil
}

func (f *fakeRoleRepository) Create(ctx context.Context, r Role) error {
	f.createCalls++
	if f.createErr != nil {
		return f.createErr
	}
	f.roles[r.ID] = r
	return nil
}

func (f *fakeRoleRepository) Update(ctx context.Context, r Role) error {
	if f.updateErr != nil {
		return f.updateErr
	}
	f.roles[r.ID] = r
	return nil
}

func (f *fakeRoleRepository) Delete(ctx context.Context, id string) error {
	if f.deleteErr != nil {
		return f.deleteErr
	}
	delete(f.roles, id)
	return nil
}

func (f *fakeRoleRepository) SetPermissions(ctx context.Context, roleID string, permissionCodes []string) error {
	f.setPermissionsCalls++
	if f.setPermissionsErr != nil {
		return f.setPermissionsErr
	}
	r := f.roles[roleID]
	r.Permissions = permissionCodes
	f.roles[roleID] = r
	return nil
}

type fakePermissionRepository struct {
	permissions []Permission
}

func (f *fakePermissionRepository) List(ctx context.Context) ([]Permission, error) {
	return f.permissions, nil
}

type fakeAuditRepository struct {
	records []audit.AuditRecord
}

func (f *fakeAuditRepository) Insert(ctx context.Context, r audit.AuditRecord) error {
	f.records = append(f.records, r)
	return nil
}

func (f *fakeAuditRepository) List(ctx context.Context, filters audit.Filters) ([]audit.AuditRecord, int, error) {
	return f.records, len(f.records), nil
}

func TestService_Require_GrantsAndDenies(t *testing.T) {
	roles := newFakeRoleRepository()
	roles.roles["role-operator"] = Role{ID: "role-operator", Name: "operator", Permissions: []string{"resource.read", "resource.update"}}
	svc := NewService(roles, &fakePermissionRepository{}, &fakeAuditRepository{})

	if err := svc.Require(context.Background(), []string{"operator"}, "resource.read"); err != nil {
		t.Fatalf("Require(operator, resource.read) = %v, want nil", err)
	}

	err := svc.Require(context.Background(), []string{"operator"}, "resource.delete")
	if !errors.Is(err, ErrPermissionDenied) {
		t.Fatalf("Require(operator, resource.delete) = %v, want ErrPermissionDenied (BR-026, BR-027)", err)
	}

	err = svc.Require(context.Background(), nil, "resource.read")
	if !errors.Is(err, ErrPermissionDenied) {
		t.Fatalf("Require(no roles, resource.read) = %v, want ErrPermissionDenied", err)
	}
}

func TestService_CreateRole_PermissionDenied_NoPersistence(t *testing.T) {
	roles := newFakeRoleRepository()
	svc := NewService(roles, &fakePermissionRepository{}, &fakeAuditRepository{})

	// No roles held at all -> Require fails before Create is ever called.
	_, err := svc.CreateRole(context.Background(), "user-001", nil, Role{ID: "role-x", Name: "x"})
	if !errors.Is(err, ErrPermissionDenied) {
		t.Fatalf("CreateRole() = %v, want ErrPermissionDenied", err)
	}
	if roles.createCalls != 0 {
		t.Fatalf("Create called %d times, want 0 (BR-018/BR-042)", roles.createCalls)
	}
}

func TestService_CreateRole_RecordsAudit(t *testing.T) {
	roles := newFakeRoleRepository()
	roles.roles["role-admin"] = Role{ID: "role-admin", Name: "admin", Permissions: []string{PermissionRoleManage}}
	auditRepo := &fakeAuditRepository{}
	svc := NewService(roles, &fakePermissionRepository{}, auditRepo)

	created, err := svc.CreateRole(context.Background(), "admin-001", []string{"admin"}, Role{ID: "role-x", Name: "x"})
	if err != nil {
		t.Fatalf("CreateRole() = %v, want nil", err)
	}
	if created.ID != "role-x" {
		t.Fatalf("created.ID = %q, want role-x", created.ID)
	}
	if len(auditRepo.records) != 1 || auditRepo.records[0].Operation != audit.OperationRoleChanged {
		t.Fatalf("audit records = %+v, want one ROLE_CHANGED entry (BR-028)", auditRepo.records)
	}
}

func TestService_AssignRolePermissions_RecordsAudit(t *testing.T) {
	roles := newFakeRoleRepository()
	roles.roles["role-admin"] = Role{ID: "role-admin", Name: "admin", Permissions: []string{PermissionRoleManage}}
	roles.roles["role-operator"] = Role{ID: "role-operator", Name: "operator"}
	auditRepo := &fakeAuditRepository{}
	svc := NewService(roles, &fakePermissionRepository{}, auditRepo)

	err := svc.AssignRolePermissions(context.Background(), "admin-001", []string{"admin"}, "role-operator", []string{"resource.read"})
	if err != nil {
		t.Fatalf("AssignRolePermissions() = %v, want nil", err)
	}
	if roles.setPermissionsCalls != 1 {
		t.Fatalf("SetPermissions called %d times, want 1", roles.setPermissionsCalls)
	}
	if len(auditRepo.records) != 1 || auditRepo.records[0].Operation != audit.OperationPermissionChanged {
		t.Fatalf("audit records = %+v, want one PERMISSION_CHANGED entry (BR-028)", auditRepo.records)
	}
}

func TestService_AssignRolePermissions_PermissionDenied_NoPersistence(t *testing.T) {
	roles := newFakeRoleRepository()
	roles.roles["role-operator"] = Role{ID: "role-operator", Name: "operator"}
	svc := NewService(roles, &fakePermissionRepository{}, &fakeAuditRepository{})

	err := svc.AssignRolePermissions(context.Background(), "user-001", []string{"operator"}, "role-operator", []string{"resource.delete"})
	if !errors.Is(err, ErrPermissionDenied) {
		t.Fatalf("AssignRolePermissions() = %v, want ErrPermissionDenied", err)
	}
	if roles.setPermissionsCalls != 0 {
		t.Fatalf("SetPermissions called %d times, want 0", roles.setPermissionsCalls)
	}
}
