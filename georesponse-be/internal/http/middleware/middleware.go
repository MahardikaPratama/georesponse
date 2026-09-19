/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Package middleware holds the cross-cutting HTTP concerns

	that make up the request-handling middleware chain:
	request ID, logging, and panic recovery. Request ID and
	panic recovery reuse Chi's well-tested built-ins
	(go-chi/chi/v5/middleware) rather than reimplementing
	them; Logging is a thin local wrapper around
	internal/platform/logging so log lines are structured and
	consistent with the rest of the backend.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
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

// Recovery converts an unexpected panic in a handler into a 500 response
// instead of crashing the process. This is Chi's built-in Recoverer.
var Recovery = chimiddleware.Recoverer
