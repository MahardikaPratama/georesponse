/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests Service's Authenticate and AssignUserRoles use cases

	against hand-written fakes, covering BR-024 (invalid credentials
	must not establish an authenticated context) and BR-028
	(authorization changes must be auditable).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package auth

import (
	"context"
	"errors"
	"testing"

	"golang.org/x/crypto/bcrypt"

	"github.com/mahardika-pratama/georesponse-be/internal/audit"
)

type fakeRepository struct {
	users       map[string]User
	credentials map[string]Credentials
	setRolesErr error
}

func newFakeRepository() *fakeRepository {
	return &fakeRepository{users: map[string]User{}, credentials: map[string]Credentials{}}
}

func (f *fakeRepository) GetByID(ctx context.Context, id string) (*User, error) {
	u, ok := f.users[id]
	if !ok {
		return nil, ErrNotFound
	}
	cp := u
	return &cp, nil
}

func (f *fakeRepository) FindCredentialsByIdentifier(ctx context.Context, identifier string) (*Credentials, error) {
	c, ok := f.credentials[identifier]
	if !ok {
		return nil, ErrNotFound
	}
	cp := c
	return &cp, nil
}

func (f *fakeRepository) SetRoles(ctx context.Context, userID string, roleNames []string) error {
	if f.setRolesErr != nil {
		return f.setRolesErr
	}
	u := f.users[userID]
	u.RoleNames = roleNames
	f.users[userID] = u
	return nil
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

type fakeTokenSigner struct {
	signCalls int
}

func (f *fakeTokenSigner) Sign(userID string) (string, error) {
	f.signCalls++
	return "token-for-" + userID, nil
}

func (f *fakeTokenSigner) Verify(token string) (string, error) {
	return "", ErrInvalidToken
}

type fakePermissionChecker struct {
	denyErr error
}

func (f *fakePermissionChecker) Require(ctx context.Context, roleNames []string, permissionCode string) error {
	return f.denyErr
}

func hashPassword(t *testing.T, password string) string {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("bcrypt.GenerateFromPassword() = %v, want nil", err)
	}
	return string(hash)
}

func TestService_Authenticate_Success(t *testing.T) {
	repo := newFakeRepository()
	repo.users["user-001"] = User{ID: "user-001", Name: "Test Operator", RoleNames: []string{"operator"}}
	repo.credentials["user-001"] = Credentials{UserID: "user-001", PasswordHash: hashPassword(t, "correct-password")}
	tokens := &fakeTokenSigner{}
	svc := NewService(repo, &fakeAuditRepository{}, tokens, &fakePermissionChecker{})

	user, token, err := svc.Authenticate(context.Background(), "user-001", "correct-password")
	if err != nil {
		t.Fatalf("Authenticate() = %v, want nil", err)
	}
	if user.ID != "user-001" {
		t.Fatalf("User.ID = %q, want user-001", user.ID)
	}
	if token == "" {
		t.Fatal("token is empty, want a signed token")
	}
	if tokens.signCalls != 1 {
		t.Fatalf("Sign called %d times, want 1", tokens.signCalls)
	}
}

func TestService_Authenticate_WrongPassword(t *testing.T) {
	repo := newFakeRepository()
	repo.users["user-001"] = User{ID: "user-001", Name: "Test Operator"}
	repo.credentials["user-001"] = Credentials{UserID: "user-001", PasswordHash: hashPassword(t, "correct-password")}
	tokens := &fakeTokenSigner{}
	svc := NewService(repo, &fakeAuditRepository{}, tokens, &fakePermissionChecker{})

	_, _, err := svc.Authenticate(context.Background(), "user-001", "wrong-password")
	if !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("Authenticate() = %v, want ErrInvalidCredentials (BR-024)", err)
	}
	if tokens.signCalls != 0 {
		t.Fatalf("Sign called %d times, want 0 (a failed authentication must not establish a context)", tokens.signCalls)
	}
}

func TestService_Authenticate_UnknownIdentifier(t *testing.T) {
	repo := newFakeRepository()
	tokens := &fakeTokenSigner{}
	svc := NewService(repo, &fakeAuditRepository{}, tokens, &fakePermissionChecker{})

	_, _, err := svc.Authenticate(context.Background(), "no-such-user", "anything")
	if !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("Authenticate() = %v, want ErrInvalidCredentials (not ErrNotFound, so callers cannot enumerate identifiers)", err)
	}
}

func TestService_AssignUserRoles_RecordsAudit(t *testing.T) {
	repo := newFakeRepository()
	repo.users["user-001"] = User{ID: "user-001", Name: "Test Operator"}
	auditRepo := &fakeAuditRepository{}
	svc := NewService(repo, auditRepo, &fakeTokenSigner{}, &fakePermissionChecker{})

	if err := svc.AssignUserRoles(context.Background(), "admin-001", []string{"admin"}, "user-001", []string{"operator"}); err != nil {
		t.Fatalf("AssignUserRoles() = %v, want nil", err)
	}

	if repo.users["user-001"].RoleNames[0] != "operator" {
		t.Fatalf("RoleNames = %v, want [operator]", repo.users["user-001"].RoleNames)
	}
	if len(auditRepo.records) != 1 || auditRepo.records[0].Operation != audit.OperationRoleChanged {
		t.Fatalf("audit records = %+v, want one ROLE_CHANGED entry (BR-028)", auditRepo.records)
	}
	if auditRepo.records[0].UserID == nil || *auditRepo.records[0].UserID != "admin-001" {
		t.Fatalf("audit record UserID = %v, want admin-001", auditRepo.records[0].UserID)
	}
}

func TestService_AssignUserRoles_PermissionDenied_NoPersistence(t *testing.T) {
	repo := newFakeRepository()
	repo.users["user-001"] = User{ID: "user-001", Name: "Test Operator"}
	auditRepo := &fakeAuditRepository{}
	denyErr := errors.New("permission denied (test double)")
	svc := NewService(repo, auditRepo, &fakeTokenSigner{}, &fakePermissionChecker{denyErr: denyErr})

	err := svc.AssignUserRoles(context.Background(), "user-001", []string{"operator"}, "user-001", []string{"administrator"})
	if !errors.Is(err, denyErr) {
		t.Fatalf("AssignUserRoles() = %v, want the checker's denial error", err)
	}
	if repo.users["user-001"].RoleNames != nil {
		t.Fatalf("RoleNames = %v, want unchanged (nil) when permission is denied", repo.users["user-001"].RoleNames)
	}
	if len(auditRepo.records) != 0 {
		t.Fatalf("audit records = %+v, want none", auditRepo.records)
	}
}

func TestService_AssignUserRoles_Failure_NoAudit(t *testing.T) {
	repo := newFakeRepository()
	repo.setRolesErr = ErrNotFound
	auditRepo := &fakeAuditRepository{}
	svc := NewService(repo, auditRepo, &fakeTokenSigner{}, &fakePermissionChecker{})

	err := svc.AssignUserRoles(context.Background(), "admin-001", []string{"admin"}, "does-not-exist", []string{"operator"})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("AssignUserRoles() = %v, want ErrNotFound", err)
	}
	if len(auditRepo.records) != 0 {
		t.Fatalf("audit records = %+v, want none when the underlying change failed (BR-030)", auditRepo.records)
	}
}
