/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines DecodeJSON, the single place every handler decodes

	a request body, so malformed JSON is always reported the same way
	(a ValidationError, mapped to 400 VALIDATION_ERROR).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package httpresponse

import (
	"encoding/json"
	"net/http"
)

// DecodeJSON decodes r's JSON body into dst. Unknown fields are rejected,
// so a typo in a client request is reported instead of silently ignored.
// A malformed or empty body is reported as a ValidationError.
func DecodeJSON(r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		return NewValidationError(FieldError{Message: "request body is not valid JSON: " + err.Error()})
	}

	return nil
}
