/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements GET /api/v1/audit-logs.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package http

import (
	"net/http"
	"time"

	"github.com/mahardika-pratama/georesponse-be/internal/audit"
	"github.com/mahardika-pratama/georesponse-be/internal/http/httpresponse"
)

// auditRecordResponse is the wire shape of an AuditRecord.
type auditRecordResponse struct {
	ID         string         `json:"id"`
	Operation  string         `json:"operation"`
	UserID     *string        `json:"userId,omitempty"`
	ResourceID *string        `json:"resourceId,omitempty"`
	OccurredAt string         `json:"occurredAt"`
	Details    map[string]any `json:"details"`
}

func auditRecordToResponse(r audit.AuditRecord) auditRecordResponse {
	details := r.Details
	if details == nil {
		details = map[string]any{}
	}
	return auditRecordResponse{
		ID: r.ID, Operation: string(r.Operation), UserID: r.UserID, ResourceID: r.ResourceID,
		OccurredAt: r.OccurredAt.Format(timeFormat), Details: details,
	}
}

// AuditHandler serves GET /api/v1/audit-logs.
type AuditHandler struct {
	service *audit.Service
}

// NewAuditHandler constructs an AuditHandler.
func NewAuditHandler(service *audit.Service) *AuditHandler {
	return &AuditHandler{service: service}
}

// List handles GET /api/v1/audit-logs.
func (h *AuditHandler) List(w http.ResponseWriter, r *http.Request) {
	_, roleNames := actorFromRequest(r)
	q := r.URL.Query()

	f := audit.Filters{
		Page:     parseIntOrDefault(q.Get("page"), 1),
		PageSize: parseIntOrDefault(q.Get("pageSize"), 20),
	}
	if userID := q.Get("userId"); userID != "" {
		f.UserID = &userID
	}
	if resourceID := q.Get("resourceId"); resourceID != "" {
		f.ResourceID = &resourceID
	}
	if op := q.Get("operation"); op != "" {
		o := audit.Operation(op)
		f.Operation = &o
	}
	if start := q.Get("startTime"); start != "" {
		if t, err := time.Parse(time.RFC3339, start); err == nil {
			f.StartTime = &t
		}
	}
	if end := q.Get("endTime"); end != "" {
		if t, err := time.Parse(time.RFC3339, end); err == nil {
			f.EndTime = &t
		}
	}

	records, total, err := h.service.ListAuditRecords(r.Context(), roleNames, f)
	if err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	responses := make([]auditRecordResponse, 0, len(records))
	for _, rec := range records {
		responses = append(responses, auditRecordToResponse(rec))
	}
	httpresponse.WriteList(w, http.StatusOK, responses, httpresponse.Meta{Page: f.Page, PageSize: f.PageSize, Total: total})
}
