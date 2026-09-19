/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Package middleware holds the cross-cutting HTTP concerns

	that make up the request-handling middleware chain: request ID,
	logging, panic recovery, and authentication. Request ID reuses
	Chi's well-tested built-in (go-chi/chi/v5/middleware) rather than
	reimplementing it; Logging, Recovery (recovery.go), and RequireAuth
	(auth.go) are written locally so their output matches this
	backend's structured logging and JSON error envelope.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
  - 1.1.0 (2026-09-19): Replaced the Recovery alias to Chi's built-in
    Recoverer (plain-text body) with a local implementation (recovery.go)
    that emits the same JSON error envelope as every other error. Added
    RequireAuth (auth.go).
*/
package middleware

import (
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

// RequestID assigns a unique ID to each incoming request and makes it
// available via chimiddleware.GetReqID, so a request can be traced through
// server logs. This is Chi's built-in implementation; it satisfies the
// requirement without reimplementing it.
var RequestID = chimiddleware.RequestID
