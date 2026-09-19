/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements the authentication use cases (UC-11: Authenticate,

	Logout, GetCurrentUser) and the user-role half of UC-12
	(AssignUserRoles).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package auth

import (
	"context"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/mahardika-pratama/georesponse-be/internal/audit"
	"github.com/mahardika-pratama/georesponse-be/internal/platform/idgen"
)

// Service implements the authentication and user-role-assignment use
// cases.
type Service struct {
	repo   Repository
	audit  audit.Repository
	tokens TokenSigner
}

// NewService constructs a Service.
func NewService(repo Repository, auditRepo audit.Repository, tokens TokenSigner) *Service {
	return &Service{repo: repo, audit: auditRepo, tokens: tokens}
}

// Authenticate validates identifier/password against stored credentials
// and, on success, returns the authenticated user and a token establishing
// their identity for later requests (BR-022 through BR-024, UC-11).
//
// Both "no such user" and "wrong password" return the same
// ErrInvalidCredentials, so a caller cannot use the response to enumerate
// valid identifiers.
func (s *Service) Authenticate(ctx context.Context, identifier, password string) (*User, string, error) {
	creds, err := s.repo.FindCredentialsByIdentifier(ctx, identifier)
	if err != nil {
		return nil, "", fmt.Errorf("authenticate %q: %w", identifier, ErrInvalidCredentials)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(creds.PasswordHash), []byte(password)); err != nil {
		return nil, "", fmt.Errorf("authenticate %q: %w", identifier, ErrInvalidCredentials)
	}

	user, err := s.repo.GetByID(ctx, creds.UserID)
	if err != nil {
		return nil, "", fmt.Errorf("authenticate %q: load user: %w", identifier, err)
	}

	token, err := s.tokens.Sign(user.ID)
	if err != nil {
		return nil, "", fmt.Errorf("authenticate %q: sign token: %w", identifier, err)
	}

	return user, token, nil
}

// Logout ends the authenticated context established by token. Tokens
// issued by TokenSigner are stateless and self-verifying (see token.go),
// so there is no server-side record to delete here; discarding the
// client's copy of the token (e.g. clearing a cookie) is the HTTP layer's
// responsibility.
func (s *Service) Logout(ctx context.Context, token string) error {
	return nil
}

// GetCurrentUser returns the user identified by userID (FR-029). Callers
// are expected to have already verified the caller's token via
// TokenSigner.Verify, typically in HTTP middleware, before calling this.
func (s *Service) GetCurrentUser(ctx context.Context, userID string) (*User, error) {
	return s.repo.GetByID(ctx, userID)
}

// AssignUserRoles replaces the full set of roles held by the user
// identified by userID with roleNames, and records a ROLE_CHANGED audit
// entry (API_CONTRACT.md section 10.5, FR-033, BR-028). actingUserID is
// the authenticated administrator performing the change; it is omitted
// from the audit record when empty.
func (s *Service) AssignUserRoles(ctx context.Context, actingUserID, userID string, roleNames []string) error {
	if err := s.repo.SetRoles(ctx, userID, roleNames); err != nil {
		return fmt.Errorf("assign roles to user %q: %w", userID, err)
	}

	rec := audit.AuditRecord{
		ID:         idgen.New(),
		Operation:  audit.OperationRoleChanged,
		OccurredAt: time.Now().UTC(),
		Details:    map[string]any{"userId": userID, "roles": roleNames},
	}
	if actingUserID != "" {
		rec.UserID = &actingUserID
	}
	if err := s.audit.Insert(ctx, rec); err != nil {
		return fmt.Errorf("assign roles to user %q: record audit: %w", userID, err)
	}

	return nil
}
