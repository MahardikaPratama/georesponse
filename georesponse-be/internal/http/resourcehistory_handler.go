/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements GET /api/v1/resources/{id}/history

	(API_CONTRACT.md section 9.1).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/mahardika-pratama/georesponse-be/internal/http/httpresponse"
	"github.com/mahardika-pratama/georesponse-be/internal/resourcehistory"
)

// resourceChangeDTO is the wire shape of one field-level change within a
// change-history entry.
type resourceChangeDTO struct {
	Field  string `json:"field"`
	Before any    `json:"before"`
	After  any    `json:"after"`
}

// statusHistoryResponse is the wire shape of one status-history entry.
type statusHistoryResponse struct {
	ID             string  `json:"id"`
	ResourceID     string  `json:"resourceId"`
	PreviousStatus string  `json:"previousStatus"`
	NewStatus      string  `json:"newStatus"`
	ChangedAt      string  `json:"changedAt"`
	ChangedBy      *string `json:"changedBy,omitempty"`
}

// locationHistoryResponse is the wire shape of one location-history entry.
type locationHistoryResponse struct {
	ID               string      `json:"id"`
	ResourceID       string      `json:"resourceId"`
	PreviousLocation locationDTO `json:"previousLocation"`
	NewLocation      locationDTO `json:"newLocation"`
	ChangedAt        string      `json:"changedAt"`
	ChangedBy        *string     `json:"changedBy,omitempty"`
}

// changeHistoryResponse is the wire shape of one change-history entry.
type changeHistoryResponse struct {
	ID         string              `json:"id"`
	ResourceID string              `json:"resourceId"`
	Changes    []resourceChangeDTO `json:"changes"`
	ChangedAt  string              `json:"changedAt"`
	ChangedBy  *string             `json:"changedBy,omitempty"`
}

// historyResponse is the wire shape of GET .../history's data field.
type historyResponse struct {
	StatusHistory   []statusHistoryResponse   `json:"statusHistory"`
	LocationHistory []locationHistoryResponse `json:"locationHistory"`
	ChangeHistory   []changeHistoryResponse   `json:"changeHistory"`
}

func historyToResponse(h resourcehistory.History) historyResponse {
	resp := historyResponse{
		StatusHistory:   make([]statusHistoryResponse, 0, len(h.StatusHistory)),
		LocationHistory: make([]locationHistoryResponse, 0, len(h.LocationHistory)),
		ChangeHistory:   make([]changeHistoryResponse, 0, len(h.ChangeHistory)),
	}

	for _, s := range h.StatusHistory {
		resp.StatusHistory = append(resp.StatusHistory, statusHistoryResponse{
			ID: s.ID, ResourceID: s.ResourceID,
			PreviousStatus: string(s.PreviousStatus), NewStatus: string(s.NewStatus),
			ChangedAt: s.ChangedAt.Format(timeFormat), ChangedBy: s.ChangedBy,
		})
	}
	for _, l := range h.LocationHistory {
		resp.LocationHistory = append(resp.LocationHistory, locationHistoryResponse{
			ID: l.ID, ResourceID: l.ResourceID,
			PreviousLocation: locationToDTO(l.PreviousLocation), NewLocation: locationToDTO(l.NewLocation),
			ChangedAt: l.ChangedAt.Format(timeFormat), ChangedBy: l.ChangedBy,
		})
	}
	for _, c := range h.ChangeHistory {
		changes := make([]resourceChangeDTO, 0, len(c.Changes))
		for _, fc := range c.Changes {
			changes = append(changes, resourceChangeDTO{Field: fc.Field, Before: fc.Before, After: fc.After})
		}
		resp.ChangeHistory = append(resp.ChangeHistory, changeHistoryResponse{
			ID: c.ID, ResourceID: c.ResourceID, Changes: changes, ChangedAt: c.ChangedAt.Format(timeFormat), ChangedBy: c.ChangedBy,
		})
	}

	return resp
}

// ResourceHistoryHandler serves GET /api/v1/resources/{id}/history.
type ResourceHistoryHandler struct {
	service *resourcehistory.Service
}

// NewResourceHistoryHandler constructs a ResourceHistoryHandler.
func NewResourceHistoryHandler(service *resourcehistory.Service) *ResourceHistoryHandler {
	return &ResourceHistoryHandler{service: service}
}

// Get handles GET /api/v1/resources/{id}/history.
func (h *ResourceHistoryHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	q := r.URL.Query()

	var filterType *resourcehistory.Type
	if typ := q.Get("type"); typ != "" {
		t := resourcehistory.Type(typ)
		filterType = &t
	}
	page := parseIntOrDefault(q.Get("page"), 1)
	pageSize := parseIntOrDefault(q.Get("pageSize"), 20)

	history, err := h.service.GetResourceHistory(r.Context(), id, filterType, page, pageSize)
	if err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}
	httpresponse.WriteData(w, http.StatusOK, historyToResponse(history))
}
