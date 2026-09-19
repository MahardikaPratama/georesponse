/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Package logging provides the structured logger setup used

	across the backend, wrapping the standard library's
	log/slog so every layer logs through one consistent,
	leveled, JSON-structured sink. Secrets and credentials
	must never be passed as log attributes.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
*/
package logging

import (
	"context"
	"log/slog"
	"os"
	"strings"
)

// New builds a structured, leveled slog.Logger that writes JSON to stdout.
// level accepts "debug", "info", "warn"/"warning", or "error"
// (case-insensitive); anything else falls back to "info".
func New(level string) *slog.Logger {
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: parseLevel(level),
	})
	return slog.New(handler)
}

// ctxKey is the context key WithContext stores a logger under.
type ctxKey struct{}

// WithContext returns a copy of ctx carrying logger, so it can be
// retrieved later (e.g. inside a handler) via FromContext.
func WithContext(ctx context.Context, logger *slog.Logger) context.Context {
	return context.WithValue(ctx, ctxKey{}, logger)
}

// FromContext returns the logger attached by WithContext, or
// slog.Default() if none was attached (e.g. in a test that doesn't set
// one up).
func FromContext(ctx context.Context) *slog.Logger {
	if logger, ok := ctx.Value(ctxKey{}).(*slog.Logger); ok {
		return logger
	}
	return slog.Default()
}

func parseLevel(level string) slog.Level {
	switch strings.ToLower(level) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
