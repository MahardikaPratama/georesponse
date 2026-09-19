/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Request logging middleware. Logs one structured line per

	request (method, path, status, duration, request ID) via
	internal/platform/logging, so every request can be traced
	through server logs. Written locally, rather than using a
	third-party HTTP logging middleware, because the
	requirement is small enough that Chi's own
	middleware.RequestID plus the standard library's
	net/http/httptest-friendly ResponseWriter wrapper below
	cover it.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
*/
package middleware

import (
	"log/slog"
	"net/http"
	"time"

	chimiddleware "github.com/go-chi/chi/v5/middleware"

	"github.com/mahardika-pratama/georesponse-be/internal/platform/logging"
)

// Logging returns middleware that logs one structured line per request
// using the given logger, and attaches that logger to the request context
// (via internal/platform/logging.WithContext) so handlers and error
// translation can log with it too. It must be mounted after RequestID so
// the request ID is available to include in the log line.
func Logging(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := chimiddleware.NewWrapResponseWriter(w, r.ProtoMajor)

			r = r.WithContext(logging.WithContext(r.Context(), logger))
			next.ServeHTTP(ww, r)

			logger.Info("http_request",
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.Int("status", ww.Status()),
				slog.Duration("duration", time.Since(start)),
				slog.String("request_id", chimiddleware.GetReqID(r.Context())),
			)
		})
	}
}
