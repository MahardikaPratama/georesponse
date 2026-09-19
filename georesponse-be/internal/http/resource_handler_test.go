/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : httptest-based tests for the /api/v1/resources handlers,

	covering the success path and at least one documented failure path
	per endpoint.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/authorization"
	"github.com/mahardika-pratama/georesponse-be/internal/http/middleware"
	"github.com/mahardika-pratama/georesponse-be/internal/resource"
)

type resourceTestFixture struct {
	repo   *fakeResourceRepository
	audit  *fakeAuditRepository
	router http.Handler
	userID string
}

func newResourceTestFixture(t *testing.T) *resourceTestFixture {
	t.Helper()

	repo := newFakeResourceRepository()
	auditRepo := &fakeAuditRepository{}

	validators := resource.NewAttributeValidatorRegistry(
		resource.NewVehicleAttributeValidator(),
		resource.NewFacilityAttributeValidator(),
		resource.NewEquipmentAttributeValidator(),
		resource.NewIoTDeviceAttributeValidator(),
	)

	roleRepo := newFakeRoleRepository()
	roleRepo.roles["role-operator"] = authorization.Role{
		ID: "role-operator", Name: "operator",
		Permissions: []string{
			resource.PermissionResourceCreate, resource.PermissionResourceRead,
			resource.PermissionResourceUpdate, resource.PermissionResourceDelete,
		},
	}
	authzService := authorization.NewService(roleRepo, &fakePermissionRepository{}, auditRepo)

	svc := resource.NewService(repo, fakeHistoryRecorder{}, auditRepo, validators, authzService, fakePassthroughTx{})
	handler := NewResourceHandler(svc)

	userRepo := newFakeUserRepository()
	userRepo.users["user-001"] = auth.User{ID: "user-001", Name: "Test Operator", RoleNames: []string{"operator"}}
	tokens := fakeTokenSigner{}

	r := chi.NewRouter()
	r.Use(middleware.RequireAuth(tokens, userRepo))
	r.Get("/resources", handler.List)
	r.Post("/resources", handler.Create)
	r.Get("/resources/{id}", handler.Get)
	r.Put("/resources/{id}", handler.Update)
	r.Delete("/resources/{id}", handler.Delete)
	r.Patch("/resources/{id}/status", handler.ChangeStatus)
	r.Patch("/resources/{id}/location", handler.Relocate)

	return &resourceTestFixture{repo: repo, audit: auditRepo, router: r, userID: "user-001"}
}

func (f *resourceTestFixture) do(t *testing.T, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()

	var reqBody *bytes.Buffer
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal request body: %v", err)
		}
		reqBody = bytes.NewBuffer(b)
	} else {
		reqBody = bytes.NewBuffer(nil)
	}

	req := httptest.NewRequest(method, path, reqBody)
	req.AddCookie(&http.Cookie{Name: middleware.AuthCookieName, Value: authCookieValue(f.userID)})
	rec := httptest.NewRecorder()
	f.router.ServeHTTP(rec, req)
	return rec
}

func TestResourceHandler_Create_Success(t *testing.T) {
	f := newResourceTestFixture(t)

	rec := f.do(t, http.MethodPost, "/resources", createResourceRequest{
		ID: "resource-001", Name: "Ambulance", Type: "VEHICLE", Status: "AVAILABLE",
		Attributes: map[string]any{"vehicleType": "Ambulance", "capacity": 4.0},
		Location:   locationDTO{Latitude: -6.9147, Longitude: 107.6098},
	})

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body: %s", rec.Code, rec.Body.String())
	}
	var got struct {
		Data resourceResponse `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if got.Data.ID != "resource-001" {
		t.Fatalf("data.id = %q, want resource-001", got.Data.ID)
	}
}

func TestResourceHandler_Create_DuplicateID_Conflict(t *testing.T) {
	f := newResourceTestFixture(t)
	f.repo.resources["resource-001"] = resource.Resource{ID: "resource-001", Name: "X", Type: resource.TypeVehicle, Status: resource.StatusAvailable}

	rec := f.do(t, http.MethodPost, "/resources", createResourceRequest{
		ID: "resource-001", Name: "Ambulance", Type: "VEHICLE", Status: "AVAILABLE",
		Attributes: map[string]any{"vehicleType": "Ambulance", "capacity": 4.0},
	})

	assertErrorResponse(t, rec, http.StatusConflict, "RESOURCE_ID_CONFLICT")
}

func TestResourceHandler_Get_Success(t *testing.T) {
	f := newResourceTestFixture(t)
	f.repo.resources["resource-001"] = resource.Resource{ID: "resource-001", Name: "X", Type: resource.TypeVehicle, Status: resource.StatusAvailable}

	rec := f.do(t, http.MethodGet, "/resources/resource-001", nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
}

func TestResourceHandler_Get_NotFound(t *testing.T) {
	f := newResourceTestFixture(t)

	rec := f.do(t, http.MethodGet, "/resources/does-not-exist", nil)

	assertErrorResponse(t, rec, http.StatusNotFound, "RESOURCE_NOT_FOUND")
}

func TestResourceHandler_List_Success(t *testing.T) {
	f := newResourceTestFixture(t)
	f.repo.resources["resource-001"] = resource.Resource{ID: "resource-001", Name: "X", Type: resource.TypeVehicle, Status: resource.StatusAvailable}

	rec := f.do(t, http.MethodGet, "/resources", nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var got struct {
		Data []resourceResponse `json:"data"`
		Meta struct {
			Page     int `json:"page"`
			PageSize int `json:"pageSize"`
			Total    int `json:"total"`
		} `json:"meta"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if got.Meta.Total != 1 || got.Meta.Page != 1 || got.Meta.PageSize != 20 {
		t.Fatalf("meta = %+v, want total=1 page=1 pageSize=20", got.Meta)
	}
}

func TestResourceHandler_Update_Success(t *testing.T) {
	f := newResourceTestFixture(t)
	f.repo.resources["resource-001"] = resource.Resource{
		ID: "resource-001", Name: "Before", Type: resource.TypeVehicle, Status: resource.StatusAvailable,
		Attributes: map[string]any{"vehicleType": "Truck", "capacity": 2.0},
	}

	rec := f.do(t, http.MethodPut, "/resources/resource-001", updateResourceRequest{
		Name: "After", Type: "VEHICLE", Attributes: map[string]any{"vehicleType": "Truck", "capacity": 2.0},
	})

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	if f.repo.resources["resource-001"].Name != "After" {
		t.Fatalf("Name = %q, want After", f.repo.resources["resource-001"].Name)
	}
}

func TestResourceHandler_Update_NotFound(t *testing.T) {
	f := newResourceTestFixture(t)

	rec := f.do(t, http.MethodPut, "/resources/does-not-exist", updateResourceRequest{Name: "X", Type: "VEHICLE"})

	assertErrorResponse(t, rec, http.StatusNotFound, "RESOURCE_NOT_FOUND")
}

func TestResourceHandler_Delete_Success(t *testing.T) {
	f := newResourceTestFixture(t)
	f.repo.resources["resource-001"] = resource.Resource{ID: "resource-001", Name: "X", Type: resource.TypeVehicle, Status: resource.StatusAvailable}

	rec := f.do(t, http.MethodDelete, "/resources/resource-001", nil)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204; body: %s", rec.Code, rec.Body.String())
	}
	if _, exists := f.repo.resources["resource-001"]; exists {
		t.Fatal("resource still exists after Delete")
	}
}

func TestResourceHandler_Delete_NotFound(t *testing.T) {
	f := newResourceTestFixture(t)

	rec := f.do(t, http.MethodDelete, "/resources/does-not-exist", nil)

	assertErrorResponse(t, rec, http.StatusNotFound, "RESOURCE_NOT_FOUND")
}

func TestResourceHandler_ChangeStatus_Success(t *testing.T) {
	f := newResourceTestFixture(t)
	f.repo.resources["resource-001"] = resource.Resource{ID: "resource-001", Name: "X", Type: resource.TypeVehicle, Status: resource.StatusAvailable}

	rec := f.do(t, http.MethodPatch, "/resources/resource-001/status", changeStatusRequest{Status: "MAINTENANCE"})

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	if f.repo.resources["resource-001"].Status != resource.StatusMaintenance {
		t.Fatalf("Status = %v, want MAINTENANCE", f.repo.resources["resource-001"].Status)
	}
}

func TestResourceHandler_ChangeStatus_InvalidStatus(t *testing.T) {
	f := newResourceTestFixture(t)
	f.repo.resources["resource-001"] = resource.Resource{ID: "resource-001", Name: "X", Type: resource.TypeVehicle, Status: resource.StatusAvailable}

	rec := f.do(t, http.MethodPatch, "/resources/resource-001/status", changeStatusRequest{Status: "BROKEN"})

	assertErrorResponse(t, rec, http.StatusBadRequest, "INVALID_RESOURCE_STATUS")
}

func TestResourceHandler_Relocate_Success(t *testing.T) {
	f := newResourceTestFixture(t)
	f.repo.resources["resource-001"] = resource.Resource{ID: "resource-001", Name: "X", Type: resource.TypeVehicle, Status: resource.StatusAvailable}

	rec := f.do(t, http.MethodPatch, "/resources/resource-001/location", relocateRequest{Latitude: -6.2, Longitude: 106.8})

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	if f.repo.resources["resource-001"].Location.Latitude != -6.2 {
		t.Fatalf("Location = %+v, want latitude -6.2", f.repo.resources["resource-001"].Location)
	}
}

func TestResourceHandler_Relocate_InvalidLocation(t *testing.T) {
	f := newResourceTestFixture(t)
	f.repo.resources["resource-001"] = resource.Resource{ID: "resource-001", Name: "X", Type: resource.TypeVehicle, Status: resource.StatusAvailable}

	rec := f.do(t, http.MethodPatch, "/resources/resource-001/location", relocateRequest{Latitude: 1000, Longitude: 0})

	assertErrorResponse(t, rec, http.StatusBadRequest, "INVALID_LOCATION")
}

// --- shared assertion helper (used by every handler test file) ---

func assertErrorResponse(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, wantCode string) {
	t.Helper()

	if rec.Code != wantStatus {
		t.Fatalf("status = %d, want %d; body: %s", rec.Code, wantStatus, rec.Body.String())
	}

	var got struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal error response: %v; body: %s", err, rec.Body.String())
	}
	if got.Error.Code != wantCode {
		t.Fatalf("error.code = %q, want %q", got.Error.Code, wantCode)
	}
}
