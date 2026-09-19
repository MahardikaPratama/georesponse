/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Package httpresponse writes the JSON response envelopes

	API_CONTRACT.md section 4 defines: a single-value success envelope
	({"data": ...}), a paginated collection envelope ({"data": [...],
	"meta": {...}}), and (in error.go) the error envelope. Every
	handler writes its response through this package, so the shape is
	identical across all of them.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package httpresponse

import (
	"encoding/json"
	"net/http"
)

// Meta is the pagination metadata attached to a collection response
// (API_CONTRACT.md section 4).
type Meta struct {
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
	Total    int `json:"total"`
}

type dataEnvelope struct {
	Data any `json:"data"`
}

type listEnvelope struct {
	Data any  `json:"data"`
	Meta Meta `json:"meta"`
}

// WriteData writes a single-value success envelope: {"data": data}.
func WriteData(w http.ResponseWriter, status int, data any) {
	writeJSON(w, status, dataEnvelope{Data: data})
}

// WriteList writes a paginated collection envelope: {"data": data, "meta":
// meta}. data should be a slice (never nil — pass an empty slice so the
// JSON array is `[]`, not `null`, for an empty result set).
func WriteList(w http.ResponseWriter, status int, data any, meta Meta) {
	writeJSON(w, status, listEnvelope{Data: data, Meta: meta})
}

// WriteNoContent writes a 204 No Content response with no body, for
// operations (like DELETE) that succeed without returning a resource.
func WriteNoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
