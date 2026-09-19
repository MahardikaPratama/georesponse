/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements CORS, Cross-Origin Resource Sharing middleware

	that allows only the configured frontend origin(s) to call the API
	from a browser, per SECURITY.md section 8.1 — never a wildcard,
	since the API relies on an HttpOnly cookie (credentials: "include")
	that only makes sense with an explicit, credentialed origin.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package middleware

import "net/http"

// CORS returns middleware that answers cross-origin requests from any
// origin in allowedOrigins with the matching Access-Control-Allow-Origin
// and Access-Control-Allow-Credentials headers, and short-circuits
// preflight OPTIONS requests. A request from an origin not in the list
// receives no CORS headers, so the browser blocks it as usual.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		allowed[origin] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if _, ok := allowed[origin]; ok {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Vary", "Origin")
			}

			if r.Method == http.MethodOptions {
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
