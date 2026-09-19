/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : httptest-based tests for the GET /api/v1/audit-logs handler.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/mahardika-pratama/georesponse-be/internal/audit"
	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/authorization"
	"github.com/mahardika-pratama/georesponse-be/internal/http/middleware"
)

func newAuditTestFixture(t *testing.T, actingRole string, permissions []string) (http.Handler, *fakeAuditRepository) {
	t.Helper()

	auditRepo := &fakeAuditRepository{}
	roleRepo := newFakeRoleRepository()
	roleRepo.roles["role-acting"] = authorization.Role{ID: "role-acting", Name: actingRole, Permissions: permissions}
	authzService := authorization.NewService(roleRepo, &fakePermissionRepository{}, auditRepo)
	auditService := audit.NewService(auditRepo, authzService)

	users := newFakeUserRepository()
	users.users["actor-001"] = auth.User{ID: "actor-001", Name: "Actor", RoleNames: []string{actingRole}}

	handler := NewAuditHandler(auditService)

	r := chi.NewRouter()
	r.With(middleware.RequireAuth(fakeTokenSigner{}, users)).Get("/audit-logs", handler.List)

	return r, auditRepo
}

func TestAuditHandler_List_Success(t *testing.T) {
	router, auditRepo := newAuditTestFixture(t, "administrator", []string{audit.PermissionAuditRead})
	auditRepo.records = append(auditRepo.records, audit.AuditRecord{
		ID: "audit-001", Operation: audit.OperationResourceCreated, OccurredAt: time.Now().UTC(),
	})

	req := httptest.NewRequest(http.MethodGet, "/audit-logs", nil)
	req.AddCookie(&http.Cookie{Name: middleware.AuthCookieName, Value: authCookieValue("actor-001")})
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var got struct {
		Data []auditRecordResponse `json:"data"`
		Meta httpMeta              `json:"meta"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if got.Meta.Total != 1 || len(got.Data) != 1 {
		t.Fatalf("data/meta = %+v/%+v, want 1 record", got.Data, got.Meta)
	}
}

func TestAuditHandler_List_PermissionDenied(t *testing.T) {
	router, _ := newAuditTestFixture(t, "operator", nil)

	req := httptest.NewRequest(http.MethodGet, "/audit-logs", nil)
	req.AddCookie(&http.Cookie{Name: middleware.AuthCookieName, Value: authCookieValue("actor-001")})
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assertErrorResponse(t, rec, http.StatusForbidden, "AUTHORIZATION_DENIED")
}

// httpMeta mirrors httpresponse.Meta's JSON shape for test unmarshalling.
type httpMeta struct {
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
	Total    int `json:"total"`
}
