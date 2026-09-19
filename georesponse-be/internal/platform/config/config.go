// Author       : Mahardika Pratama
// Version      : 1.0.0
// Created Date : 2026-09-19
// Description  : Package config loads and validates process configuration
//
//	from environment variables, per
//	docs/11_devops/ENVIRONMENT_MANAGEMENT.md section 5.2. It is
//	the only package allowed to read these environment
//	variables directly (BACKEND_ARCHITECTURE.md section 4).
//
// Changelog:
// - 1.0.0 (2026-09-19): Initial creation.
package config

import (
	"fmt"
	"os"
)

// defaultHTTPPort is used when HTTP_PORT is not set in the environment.
const defaultHTTPPort = "8080"

// envProduction is the APP_ENV value that requires DATABASE_URL to be set.
// Other environments (e.g. "development") may run without a database while
// the database-backed layers are not yet wired up (Phase 0).
const envProduction = "production"

// Config holds process configuration sourced from environment variables.
// Nothing outside cmd/api/main.go and internal/platform should construct
// configuration from the environment directly.
type Config struct {
	// AppEnv declares which environment the process is running as
	// (e.g. "development", "production").
	AppEnv string

	// HTTPPort is the port the HTTP server listens on.
	HTTPPort string

	// DatabaseURL is the PostgreSQL/PostGIS connection string. It may be
	// empty outside of production while no database is wired up yet.
	DatabaseURL string

	// LogLevel is the structured logging verbosity (e.g. "debug", "info").
	LogLevel string
}

// Addr returns the address the HTTP server should bind to, in
// net/http.ListenAndServe form (":8080").
func (c Config) Addr() string {
	return ":" + c.HTTPPort
}

// Load reads configuration from environment variables and validates it.
// It fails with a descriptive error when a required variable is missing
// for the current environment, so the process can fail fast at start-up
// (docs/11_devops/ENVIRONMENT_MANAGEMENT.md section 8) rather than failing
// unpredictably on the first request.
func Load() (*Config, error) {
	cfg := &Config{
		AppEnv:      getEnvOrDefault("APP_ENV", "development"),
		HTTPPort:    getEnvOrDefault("HTTP_PORT", defaultHTTPPort),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		LogLevel:    getEnvOrDefault("LOG_LEVEL", "info"),
	}

	if cfg.AppEnv == envProduction && cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("config: DATABASE_URL is required when APP_ENV=%s", envProduction)
	}

	return cfg, nil
}

func getEnvOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
