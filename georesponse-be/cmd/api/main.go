// Author       : Mahardika Pratama
// Version      : 1.0.0
// Created Date : 2026-09-19
// Description  : Process entry point for the georesponse-be API server.
//
//	Loads configuration, builds the structured logger, wires
//	the router, and starts the HTTP server with graceful
//	shutdown on SIGINT/SIGTERM
//	(docs/07_backend/BACKEND_ARCHITECTURE.md section 4).
//	Phase 0: no database connection or feature handlers are
//	wired yet; those are added here as later phases implement
//	them.
//
// Changelog:
//   - 1.0.0 (2026-09-19): Initial creation. Phase 0 bootstrap: config,
//     logging, router with /health only.
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

	internalhttp "github.com/mahardika-pratama/georesponse-be/internal/http"
	"github.com/mahardika-pratama/georesponse-be/internal/platform/config"
	"github.com/mahardika-pratama/georesponse-be/internal/platform/logging"
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

	router := internalhttp.New(logger, internalhttp.Dependencies{})

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
