/*
Author       : Mahardika Pratama
Version      : 1.1.0
Created Date : 2026-09-19
Description  : Implements WriteError, the single place a Go error is

	translated into the JSON error envelope and HTTP status
	API_CONTRACT.md section 13 defines. Every handler calls this
	instead of writing its own error response, so a given domain error
	always produces the same code/status regardless of which endpoint
	triggered it.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
  - 1.1.0 (2026-09-19): Added hotspot.ErrUpstreamUnavailable -> 502
    HOTSPOT_UPSTREAM_UNAVAILABLE for the BMKG GeoHotspot integration.
*/
package httpresponse

import (
	"errors"
	"net/http"

	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/authorization"
	"github.com/mahardika-pratama/georesponse-be/internal/hotspot"
	"github.com/mahardika-pratama/georesponse-be/internal/platform/logging"
	"github.com/mahardika-pratama/georesponse-be/internal/resource"
)

type errorEnvelope struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

// WriteError translates err into the JSON error envelope and HTTP status
// API_CONTRACT.md section 13 defines, and writes it to w. Any error not
// recognized by one of the cases below is logged server-side (with r's
// request-scoped logger) and reported to the client as a generic
// 500 PERSISTENCE_ERROR, so internal details never leak into a response.
func WriteError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr *ValidationError

	switch {
	case errors.Is(err, resource.ErrNotFound),
		errors.Is(err, auth.ErrNotFound),
		errors.Is(err, authorization.ErrNotFound):
		writeError(w, http.StatusNotFound, "RESOURCE_NOT_FOUND", "The requested resource does not exist", nil)

	case errors.Is(err, resource.ErrIDConflict):
		writeError(w, http.StatusConflict, "RESOURCE_ID_CONFLICT", "A resource with this id already exists", nil)

	case errors.Is(err, resource.ErrInvalidType):
		writeError(w, http.StatusBadRequest, "INVALID_RESOURCE_TYPE", "Resource type is missing or not recognized", nil)

	case errors.Is(err, resource.ErrInvalidStatus):
		writeError(w, http.StatusBadRequest, "INVALID_RESOURCE_STATUS", "Resource status is missing or not recognized", nil)

	case errors.Is(err, resource.ErrInvalidLocation):
		writeError(w, http.StatusBadRequest, "INVALID_LOCATION", "Geographic coordinates are missing or out of range", nil)

	case errors.As(err, &validationErr):
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Request data does not satisfy validation rules", validationErr.Details())

	case errors.Is(err, resource.ErrMissingID),
		errors.Is(err, resource.ErrMissingName),
		errors.Is(err, resource.ErrMissingAttribute),
		errors.Is(err, resource.ErrInvalidAttribute),
		errors.Is(err, authorization.ErrNameConflict):
		// Domain rules with no dedicated API_CONTRACT.md error code of
		// their own fall back to the general validation code.
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Request data does not satisfy validation rules", nil)

	case errors.Is(err, auth.ErrInvalidCredentials),
		errors.Is(err, auth.ErrInvalidToken):
		writeError(w, http.StatusUnauthorized, "AUTHENTICATION_FAILED", "Authentication failed", nil)

	case errors.Is(err, authorization.ErrPermissionDenied):
		writeError(w, http.StatusForbidden, "AUTHORIZATION_DENIED", "You do not have permission to perform this operation", nil)

	case errors.Is(err, hotspot.ErrUpstreamUnavailable):
		writeError(w, http.StatusBadGateway, "HOTSPOT_UPSTREAM_UNAVAILABLE", "BMKG hotspot data is temporarily unavailable", nil)

	default:
		logging.FromContext(r.Context()).Error("unhandled error", "error", err)
		writeError(w, http.StatusInternalServerError, "PERSISTENCE_ERROR", "The operation could not be completed", nil)
	}
}

func writeError(w http.ResponseWriter, status int, code, message string, details any) {
	writeJSON(w, status, errorEnvelope{Error: errorBody{Code: code, Message: message, Details: details}})
}
