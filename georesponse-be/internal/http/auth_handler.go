/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements POST /api/v1/auth/login, POST /api/v1/auth/logout,

	and GET /api/v1/auth/me. The authenticated context is transmitted as
	an HttpOnly, Secure, SameSite=Lax cookie set on login and cleared on
	logout — an implementation decision deliberately left open elsewhere
	— rather than returning the token in the response body, so the
	frontend never handles it directly.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package http

import (
	"net/http"
	"time"

	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/http/httpresponse"
	"github.com/mahardika-pratama/georesponse-be/internal/http/middleware"
)

// userResponse is the wire shape of an authenticated User.
type userResponse struct {
	ID    string   `json:"id"`
	Name  string   `json:"name"`
	Roles []string `json:"roles"`
}

func userToResponse(u auth.User) userResponse {
	roles := u.RoleNames
	if roles == nil {
		roles = []string{}
	}
	return userResponse{ID: u.ID, Name: u.Name, Roles: roles}
}

// loginRequest is the request body for POST /api/v1/auth/login.
type loginRequest struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

// AuthHandler serves the /api/v1/auth endpoints.
type AuthHandler struct {
	service      *auth.Service
	tokenTTL     time.Duration
	secureCookie bool
}

// NewAuthHandler constructs an AuthHandler. tokenTTL is used only to set
// the auth cookie's Max-Age so it expires alongside the token itself.
// secureCookie should be true whenever the server is reachable only over
// HTTPS (production); a browser refuses to send a Secure cookie back over
// plain HTTP, which would make local development over http://localhost
// impossible if this were hardcoded to true.
func NewAuthHandler(service *auth.Service, tokenTTL time.Duration, secureCookie bool) *AuthHandler {
	return &AuthHandler{service: service, tokenTTL: tokenTTL, secureCookie: secureCookie}
}

// Login handles POST /api/v1/auth/login (BR-022 through BR-024, UC-11).
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := httpresponse.DecodeJSON(r, &req); err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	user, token, err := h.service.Authenticate(r.Context(), req.Identifier, req.Password)
	if err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     middleware.AuthCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int(h.tokenTTL.Seconds()),
		HttpOnly: true,
		Secure:   h.secureCookie,
		SameSite: http.SameSiteLaxMode,
	})

	httpresponse.WriteData(w, http.StatusOK, userToResponse(*user))
}

// Logout handles POST /api/v1/auth/logout.
// Tokens are stateless (see auth.Service.Logout), so there is nothing to
// invalidate server-side; this clears the client's auth cookie, which is
// what actually ends the session from the client's perspective.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     middleware.AuthCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.secureCookie,
		SameSite: http.SameSiteLaxMode,
	})
	httpresponse.WriteNoContent(w)
}

// Me handles GET /api/v1/auth/me (FR-029). It must be mounted behind
// middleware.RequireAuth.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, _ := actorFromRequest(r)

	user, err := h.service.GetCurrentUser(r.Context(), userID)
	if err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}
	httpresponse.WriteData(w, http.StatusOK, userToResponse(*user))
}
