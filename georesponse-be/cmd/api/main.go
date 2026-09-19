/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Process entry point for the georesponse-be API server.

	Loads configuration, connects to PostgreSQL, wires every
	repository, use case, and HTTP handler, assembles the router, and
	starts the HTTP server with graceful shutdown on SIGINT/SIGTERM.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation. Phase 0 bootstrap: config,
    logging, router with /health only.
  - 2.0.0 (2026-09-19): Phase 4: wires the database pool, every
    repository, use case, and HTTP handler.
*/
package main

import (
	"context"
	"errors"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	internalhttp "github.com/mahardika-pratama/georesponse-be/internal/http"
	"github.com/mahardika-pratama/georesponse-be/internal/platform/config"
	"github.com/mahardika-pratama/georesponse-be/internal/platform/logging"
	platformpostgres "github.com/mahardika-pratama/georesponse-be/internal/platform/postgres"
	repopostgres "github.com/mahardika-pratama/georesponse-be/internal/repository/postgres"

	"github.com/mahardika-pratama/georesponse-be/internal/audit"
	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/authorization"
	"github.com/mahardika-pratama/georesponse-be/internal/resource"
	"github.com/mahardika-pratama/georesponse-be/internal/resourcehistory"
)

// shutdownTimeout bounds how long graceful shutdown waits for in-flight
// requests to finish before forcing the process to exit.
const shutdownTimeout = 10 * time.Second

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	logger := logging.New(cfg.LogLevel)
	slog.SetDefault(logger)

	ctx := context.Background()

	pool, err := platformpostgres.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("connect to database", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer pool.Close()

	router := internalhttp.New(logger, buildDependencies(pool, cfg))

	srv := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	logger.Info("starting server", slog.String("addr", cfg.Addr()), slog.String("app_env", cfg.AppEnv))

	serverErr := make(chan error, 1)
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
			return
		}
		serverErr <- nil
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErr:
		if err != nil {
			logger.Error("server failed", slog.String("error", err.Error()))
			os.Exit(1)
		}
	case sig := <-stop:
		logger.Info("shutting down", slog.String("signal", sig.String()))

		ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			logger.Error("graceful shutdown failed", slog.String("error", err.Error()))
			os.Exit(1)
		}
	}
}

// buildDependencies constructs every repository, use case, and HTTP
// handler the router needs, all backed by pool.
func buildDependencies(pool *pgxpool.Pool, cfg *config.Config) internalhttp.Dependencies {
	tx := repopostgres.NewTransactor(pool)

	resourceRepo := repopostgres.NewResourceRepository(pool)
	historyRepo := repopostgres.NewResourceHistoryRepository(pool)
	auditRepo := repopostgres.NewAuditRepository(pool)
	roleRepo := repopostgres.NewRoleRepository(pool)
	permissionRepo := repopostgres.NewPermissionRepository(pool)
	userRepo := repopostgres.NewUserRepository(pool)

	authorizationService := authorization.NewService(roleRepo, permissionRepo, auditRepo)
	tokens := auth.NewHMACTokenSigner(cfg.TokenSecret, cfg.TokenTTL)
	authService := auth.NewService(userRepo, auditRepo, tokens, authorizationService)

	validators := resource.NewAttributeValidatorRegistry(
		resource.NewVehicleAttributeValidator(),
		resource.NewFacilityAttributeValidator(),
		resource.NewEquipmentAttributeValidator(),
		resource.NewIoTDeviceAttributeValidator(),
	)
	historyService := resourcehistory.NewService(historyRepo, resourceRepo)
	resourceService := resource.NewService(resourceRepo, historyService, auditRepo, validators, authorizationService, tx)
	auditService := audit.NewService(auditRepo, authorizationService)

	return internalhttp.Dependencies{
		Pool:            pool,
		Tokens:          tokens,
		Users:           userRepo,
		Resource:        internalhttp.NewResourceHandler(resourceService),
		ResourceHistory: internalhttp.NewResourceHistoryHandler(historyService),
		Auth:            internalhttp.NewAuthHandler(authService, cfg.TokenTTL, cfg.AppEnv == "production"),
		Authorization:   internalhttp.NewAuthorizationHandler(authorizationService, authService),
		Audit:           internalhttp.NewAuditHandler(auditService),
	}
}
