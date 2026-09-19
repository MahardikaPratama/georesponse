/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements Recovery, panic-recovery middleware that

	reports an unexpected panic as the same JSON 500 PERSISTENCE_ERROR
	envelope every other unhandled error produces (FR-053, BR-018),
	rather than Chi's built-in Recoverer, which returns a plain-text
	body and does not match this API's error shape.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package middleware

import (
	"fmt"
	"net/http"

	"github.com/mahardika-pratama/georesponse-be/internal/http/httpresponse"
	"github.com/mahardika-pratama/georesponse-be/internal/platform/logging"
)

// Recovery returns middleware that converts a panic in a later handler
// into the standard JSON error envelope (500 PERSISTENCE_ERROR) instead of
// crashing the process or leaking a stack trace to the client.
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				logging.FromContext(r.Context()).Error("panic recovered", "panic", fmt.Sprintf("%v", rec))
				httpresponse.WriteError(w, r, fmt.Errorf("unexpected failure: %v", rec))
			}
		}()
		next.ServeHTTP(w, r)
	})
}
