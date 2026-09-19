/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-20
Description  : Tests for config.Load's start-up validation: a complete,

	well-formed environment loads, and each required or malformed
	variable fails fast with an error naming the variable.

Changelog:
  - 1.0.0 (2026-09-20): Initial creation.
*/
package config

import (
	"strings"
	"testing"
	"time"
)

// validEnv returns a complete, well-formed environment. migrationsDir is
// created by the caller so the APP_ENV=development directory check passes.
func validEnv(migrationsDir string) map[string]string {
	return map[string]string{
		"APP_ENV":              "development",
		"HTTP_PORT":            "8080",
		"DATABASE_URL":         "postgres://georesponse:secret@localhost:5432/georesponse?sslmode=disable",
		"LOG_LEVEL":            "debug",
		"TOKEN_SECRET":         "test-secret",
		"TOKEN_TTL":            "24h",
		"CORS_ALLOWED_ORIGINS": "http://localhost:5173, http://localhost:3000",
		"BMKG_BASE_URL":        "https://example.org/arcgis/rest/services/geohotspot/MapServer/0",
		"BMKG_TIMEOUT":         "10s",
		"MIGRATIONS_DIR":       migrationsDir,
	}
}

func applyEnv(t *testing.T, env map[string]string) {
	t.Helper()
	for key, value := range env {
		t.Setenv(key, value)
	}
}

func TestLoad_ValidEnvironment(t *testing.T) {
	applyEnv(t, validEnv(t.TempDir()))

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v, want nil", err)
	}

	if cfg.Addr() != ":8080" {
		t.Errorf("Addr() = %q, want %q", cfg.Addr(), ":8080")
	}
	if cfg.TokenTTL != 24*time.Hour {
		t.Errorf("TokenTTL = %v, want 24h", cfg.TokenTTL)
	}
	if len(cfg.CORSAllowedOrigins) != 2 || cfg.CORSAllowedOrigins[1] != "http://localhost:3000" {
		t.Errorf("CORSAllowedOrigins = %v, want two trimmed origins", cfg.CORSAllowedOrigins)
	}
	if cfg.BMKGTimeout != 10*time.Second {
		t.Errorf("BMKGTimeout = %v, want 10s", cfg.BMKGTimeout)
	}
	if !cfg.AutoMigrate {
		t.Errorf("AutoMigrate = false, want true for APP_ENV=development")
	}
}

func TestLoad_ProductionDoesNotAutoMigrate(t *testing.T) {
	env := validEnv("/definitely/not/a/directory")
	env["APP_ENV"] = "production"
	applyEnv(t, env)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v, want nil (MIGRATIONS_DIR is not checked outside development)", err)
	}
	if cfg.AutoMigrate {
		t.Errorf("AutoMigrate = true, want false for APP_ENV=production")
	}
}

func TestLoad_FailsFastOnInvalidVariables(t *testing.T) {
	tests := []struct {
		name     string
		override map[string]string
		wantIn   string
	}{
		{name: "missing DATABASE_URL", override: map[string]string{"DATABASE_URL": ""}, wantIn: "DATABASE_URL is required"},
		{name: "DATABASE_URL wrong scheme", override: map[string]string{"DATABASE_URL": "mysql://u:p@localhost:3306/db"}, wantIn: "DATABASE_URL must use the postgres://"},
		{name: "DATABASE_URL without host", override: map[string]string{"DATABASE_URL": "postgres:///georesponse"}, wantIn: "DATABASE_URL has no host"},
		{name: "DATABASE_URL without database", override: map[string]string{"DATABASE_URL": "postgres://u:p@localhost:5432/"}, wantIn: "DATABASE_URL has no database name"},
		{name: "DATABASE_URL not a URL", override: map[string]string{"DATABASE_URL": "not a url at all"}, wantIn: "DATABASE_URL must use the postgres://"},
		{name: "missing TOKEN_SECRET", override: map[string]string{"TOKEN_SECRET": ""}, wantIn: "TOKEN_SECRET is required"},
		{name: "non-numeric HTTP_PORT", override: map[string]string{"HTTP_PORT": "eighty"}, wantIn: "HTTP_PORT"},
		{name: "out-of-range HTTP_PORT", override: map[string]string{"HTTP_PORT": "70000"}, wantIn: "HTTP_PORT"},
		{name: "unknown LOG_LEVEL", override: map[string]string{"LOG_LEVEL": "verbose"}, wantIn: "LOG_LEVEL"},
		{name: "malformed TOKEN_TTL", override: map[string]string{"TOKEN_TTL": "soon"}, wantIn: "TOKEN_TTL"},
		{name: "non-positive TOKEN_TTL", override: map[string]string{"TOKEN_TTL": "0s"}, wantIn: "TOKEN_TTL"},
		{name: "malformed BMKG_TIMEOUT", override: map[string]string{"BMKG_TIMEOUT": "ten"}, wantIn: "BMKG_TIMEOUT"},
		{name: "non-http BMKG_BASE_URL", override: map[string]string{"BMKG_BASE_URL": "ftp://example.org/layer"}, wantIn: "BMKG_BASE_URL"},
		{name: "missing MIGRATIONS_DIR in development", override: map[string]string{"MIGRATIONS_DIR": "/definitely/not/a/directory"}, wantIn: "MIGRATIONS_DIR"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			env := validEnv(t.TempDir())
			for key, value := range tt.override {
				env[key] = value
			}
			applyEnv(t, env)

			cfg, err := Load()
			if err == nil {
				t.Fatalf("Load() = %+v, want error containing %q", cfg, tt.wantIn)
			}
			if !strings.Contains(err.Error(), tt.wantIn) {
				t.Errorf("Load() error = %q, want it to contain %q", err.Error(), tt.wantIn)
			}
		})
	}
}
