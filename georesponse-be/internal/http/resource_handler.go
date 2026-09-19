/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements the /api/v1/resources HTTP handlers and their

	request/response DTOs. Handlers live here, alongside router.go,
	rather than inside internal/resource as an illustrative package
	layout might otherwise suggest — see middleware/auth.go's header
	comment for why:
	internal/http/httpresponse (which every handler needs) already
	imports internal/resource for its sentinel errors, so
	internal/resource importing httpresponse back to write responses
	would be an import cycle. This package is the top of the dependency
	chain (HTTP -> use case -> domain), so it is free to import
	everything below it.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package http

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/mahardika-pratama/georesponse-be/internal/http/httpresponse"
	"github.com/mahardika-pratama/georesponse-be/internal/http/middleware"
	"github.com/mahardika-pratama/georesponse-be/internal/resource"
)

// --- DTOs ---

// locationDTO is the wire shape of a Location.
type locationDTO struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

func locationToDTO(l resource.Location) locationDTO {
	return locationDTO{Latitude: l.Latitude, Longitude: l.Longitude}
}

func (d locationDTO) toDomain() resource.Location {
	return resource.Location{Latitude: d.Latitude, Longitude: d.Longitude}
}

// resourceResponse is the wire shape of a Resource.
type resourceResponse struct {
	ID         string         `json:"id"`
	Name       string         `json:"name"`
	Type       string         `json:"type"`
	Status     string         `json:"status"`
	Attributes map[string]any `json:"attributes"`
	Location   locationDTO    `json:"location"`
}

func resourceToResponse(r resource.Resource) resourceResponse {
	attrs := r.Attributes
	if attrs == nil {
		attrs = map[string]any{}
	}
	return resourceResponse{
		ID:         r.ID,
		Name:       r.Name,
		Type:       string(r.Type),
		Status:     string(r.Status),
		Attributes: attrs,
		Location:   locationToDTO(r.Location),
	}
}

// createResourceRequest is the request body for POST /api/v1/resources.
type createResourceRequest struct {
	ID         string         `json:"id"`
	Name       string         `json:"name"`
	Type       string         `json:"type"`
	Status     string         `json:"status"`
	Attributes map[string]any `json:"attributes"`
	Location   locationDTO    `json:"location"`
}

func (req createResourceRequest) toDomain() resource.Resource {
	return resource.Resource{
		ID:         req.ID,
		Name:       req.Name,
		Type:       resource.Type(req.Type),
		Status:     resource.Status(req.Status),
		Attributes: req.Attributes,
		Location:   req.Location.toDomain(),
	}
}

// updateResourceRequest is the request body for PUT /api/v1/resources/{id}.
// It intentionally has no status or location field: those are updated
// through PATCH .../status and PATCH .../location instead, matching
// resource.Service.UpdateResource, which always keeps the current
// record's status and location regardless of what a caller sends.
type updateResourceRequest struct {
	Name       string         `json:"name"`
	Type       string         `json:"type"`
	Attributes map[string]any `json:"attributes"`
}

func (req updateResourceRequest) toDomain(id string) resource.Resource {
	return resource.Resource{
		ID:         id,
		Name:       req.Name,
		Type:       resource.Type(req.Type),
		Attributes: req.Attributes,
	}
}

// changeStatusRequest is the request body for
// PATCH /api/v1/resources/{id}/status.
type changeStatusRequest struct {
	Status string `json:"status"`
}

// relocateRequest is the request body for
// PATCH /api/v1/resources/{id}/location.
type relocateRequest struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// --- Handler ---

// ResourceHandler serves the /api/v1/resources endpoints.
type ResourceHandler struct {
	service *resource.Service
}

// NewResourceHandler constructs a ResourceHandler.
func NewResourceHandler(service *resource.Service) *ResourceHandler {
	return &ResourceHandler{service: service}
}

// List handles GET /api/v1/resources.
func (h *ResourceHandler) List(w http.ResponseWriter, r *http.Request) {
	_, roleNames := actorFromRequest(r)

	q := r.URL.Query()
	f := resource.Filters{
		Page:     parseIntOrDefault(q.Get("page"), 1),
		PageSize: parseIntOrDefault(q.Get("pageSize"), 20),
	}
	if search := q.Get("search"); search != "" {
		f.Search = &search
	}
	if typ := q.Get("type"); typ != "" {
		t := resource.Type(typ)
		f.Type = &t
	}
	if status := q.Get("status"); status != "" {
		s := resource.Status(status)
		f.Status = &s
	}

	results, total, err := h.service.ListResources(r.Context(), roleNames, f)
	if err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	responses := make([]resourceResponse, 0, len(results))
	for _, res := range results {
		responses = append(responses, resourceToResponse(res))
	}
	httpresponse.WriteList(w, http.StatusOK, responses, httpresponse.Meta{Page: f.Page, PageSize: f.PageSize, Total: total})
}

// Get handles GET /api/v1/resources/{id}.
func (h *ResourceHandler) Get(w http.ResponseWriter, r *http.Request) {
	_, roleNames := actorFromRequest(r)
	id := chi.URLParam(r, "id")

	res, err := h.service.GetResource(r.Context(), roleNames, id)
	if err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}
	httpresponse.WriteData(w, http.StatusOK, resourceToResponse(*res))
}

// Create handles POST /api/v1/resources.
func (h *ResourceHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, roleNames := actorFromRequest(r)

	var req createResourceRequest
	if err := httpresponse.DecodeJSON(r, &req); err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	res, err := h.service.CreateResource(r.Context(), userID, roleNames, req.toDomain())
	if err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}
	httpresponse.WriteData(w, http.StatusCreated, resourceToResponse(*res))
}

// Update handles PUT /api/v1/resources/{id}.
func (h *ResourceHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, roleNames := actorFromRequest(r)
	id := chi.URLParam(r, "id")

	var req updateResourceRequest
	if err := httpresponse.DecodeJSON(r, &req); err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	res, err := h.service.UpdateResource(r.Context(), userID, roleNames, req.toDomain(id))
	if err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}
	httpresponse.WriteData(w, http.StatusOK, resourceToResponse(*res))
}

// Delete handles DELETE /api/v1/resources/{id}.
func (h *ResourceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, roleNames := actorFromRequest(r)
	id := chi.URLParam(r, "id")

	if err := h.service.DeleteResource(r.Context(), userID, roleNames, id); err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}
	httpresponse.WriteNoContent(w)
}

// ChangeStatus handles PATCH /api/v1/resources/{id}/status.
func (h *ResourceHandler) ChangeStatus(w http.ResponseWriter, r *http.Request) {
	userID, roleNames := actorFromRequest(r)
	id := chi.URLParam(r, "id")

	var req changeStatusRequest
	if err := httpresponse.DecodeJSON(r, &req); err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	res, err := h.service.ChangeResourceStatus(r.Context(), userID, roleNames, id, resource.Status(req.Status))
	if err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}
	httpresponse.WriteData(w, http.StatusOK, resourceToResponse(*res))
}

// Relocate handles PATCH /api/v1/resources/{id}/location.
func (h *ResourceHandler) Relocate(w http.ResponseWriter, r *http.Request) {
	userID, roleNames := actorFromRequest(r)
	id := chi.URLParam(r, "id")

	var req relocateRequest
	if err := httpresponse.DecodeJSON(r, &req); err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	res, err := h.service.RelocateResource(r.Context(), userID, roleNames, id, resource.Location{Latitude: req.Latitude, Longitude: req.Longitude})
	if err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}
	httpresponse.WriteData(w, http.StatusOK, resourceToResponse(*res))
}

// --- shared helpers (used by every handler file in this package) ---

// actorFromRequest returns the authenticated user id and role names
// attached to r by middleware.RequireAuth, or ("", nil) for a request
// that passed through no such middleware (e.g. an intentionally public
// route).
func actorFromRequest(r *http.Request) (userID string, roleNames []string) {
	ac, ok := middleware.AuthFromContext(r.Context())
	if !ok {
		return "", nil
	}
	return ac.UserID, ac.RoleNames
}

// parseIntOrDefault parses s as an int, returning def if s is empty or
// not a valid integer.
func parseIntOrDefault(s string, def int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return n
}
