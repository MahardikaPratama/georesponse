/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : httptest-based tests for the /api/v1/auth handlers.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/authorization"
	"github.com/mahardika-pratama/georesponse-be/internal/http/middleware"
)

func newAuthTestFixture(t *testing.T) (http.Handler, *fakeUserRepository) {
	t.Helper()

	users := newFakeUserRepository()
	users.users["user-001"] = auth.User{ID: "user-001", Name: "Demo Admin", RoleNames: []string{"administrator"}}

	roleRepo := newFakeRoleRepository()
	authzService := authorization.NewService(roleRepo, &fakePermissionRepository{}, &fakeAuditRepository{})
	tokens := fakeTokenSigner{}
	authService := auth.NewService(users, &fakeAuditRepository{}, tokens, authzService)
	handler := NewAuthHandler(authService, time.Hour, false)

	r := chi.NewRouter()
	r.Post("/auth/login", handler.Login)
	r.With(middleware.RequireAuth(tokens, users)).Post("/auth/logout", handler.Logout)
	r.With(middleware.RequireAuth(tokens, users)).Get("/auth/me", handler.Me)

	return r, users
}

func TestAuthHandler_Login_Success(t *testing.T) {
	router, _ := newAuthTestFixture(t)

	req := httptest.NewRequest(http.MethodPost, "/auth/login", jsonBody(loginRequest{Identifier: "user-001", Password: fakePassword}))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}

	cookies := rec.Result().Cookies()
	var found bool
	for _, c := range cookies {
		if c.Name == "georesponse_token" {
			found = true
			if !c.HttpOnly {
				t.Fatal("auth cookie is not HttpOnly")
			}
		}
	}
	if !found {
		t.Fatal("no auth cookie set on successful login")
	}
}

func TestAuthHandler_Login_WrongPassword(t *testing.T) {
	router, _ := newAuthTestFixture(t)

	req := httptest.NewRequest(http.MethodPost, "/auth/login", jsonBody(loginRequest{Identifier: "user-001", Password: "wrong"}))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assertErrorResponse(t, rec, http.StatusUnauthorized, "AUTHENTICATION_FAILED")
}

func TestAuthHandler_Me_Success(t *testing.T) {
	router, _ := newAuthTestFixture(t)

	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	req.AddCookie(&http.Cookie{Name: "georesponse_token", Value: authCookieValue("user-001")})
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var got struct {
		Data userResponse `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if got.Data.ID != "user-001" {
		t.Fatalf("data.id = %q, want user-001", got.Data.ID)
	}
}

func TestAuthHandler_Me_NoCookie_Unauthorized(t *testing.T) {
	router, _ := newAuthTestFixture(t)

	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assertErrorResponse(t, rec, http.StatusUnauthorized, "AUTHENTICATION_FAILED")
}

func TestAuthHandler_Logout_ClearsCookie(t *testing.T) {
	router, _ := newAuthTestFixture(t)

	req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	req.AddCookie(&http.Cookie{Name: "georesponse_token", Value: authCookieValue("user-001")})
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204; body: %s", rec.Code, rec.Body.String())
	}

	var cleared bool
	for _, c := range rec.Result().Cookies() {
		if c.Name == "georesponse_token" && c.MaxAge < 0 {
			cleared = true
		}
	}
	if !cleared {
		t.Fatal("Logout did not clear the auth cookie")
	}
}

// jsonBody marshals v and returns it as an io.Reader-compatible request
// body.
func jsonBody(v any) *strings.Reader {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return strings.NewReader(string(b))
}
