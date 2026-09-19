/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Package config loads and validates process configuration

	from environment variables. It is the only package
	allowed to read these environment variables directly.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
  - 1.1.0 (2026-09-19): Phase 4 wires a real database connection and
    authentication token signing into cmd/api/main.go, so DATABASE_URL and
    TOKEN_SECRET are now required in every environment, not only
    production. Added TokenSecret and TokenTTL.
  - 1.2.0 (2026-09-19): Added CORSAllowedOrigins so the frontend's origin
    can call the API cross-origin from the browser (SECURITY.md section
    8.1); previously missing, which blocked every browser request.
*/
package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

// defaultHTTPPort is used when HTTP_PORT is not set in the environment.
const defaultHTTPPort = "8080"

// defaultCORSAllowedOrigins is used when CORS_ALLOWED_ORIGINS is not set in
// the environment: the frontend dev server's default origin (rspack.config.js
// devServer.port).
const defaultCORSAllowedOrigins = "http://localhost:5173"

// defaultTokenTTL is used when TOKEN_TTL is not set in the environment.
const defaultTokenTTL = 24 * time.Hour

// Config holds process configuration sourced from environment variables.
// Nothing outside cmd/api/main.go and internal/platform should construct
// configuration from the environment directly.
type Config struct {
	// AppEnv declares which environment the process is running as
	// (e.g. "development", "production").
	AppEnv string

	// HTTPPort is the port the HTTP server listens on.
	HTTPPort string

	// DatabaseURL is the PostgreSQL/PostGIS connection string.
	DatabaseURL string

	// LogLevel is the structured logging verbosity (e.g. "debug", "info").
	LogLevel string

	// TokenSecret signs and verifies authentication tokens
	// (auth.HMACTokenSigner). It must be kept confidential.
	TokenSecret string

	// TokenTTL is how long a signed authentication token remains valid.
	TokenTTL time.Duration

	// CORSAllowedOrigins lists the browser origins allowed to call this
	// API cross-origin (SECURITY.md section 8.1). Never a wildcard.
	CORSAllowedOrigins []string
}

// Addr returns the address the HTTP server should bind to, in
// net/http.ListenAndServe form (":8080").
func (c Config) Addr() string {
	return ":" + c.HTTPPort
}

// Load reads configuration from environment variables and validates it.
// It fails with a descriptive error when a required variable is missing
// or malformed, so the process can fail fast at start-up rather than
// failing unpredictably on the first request.
func Load() (*Config, error) {
	cfg := &Config{
		AppEnv:      getEnvOrDefault("APP_ENV", "development"),
		HTTPPort:    getEnvOrDefault("HTTP_PORT", defaultHTTPPort),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		LogLevel:    getEnvOrDefault("LOG_LEVEL", "info"),
		TokenSecret: os.Getenv("TOKEN_SECRET"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("config: DATABASE_URL is required")
	}
	if cfg.TokenSecret == "" {
		return nil, fmt.Errorf("config: TOKEN_SECRET is required")
	}

	ttlValue := getEnvOrDefault("TOKEN_TTL", defaultTokenTTL.String())
	ttl, err := time.ParseDuration(ttlValue)
	if err != nil {
		return nil, fmt.Errorf("config: TOKEN_TTL %q is not a valid duration: %w", ttlValue, err)
	}
	cfg.TokenTTL = ttl

	origins := getEnvOrDefault("CORS_ALLOWED_ORIGINS", defaultCORSAllowedOrigins)
	for _, origin := range strings.Split(origins, ",") {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			cfg.CORSAllowedOrigins = append(cfg.CORSAllowedOrigins, origin)
		}
	}

	return cfg, nil
}

func getEnvOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
