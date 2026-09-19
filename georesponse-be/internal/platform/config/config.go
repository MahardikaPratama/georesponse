/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Package config loads and validates process configuration

	from environment variables. It is the only package
	allowed to read these environment variables directly.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
  - 1.1.0 (2026-09-19): Wires a real database connection and
    authentication token signing into cmd/api/main.go, so DATABASE_URL and
    TOKEN_SECRET are now required in every environment, not only
    production. Added TokenSecret and TokenTTL.
  - 1.2.0 (2026-09-19): Added CORSAllowedOrigins so the frontend's origin
    can call the API cross-origin from the browser; previously missing,
    which blocked every browser request.
  - 1.3.0 (2026-09-19): Added BMKGBaseURL/BMKGTimeout for the BMKG
    GeoHotspot integration (internal/platform/bmkg).
  - 1.4.0 (2026-09-20): Startup validation now also rejects a malformed
    DATABASE_URL, a non-numeric or out-of-range HTTP_PORT, an unknown
    LOG_LEVEL, a non-positive TOKEN_TTL/BMKG_TIMEOUT, and a non-HTTP
    BMKG_BASE_URL, so misconfiguration fails at process start with a
    descriptive error rather than on the first request. Added
    MigrationsDir/AutoMigrate for apply-pending-migrations-on-startup in
    development.
*/
package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
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

// defaultBMKGBaseURL is BMKG's public GeoHotspot ArcGIS REST layer, used
// when BMKG_BASE_URL is not set in the environment.
const defaultBMKGBaseURL = "https://datacuaca.bmkg.go.id/arcgis/rest/services/production/geohotspot/MapServer/0"

// defaultBMKGTimeout is used when BMKG_TIMEOUT is not set in the
// environment.
const defaultBMKGTimeout = 10 * time.Second

// defaultMigrationsDir is used when MIGRATIONS_DIR is not set in the
// environment: the repository's database/migrations directory, relative to
// the georesponse-be working directory `go run ./cmd/api` is run from.
const defaultMigrationsDir = "../database/migrations"

// envDevelopment is the APP_ENV value under which the server applies
// pending migrations automatically at start-up.
const envDevelopment = "development"

// validLogLevels lists the LOG_LEVEL values internal/platform/logging
// understands.
var validLogLevels = map[string]struct{}{
	"debug": {},
	"info":  {},
	"warn":  {},
	"error": {},
}

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
	// API cross-origin. Never a wildcard.
	CORSAllowedOrigins []string

	// BMKGBaseURL is BMKG's GeoHotspot ArcGIS REST layer base URL, queried
	// by internal/platform/bmkg.Client.
	BMKGBaseURL string

	// BMKGTimeout bounds how long a single BMKG request may take.
	BMKGTimeout time.Duration

	// MigrationsDir is the directory holding the NNNN_*.up.sql migration
	// files applied at start-up when AutoMigrate is set.
	MigrationsDir string

	// AutoMigrate is true when the server should apply pending database
	// migrations before it binds its HTTP port. It is derived from AppEnv:
	// only "development" auto-migrates, so a real deployment keeps
	// migration as an explicit, separate step.
	AutoMigrate bool
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

	if cfg.AppEnv == "" {
		return nil, fmt.Errorf("config: APP_ENV must not be blank")
	}

	if err := validatePort(cfg.HTTPPort); err != nil {
		return nil, err
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("config: DATABASE_URL is required")
	}
	if err := validateDatabaseURL(cfg.DatabaseURL); err != nil {
		return nil, err
	}

	if _, ok := validLogLevels[strings.ToLower(cfg.LogLevel)]; !ok {
		return nil, fmt.Errorf("config: LOG_LEVEL %q is not one of debug, info, warn, error", cfg.LogLevel)
	}

	if cfg.TokenSecret == "" {
		return nil, fmt.Errorf("config: TOKEN_SECRET is required")
	}

	ttlValue := getEnvOrDefault("TOKEN_TTL", defaultTokenTTL.String())
	ttl, err := time.ParseDuration(ttlValue)
	if err != nil {
		return nil, fmt.Errorf("config: TOKEN_TTL %q is not a valid duration: %w", ttlValue, err)
	}
	if ttl <= 0 {
		return nil, fmt.Errorf("config: TOKEN_TTL %q must be a positive duration", ttlValue)
	}
	cfg.TokenTTL = ttl

	origins := getEnvOrDefault("CORS_ALLOWED_ORIGINS", defaultCORSAllowedOrigins)
	for _, origin := range strings.Split(origins, ",") {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			cfg.CORSAllowedOrigins = append(cfg.CORSAllowedOrigins, origin)
		}
	}

	cfg.BMKGBaseURL = getEnvOrDefault("BMKG_BASE_URL", defaultBMKGBaseURL)
	if err := validateHTTPURL("BMKG_BASE_URL", cfg.BMKGBaseURL); err != nil {
		return nil, err
	}

	bmkgTimeoutValue := getEnvOrDefault("BMKG_TIMEOUT", defaultBMKGTimeout.String())
	bmkgTimeout, err := time.ParseDuration(bmkgTimeoutValue)
	if err != nil {
		return nil, fmt.Errorf("config: BMKG_TIMEOUT %q is not a valid duration: %w", bmkgTimeoutValue, err)
	}
	if bmkgTimeout <= 0 {
		return nil, fmt.Errorf("config: BMKG_TIMEOUT %q must be a positive duration", bmkgTimeoutValue)
	}
	cfg.BMKGTimeout = bmkgTimeout

	cfg.MigrationsDir = getEnvOrDefault("MIGRATIONS_DIR", defaultMigrationsDir)
	cfg.AutoMigrate = cfg.AppEnv == envDevelopment
	if cfg.AutoMigrate {
		info, err := os.Stat(cfg.MigrationsDir)
		if err != nil || !info.IsDir() {
			return nil, fmt.Errorf("config: MIGRATIONS_DIR %q is not a readable directory (required when APP_ENV=%s, which applies pending migrations at start-up)", cfg.MigrationsDir, envDevelopment)
		}
	}

	return cfg, nil
}

// validatePort rejects an HTTP_PORT that is not an integer in 1..65535.
func validatePort(port string) error {
	n, err := strconv.Atoi(port)
	if err != nil || n < 1 || n > 65535 {
		return fmt.Errorf("config: HTTP_PORT %q is not a valid TCP port (1-65535)", port)
	}
	return nil
}

// validateDatabaseURL rejects a DATABASE_URL that is not a
// postgres://host/database style connection URL.
func validateDatabaseURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("config: DATABASE_URL is not a valid URL: %w", err)
	}
	if u.Scheme != "postgres" && u.Scheme != "postgresql" {
		return fmt.Errorf("config: DATABASE_URL must use the postgres:// or postgresql:// scheme, got %q", u.Scheme)
	}
	if u.Hostname() == "" {
		return fmt.Errorf("config: DATABASE_URL has no host")
	}
	if strings.Trim(u.Path, "/") == "" {
		return fmt.Errorf("config: DATABASE_URL has no database name")
	}
	return nil
}

// validateHTTPURL rejects a value that is not an absolute http(s) URL.
func validateHTTPURL(name, raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("config: %s is not a valid URL: %w", name, err)
	}
	if (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return fmt.Errorf("config: %s %q must be an absolute http(s) URL", name, raw)
	}
	return nil
}

func getEnvOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
