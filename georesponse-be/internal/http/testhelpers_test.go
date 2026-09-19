/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Shared hand-written fakes for this package's httptest-based

	handler tests: fake implementations of every repository/checker
	interface the real *resource.Service, *auth.Service,
	*authorization.Service, *audit.Service, and *resourcehistory.Service
	depend on, so handler tests exercise the real service and handler
	code, with only persistence faked (matching the pattern already
	used in each feature package's own service_test.go).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package http

import (
	"context"

	"golang.org/x/crypto/bcrypt"

	"github.com/mahardika-pratama/georesponse-be/internal/audit"
	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/authorization"
	"github.com/mahardika-pratama/georesponse-be/internal/resource"
)

// --- resource.Repository ---

type fakeResourceRepository struct {
	resources map[string]resource.Resource
}

func newFakeResourceRepository() *fakeResourceRepository {
	return &fakeResourceRepository{resources: map[string]resource.Resource{}}
}

func (f *fakeResourceRepository) Create(ctx context.Context, r resource.Resource) error {
	if _, exists := f.resources[r.ID]; exists {
		return resource.ErrIDConflict
	}
	f.resources[r.ID] = r
	return nil
}

func (f *fakeResourceRepository) GetByID(ctx context.Context, id string) (*resource.Resource, error) {
	r, ok := f.resources[id]
	if !ok {
		return nil, resource.ErrNotFound
	}
	cp := r
	return &cp, nil
}

func (f *fakeResourceRepository) List(ctx context.Context, filters resource.Filters) ([]resource.Resource, int, error) {
	var out []resource.Resource
	for _, r := range f.resources {
		out = append(out, r)
	}
	return out, len(out), nil
}

func (f *fakeResourceRepository) Update(ctx context.Context, r resource.Resource) error {
	if _, ok := f.resources[r.ID]; !ok {
		return resource.ErrNotFound
	}
	f.resources[r.ID] = r
	return nil
}

func (f *fakeResourceRepository) UpdateStatus(ctx context.Context, id string, status resource.Status) error {
	r, ok := f.resources[id]
	if !ok {
		return resource.ErrNotFound
	}
	r.Status = status
	f.resources[id] = r
	return nil
}

func (f *fakeResourceRepository) UpdateLocation(ctx context.Context, id string, location resource.Location) error {
	r, ok := f.resources[id]
	if !ok {
		return resource.ErrNotFound
	}
	r.Location = location
	f.resources[id] = r
	return nil
}

func (f *fakeResourceRepository) Delete(ctx context.Context, id string) error {
	if _, ok := f.resources[id]; !ok {
		return resource.ErrNotFound
	}
	delete(f.resources, id)
	return nil
}

// --- resource.HistoryRecorder / resourcehistory.Repository ---

type fakeHistoryRecorder struct{}

func (fakeHistoryRecorder) RecordStatusChange(ctx context.Context, resourceID string, previous, newStatus resource.Status, changedBy *string) error {
	return nil
}

func (fakeHistoryRecorder) RecordLocationChange(ctx context.Context, resourceID string, previous, newLocation resource.Location, changedBy *string) error {
	return nil
}

func (fakeHistoryRecorder) RecordChange(ctx context.Context, resourceID string, changes []resource.FieldChange, changedBy *string) error {
	return nil
}

// fakePassthroughTx is a resource.TxRunner that runs fn directly, without
// a real transaction: the fakes it wraps in these tests have no
// atomicity of their own to coordinate.
type fakePassthroughTx struct{}

func (fakePassthroughTx) WithinTx(ctx context.Context, fn func(ctx context.Context) error) error {
	return fn(ctx)
}

// --- audit.Repository ---

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

// --- authorization.RoleRepository / PermissionRepository ---

type fakeRoleRepository struct {
	roles map[string]authorization.Role
}

func newFakeRoleRepository() *fakeRoleRepository {
	return &fakeRoleRepository{roles: map[string]authorization.Role{}}
}

func (f *fakeRoleRepository) List(ctx context.Context) ([]authorization.Role, error) {
	var out []authorization.Role
	for _, r := range f.roles {
		out = append(out, r)
	}
	return out, nil
}

func (f *fakeRoleRepository) GetByID(ctx context.Context, id string) (*authorization.Role, error) {
	r, ok := f.roles[id]
	if !ok {
		return nil, authorization.ErrNotFound
	}
	cp := r
	return &cp, nil
}

func (f *fakeRoleRepository) Create(ctx context.Context, r authorization.Role) error {
	f.roles[r.ID] = r
	return nil
}

func (f *fakeRoleRepository) Update(ctx context.Context, r authorization.Role) error {
	if _, ok := f.roles[r.ID]; !ok {
		return authorization.ErrNotFound
	}
	f.roles[r.ID] = r
	return nil
}

func (f *fakeRoleRepository) Delete(ctx context.Context, id string) error {
	if _, ok := f.roles[id]; !ok {
		return authorization.ErrNotFound
	}
	delete(f.roles, id)
	return nil
}

func (f *fakeRoleRepository) SetPermissions(ctx context.Context, roleID string, permissionCodes []string) error {
	r, ok := f.roles[roleID]
	if !ok {
		return authorization.ErrNotFound
	}
	r.Permissions = permissionCodes
	f.roles[roleID] = r
	return nil
}

type fakePermissionRepository struct {
	permissions []authorization.Permission
}

func (f *fakePermissionRepository) List(ctx context.Context) ([]authorization.Permission, error) {
	return f.permissions, nil
}

// --- auth.Repository ---

type fakeUserRepository struct {
	users map[string]auth.User
}

func newFakeUserRepository() *fakeUserRepository {
	return &fakeUserRepository{users: map[string]auth.User{}}
}

func (f *fakeUserRepository) GetByID(ctx context.Context, id string) (*auth.User, error) {
	u, ok := f.users[id]
	if !ok {
		return nil, auth.ErrNotFound
	}
	cp := u
	return &cp, nil
}

func (f *fakeUserRepository) FindCredentialsByIdentifier(ctx context.Context, identifier string) (*auth.Credentials, error) {
	u, ok := f.users[identifier]
	if !ok {
		return nil, auth.ErrNotFound
	}
	return &auth.Credentials{UserID: u.ID, PasswordHash: fakePasswordHash()}, nil
}

// fakePasswordHash returns the bcrypt hash of fakePassword, computed with
// the minimum cost factor so tests using it stay fast.
func fakePasswordHash() string {
	hash, err := bcrypt.GenerateFromPassword([]byte(fakePassword), bcrypt.MinCost)
	if err != nil {
		panic(err)
	}
	return string(hash)
}

func (f *fakeUserRepository) SetRoles(ctx context.Context, userID string, roleNames []string) error {
	u, ok := f.users[userID]
	if !ok {
		return auth.ErrNotFound
	}
	u.RoleNames = roleNames
	f.users[userID] = u
	return nil
}

// fakePassword is the plaintext password every fake user in these tests
// is given (via fakePasswordHash).
const fakePassword = "correct-password"

// fakeTokenSigner is a trivial, insecure TokenSigner for tests: the
// "token" is just the user id with a fixed prefix.
type fakeTokenSigner struct{}

func (fakeTokenSigner) Sign(userID string) (string, error) { return "token-" + userID, nil }

func (fakeTokenSigner) Verify(token string) (string, error) {
	const prefix = "token-"
	if len(token) <= len(prefix) || token[:len(prefix)] != prefix {
		return "", auth.ErrInvalidToken
	}
	return token[len(prefix):], nil
}

// authCookieValue returns a valid auth cookie value for userID, matching
// fakeTokenSigner's trivial scheme, for handler tests that need a request
// that passes middleware.RequireAuth.
func authCookieValue(userID string) string {
	return "token-" + userID
}
