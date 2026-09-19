/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements /api/v1/roles, /api/v1/permissions,

	/api/v1/roles/{id}/permissions, and /api/v1/users/{id}/roles.
	No example request/response JSON is given for these in the contract,
	so the shapes here are grounded directly in the Role/Permission/User
	domain types.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/authorization"
	"github.com/mahardika-pratama/georesponse-be/internal/http/httpresponse"
)

// roleResponse is the wire shape of a Role.
type roleResponse struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Permissions []string `json:"permissions"`
}

func roleToResponse(r authorization.Role) roleResponse {
	perms := r.Permissions
	if perms == nil {
		perms = []string{}
	}
	return roleResponse{ID: r.ID, Name: r.Name, Permissions: perms}
}

// permissionResponse is the wire shape of a Permission.
type permissionResponse struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}

func permissionToResponse(p authorization.Permission) permissionResponse {
	return permissionResponse{ID: p.ID, Code: p.Code, Name: p.Name}
}

// createRoleRequest is the request body for POST /api/v1/roles.
type createRoleRequest struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// updateRoleRequest is the request body for PUT /api/v1/roles/{id}.
type updateRoleRequest struct {
	Name string `json:"name"`
}

// setPermissionsRequest is the request body for
// PUT /api/v1/roles/{id}/permissions.
type setPermissionsRequest struct {
	Permissions []string `json:"permissions"`
}

// setRolesRequest is the request body for PUT /api/v1/users/{id}/roles.
type setRolesRequest struct {
	Roles []string `json:"roles"`
}

// AuthorizationHandler serves the role/permission management endpoints.
type AuthorizationHandler struct {
	authorization *authorization.Service
	auth          *auth.Service
}

// NewAuthorizationHandler constructs an AuthorizationHandler.
func NewAuthorizationHandler(authorizationService *authorization.Service, authService *auth.Service) *AuthorizationHandler {
	return &AuthorizationHandler{authorization: authorizationService, auth: authService}
}

// ListRoles handles GET /api/v1/roles.
func (h *AuthorizationHandler) ListRoles(w http.ResponseWriter, r *http.Request) {
	_, roleNames := actorFromRequest(r)

	roles, err := h.authorization.ListRoles(r.Context(), roleNames)
	if err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	responses := make([]roleResponse, 0, len(roles))
	for _, role := range roles {
		responses = append(responses, roleToResponse(role))
	}
	httpresponse.WriteData(w, http.StatusOK, responses)
}

// CreateRole handles POST /api/v1/roles.
func (h *AuthorizationHandler) CreateRole(w http.ResponseWriter, r *http.Request) {
	userID, roleNames := actorFromRequest(r)

	var req createRoleRequest
	if err := httpresponse.DecodeJSON(r, &req); err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	role, err := h.authorization.CreateRole(r.Context(), userID, roleNames, authorization.Role{ID: req.ID, Name: req.Name})
	if err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}
	httpresponse.WriteData(w, http.StatusCreated, roleToResponse(*role))
}

// UpdateRole handles PUT /api/v1/roles/{id}.
func (h *AuthorizationHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	userID, roleNames := actorFromRequest(r)
	id := chi.URLParam(r, "id")

	var req updateRoleRequest
	if err := httpresponse.DecodeJSON(r, &req); err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	if err := h.authorization.UpdateRole(r.Context(), userID, roleNames, authorization.Role{ID: id, Name: req.Name}); err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}
	httpresponse.WriteData(w, http.StatusOK, roleResponse{ID: id, Name: req.Name})
}

// DeleteRole handles DELETE /api/v1/roles/{id}.
func (h *AuthorizationHandler) DeleteRole(w http.ResponseWriter, r *http.Request) {
	userID, roleNames := actorFromRequest(r)
	id := chi.URLParam(r, "id")

	if err := h.authorization.DeleteRole(r.Context(), userID, roleNames, id); err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}
	httpresponse.WriteNoContent(w)
}

// ListPermissions handles GET /api/v1/permissions.
func (h *AuthorizationHandler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	_, roleNames := actorFromRequest(r)

	permissions, err := h.authorization.ListPermissions(r.Context(), roleNames)
	if err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	responses := make([]permissionResponse, 0, len(permissions))
	for _, p := range permissions {
		responses = append(responses, permissionToResponse(p))
	}
	httpresponse.WriteData(w, http.StatusOK, responses)
}

// SetRolePermissions handles PUT /api/v1/roles/{id}/permissions.
func (h *AuthorizationHandler) SetRolePermissions(w http.ResponseWriter, r *http.Request) {
	userID, roleNames := actorFromRequest(r)
	id := chi.URLParam(r, "id")

	var req setPermissionsRequest
	if err := httpresponse.DecodeJSON(r, &req); err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	if err := h.authorization.AssignRolePermissions(r.Context(), userID, roleNames, id, req.Permissions); err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}
	httpresponse.WriteNoContent(w)
}

// SetUserRoles handles PUT /api/v1/users/{id}/roles.
func (h *AuthorizationHandler) SetUserRoles(w http.ResponseWriter, r *http.Request) {
	userID, roleNames := actorFromRequest(r)
	targetUserID := chi.URLParam(r, "id")

	var req setRolesRequest
	if err := httpresponse.DecodeJSON(r, &req); err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	if err := h.auth.AssignUserRoles(r.Context(), userID, roleNames, targetUserID, req.Roles); err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}
	httpresponse.WriteNoContent(w)
}
