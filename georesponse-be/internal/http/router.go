/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Chi router assembly. Wires the global middleware chain, the

	health check, and every /api/v1 route (API_CONTRACT.md sections
	5-11) to its handler.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation. Phase 0: health check only, no
    feature handlers wired yet.
  - 2.0.0 (2026-09-19): Phase 4: wired every /api/v1 handler; health
    check now reports real database connectivity instead of a static
    "OK".
*/
package http

import (
	"context"
	"encoding/json"
	"log/slog"
	nethttp "net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/http/middleware"
)

// healthCheckTimeout bounds how long the health check waits for a
// database ping before reporting unhealthy.
const healthCheckTimeout = 2 * time.Second

// Dependencies collects everything the router needs to wire /api/v1:
// every feature handler, plus the pieces RequireAuth needs to verify a
// caller's token, and the pool healthHandler pings.
type Dependencies struct {
	Pool            *pgxpool.Pool
	Tokens          auth.TokenSigner
	Users           auth.Repository
	Resource        *ResourceHandler
	ResourceHistory *ResourceHistoryHandler
	Auth            *AuthHandler
	Authorization   *AuthorizationHandler
	Audit           *AuditHandler
}

// New assembles the Chi router: the global middleware chain (request ID,
// logging, panic recovery), the health check, and the /api/v1 route
// group.
func New(logger *slog.Logger, deps Dependencies) nethttp.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(logger))
	r.Use(middleware.Recovery)

	r.Get("/health", healthHandler(deps.Pool))

	requireAuth := middleware.RequireAuth(deps.Tokens, deps.Users)

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", deps.Auth.Login)
			r.With(requireAuth).Post("/logout", deps.Auth.Logout)
			r.With(requireAuth).Get("/me", deps.Auth.Me)
		})

		r.Route("/resources", func(r chi.Router) {
			// Every resource.Service method enforces its own permission
			// check (resource.PermissionResourceRead for reads, not just
			// the mutating operations), so every route here needs a real
			// authenticated context — an anonymous caller has no role
			// names to satisfy that check with and would otherwise always
			// get 403 AUTHORIZATION_DENIED regardless of the operation.
			r.Use(requireAuth)
			r.Get("/", deps.Resource.List)
			r.Post("/", deps.Resource.Create)
			r.Get("/{id}", deps.Resource.Get)
			r.Put("/{id}", deps.Resource.Update)
			r.Delete("/{id}", deps.Resource.Delete)
			r.Patch("/{id}/status", deps.Resource.ChangeStatus)
			r.Patch("/{id}/location", deps.Resource.Relocate)
			r.Get("/{id}/history", deps.ResourceHistory.Get)
		})

		r.Route("/roles", func(r chi.Router) {
			r.Use(requireAuth)
			r.Get("/", deps.Authorization.ListRoles)
			r.Post("/", deps.Authorization.CreateRole)
			r.Put("/{id}", deps.Authorization.UpdateRole)
			r.Delete("/{id}", deps.Authorization.DeleteRole)
			r.Put("/{id}/permissions", deps.Authorization.SetRolePermissions)
		})

		r.With(requireAuth).Get("/permissions", deps.Authorization.ListPermissions)

		r.With(requireAuth).Put("/users/{id}/roles", deps.Authorization.SetUserRoles)

		r.With(requireAuth).Get("/audit-logs", deps.Audit.List)
	})

	return r
}

// healthResponse is the wire shape of GET /health (DEPLOYMENT.md).
type healthResponse struct {
	Status   string `json:"status"`
	Database string `json:"database"`
}

// healthHandler responds 200 OK when the process is up and can reach the
// configured database, or 503 otherwise. Used by local development,
// Docker Compose health checks, and deployment tooling.
func healthHandler(pool *pgxpool.Pool) nethttp.HandlerFunc {
	return func(w nethttp.ResponseWriter, r *nethttp.Request) {
		resp := healthResponse{Status: "ok", Database: "ok"}
		status := nethttp.StatusOK

		ctx, cancel := context.WithTimeout(r.Context(), healthCheckTimeout)
		defer cancel()

		if err := pool.Ping(ctx); err != nil {
			resp.Status = "unavailable"
			resp.Database = "unavailable"
			status = nethttp.StatusServiceUnavailable
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(resp)
	}
}
