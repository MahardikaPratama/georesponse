/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : httptest-based tests for the /api/v1/roles,

	/api/v1/permissions, and /api/v1/users/{id}/roles handlers.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/authorization"
	"github.com/mahardika-pratama/georesponse-be/internal/http/middleware"
)

func newAuthorizationTestFixture(t *testing.T, actingRole string, actingPermissions []string) (http.Handler, *fakeRoleRepository) {
	t.Helper()

	roleRepo := newFakeRoleRepository()
	roleRepo.roles["role-acting"] = authorization.Role{ID: "role-acting", Name: actingRole, Permissions: actingPermissions}
	permRepo := &fakePermissionRepository{permissions: []authorization.Permission{{ID: "permission-001", Code: "resource.read", Name: "Read Resource"}}}
	auditRepo := &fakeAuditRepository{}
	authzService := authorization.NewService(roleRepo, permRepo, auditRepo)

	users := newFakeUserRepository()
	users.users["actor-001"] = auth.User{ID: "actor-001", Name: "Actor", RoleNames: []string{actingRole}}
	authService := auth.NewService(users, auditRepo, fakeTokenSigner{}, authzService)

	handler := NewAuthorizationHandler(authzService, authService)

	r := chi.NewRouter()
	r.Use(middleware.RequireAuth(fakeTokenSigner{}, users))
	r.Get("/roles", handler.ListRoles)
	r.Post("/roles", handler.CreateRole)
	r.Put("/roles/{id}", handler.UpdateRole)
	r.Delete("/roles/{id}", handler.DeleteRole)
	r.Get("/permissions", handler.ListPermissions)
	r.Put("/roles/{id}/permissions", handler.SetRolePermissions)
	r.Put("/users/{id}/roles", handler.SetUserRoles)

	return r, roleRepo
}

func doAs(t *testing.T, router http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()

	var reqBody = jsonBody(struct{}{})
	if body != nil {
		reqBody = jsonBody(body)
	}
	req := httptest.NewRequest(method, path, reqBody)
	req.AddCookie(&http.Cookie{Name: middleware.AuthCookieName, Value: authCookieValue("actor-001")})
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func TestAuthorizationHandler_CreateRole_Success(t *testing.T) {
	router, roleRepo := newAuthorizationTestFixture(t, "administrator", []string{authorization.PermissionRoleManage})

	rec := doAs(t, router, http.MethodPost, "/roles", createRoleRequest{ID: "role-new", Name: "coordinator"})

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body: %s", rec.Code, rec.Body.String())
	}
	if _, ok := roleRepo.roles["role-new"]; !ok {
		t.Fatal("role was not persisted")
	}
}

func TestAuthorizationHandler_CreateRole_PermissionDenied(t *testing.T) {
	router, _ := newAuthorizationTestFixture(t, "operator", nil)

	rec := doAs(t, router, http.MethodPost, "/roles", createRoleRequest{ID: "role-new", Name: "coordinator"})

	assertErrorResponse(t, rec, http.StatusForbidden, "AUTHORIZATION_DENIED")
}

func TestAuthorizationHandler_ListRoles_Success(t *testing.T) {
	router, _ := newAuthorizationTestFixture(t, "administrator", []string{authorization.PermissionRoleRead})

	rec := doAs(t, router, http.MethodGet, "/roles", nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
}

func TestAuthorizationHandler_ListPermissions_Success(t *testing.T) {
	router, _ := newAuthorizationTestFixture(t, "administrator", []string{authorization.PermissionPermissionRead})

	rec := doAs(t, router, http.MethodGet, "/permissions", nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var got struct {
		Data []permissionResponse `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if len(got.Data) != 1 || got.Data[0].Code != "resource.read" {
		t.Fatalf("data = %+v, want one permission resource.read", got.Data)
	}
}

func TestAuthorizationHandler_SetRolePermissions_NotFound(t *testing.T) {
	router, _ := newAuthorizationTestFixture(t, "administrator", []string{authorization.PermissionRoleManage})

	rec := doAs(t, router, http.MethodPut, "/roles/does-not-exist/permissions", setPermissionsRequest{Permissions: []string{"resource.read"}})

	assertErrorResponse(t, rec, http.StatusNotFound, "RESOURCE_NOT_FOUND")
}

func TestAuthorizationHandler_SetUserRoles_Success(t *testing.T) {
	router, _ := newAuthorizationTestFixture(t, "administrator", []string{authorization.PermissionRoleManage})

	rec := doAs(t, router, http.MethodPut, "/users/actor-001/roles", setRolesRequest{Roles: []string{"administrator"}})

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204; body: %s", rec.Code, rec.Body.String())
	}
}

func TestAuthorizationHandler_SetUserRoles_PermissionDenied(t *testing.T) {
	router, _ := newAuthorizationTestFixture(t, "operator", nil)

	rec := doAs(t, router, http.MethodPut, "/users/actor-001/roles", setRolesRequest{Roles: []string{"administrator"}})

	assertErrorResponse(t, rec, http.StatusForbidden, "AUTHORIZATION_DENIED")
}
