/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Chi router assembly. Wires the global middleware chain and

	the health check route, structured so the versioned
	/api/v1 route groups (resources, auth, roles, audit-logs,
	...) can be added in later phases inside the r.Route
	block without restructuring this file. No handler
	registers its own sub-router outside this file.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation. Phase 0: health check only, no
    feature handlers wired yet.
*/
package http

import (
	"log/slog"
	nethttp "net/http"

	"github.com/go-chi/chi/v5"

	"github.com/mahardika-pratama/georesponse-be/internal/http/middleware"
)

// Dependencies collects the feature handlers the router wires into
// /api/v1. It is empty in Phase 0 and grows as feature packages
// (resource, auth, authorization, audit, resourcehistory) are implemented.
type Dependencies struct{}

// New assembles the Chi router: the global middleware chain (request ID,
// logging, panic recovery), the unversioned health check, and the
// /api/v1 route group that later phases populate.
func New(logger *slog.Logger, deps Dependencies) nethttp.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(logger))
	r.Use(middleware.Recovery)

	r.Get("/health", healthHandler)

	r.Route("/api/v1", func(r chi.Router) {
		// Feature route groups (auth, resources, roles, audit-logs, ...)
		// are added here as those packages land. Intentionally empty for
		// now - only the health check exists so far.
		_ = deps
	})

	return r
}

// healthHandler responds 200 OK to confirm the process is up. Used by
// local development, Docker Compose health checks, and deployment tooling.
func healthHandler(w nethttp.ResponseWriter, _ *nethttp.Request) {
	w.WriteHeader(nethttp.StatusOK)
	_, _ = w.Write([]byte("OK"))
}
