/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements RequireAuth, the authentication middleware

	(BR-022, BR-023). It lives here, in internal/http/middleware, rather
	than in internal/auth as an illustrative package layout might
	otherwise suggest: internal/http/httpresponse.WriteError already
	needs to import internal/auth's sentinel errors to translate them,
	so internal/auth importing internal/http/httpresponse back (which
	RequireAuth needs, to report a rejected request) would be an import
	cycle. Placing it alongside the other cross-cutting HTTP middleware
	avoids that while keeping the same dependency direction
	(HTTP -> use case -> domain) the project requires.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package middleware

import (
	"context"
	"fmt"
	"net/http"

	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/http/httpresponse"
)

// AuthCookieName is the cookie RequireAuth reads the token from, and the
// one the login handler sets on success. An HttpOnly, Secure, SameSite=Lax
// cookie was chosen over returning the token in the response body, so the
// frontend never handles the token directly and it cannot be read by
// injected client-side script (the transport was left undecided
// elsewhere; this is the implementation decision).
const AuthCookieName = "georesponse_token"

// authContextKey is the context key AuthContext is stored under.
type authContextKey struct{}

// AuthContext is the identity RequireAuth establishes for an authenticated
// request (BR-023).
type AuthContext struct {
	UserID    string
	RoleNames []string
}

// AuthFromContext returns the AuthContext RequireAuth attached to ctx, if
// the request passed through it.
func AuthFromContext(ctx context.Context) (AuthContext, bool) {
	ac, ok := ctx.Value(authContextKey{}).(AuthContext)
	return ac, ok
}

// RequireAuth returns middleware that rejects a request with no valid
// auth cookie (401 AUTHENTICATION_FAILED, BR-022, BR-024) and otherwise
// attaches the authenticated user's id and role names to the request
// context (BR-023) before calling next.
func RequireAuth(tokens auth.TokenSigner, users auth.Repository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(AuthCookieName)
			if err != nil {
				httpresponse.WriteError(w, r, fmt.Errorf("missing auth cookie: %w", auth.ErrInvalidToken))
				return
			}

			userID, err := tokens.Verify(cookie.Value)
			if err != nil {
				httpresponse.WriteError(w, r, err)
				return
			}

			user, err := users.GetByID(r.Context(), userID)
			if err != nil {
				httpresponse.WriteError(w, r, fmt.Errorf("load authenticated user %q: %w", userID, auth.ErrInvalidToken))
				return
			}

			ctx := context.WithValue(r.Context(), authContextKey{}, AuthContext{UserID: user.ID, RoleNames: user.RoleNames})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
