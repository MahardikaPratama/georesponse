/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Package logging provides the structured logger setup used

	across the backend, wrapping the standard library's
	log/slog so every layer logs through one consistent,
	leveled, JSON-structured sink (docs/05_engineering/
	OBSERVABILITY.md). Secrets and credentials must never be
	passed as log attributes.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
*/
package logging

import (
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
