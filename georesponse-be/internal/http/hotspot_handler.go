/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements the GET /api/v1/hotspots handler and its

	response DTO. Lives alongside resource_handler.go for the same
	import-cycle reason documented at the top of that file.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package http

import (
	"net/http"
	"time"

	"github.com/mahardika-pratama/georesponse-be/internal/hotspot"
	"github.com/mahardika-pratama/georesponse-be/internal/http/httpresponse"
)

// defaultHotspotHours and maxHotspotHours bound the ?hours= query param on
// GET /api/v1/hotspots.
const (
	defaultHotspotHours = 24
	maxHotspotHours     = 72
)

// hotspotResponse is the wire shape of a Hotspot.
type hotspotResponse struct {
	ID           string  `json:"id"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	Region       string  `json:"region"`
	Province     string  `json:"province"`
	Regency      string  `json:"regency"`
	District     string  `json:"district"`
	ObservedDate string  `json:"observedDate"`
	ObservedTime string  `json:"observedTime"`
	UpdatedAt    string  `json:"updatedAt"`
	OriginDate   string  `json:"originDate"`
}

func hotspotToResponse(h hotspot.Hotspot) hotspotResponse {
	return hotspotResponse{
		ID:           h.ID,
		Latitude:     h.Latitude,
		Longitude:    h.Longitude,
		Region:       h.Region,
		Province:     h.Province,
		Regency:      h.Regency,
		District:     h.District,
		ObservedDate: h.ObservedDate,
		ObservedTime: h.ObservedTime,
		UpdatedAt:    h.UpdatedAt.Format(time.RFC3339),
		OriginDate:   h.OriginDate.Format(time.RFC3339),
	}
}

// HotspotHandler serves the /api/v1/hotspots endpoint.
type HotspotHandler struct {
	service *hotspot.Service
}

// NewHotspotHandler constructs a HotspotHandler.
func NewHotspotHandler(service *hotspot.Service) *HotspotHandler {
	return &HotspotHandler{service: service}
}

// List handles GET /api/v1/hotspots.
func (h *HotspotHandler) List(w http.ResponseWriter, r *http.Request) {
	hours := parseIntOrDefault(r.URL.Query().Get("hours"), defaultHotspotHours)
	if hours <= 0 || hours > maxHotspotHours {
		hours = defaultHotspotHours
	}

	hotspots, err := h.service.ListHotspots(r.Context(), hotspot.Filters{Since: time.Duration(hours) * time.Hour})
	if err != nil {
		httpresponse.WriteError(w, r, err)
		return
	}

	responses := make([]hotspotResponse, 0, len(hotspots))
	for _, hs := range hotspots {
		responses = append(responses, hotspotToResponse(hs))
	}
	httpresponse.WriteList(w, http.StatusOK, responses, httpresponse.Meta{Page: 1, PageSize: len(responses), Total: len(responses)})
}
