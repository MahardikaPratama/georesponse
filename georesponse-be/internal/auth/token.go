/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines TokenSigner, the authenticated-context mechanism

	Authenticate establishes (BR-023), and HMACTokenSigner, a stateless
	implementation. The exact token/session mechanism is left as an
	implementation decision; a self-verifying signed token was chosen
	over a server-side session table so no new session-storage schema
	is needed for this MVP.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"strconv"
	"strings"
	"time"
)

// ErrInvalidToken reports that a token failed verification: it is
// malformed, its signature does not match, or it has expired.
var ErrInvalidToken = errors.New("auth: invalid or expired token")

// TokenSigner issues and verifies the token Authenticate returns to
// establish an authenticated context (BR-023), and later requests present
// to prove it (FR-029). Its concrete format is deliberately hidden behind
// this interface, since no format is fixed elsewhere.
type TokenSigner interface {
	// Sign returns a new token asserting userID's identity.
	Sign(userID string) (string, error)
	// Verify returns the userID asserted by token, or ErrInvalidToken if
	// token is malformed, unsigned by this signer, or expired.
	Verify(token string) (userID string, err error)
}

// HMACTokenSigner is a stateless TokenSigner: a token is the user id and
// an expiry timestamp, authenticated with an HMAC-SHA256 signature over a
// server-side secret. Verifying a token requires no database lookup or
// server-side session record.
type HMACTokenSigner struct {
	secret []byte
	ttl    time.Duration
}

// NewHMACTokenSigner constructs an HMACTokenSigner. secret must be kept
// confidential: anyone holding it can mint tokens for any user id. ttl is
// how long a signed token remains valid.
func NewHMACTokenSigner(secret string, ttl time.Duration) *HMACTokenSigner {
	return &HMACTokenSigner{secret: []byte(secret), ttl: ttl}
}

// Sign returns a new token asserting userID's identity, valid for this
// signer's configured ttl.
func (s *HMACTokenSigner) Sign(userID string) (string, error) {
	expiresAt := time.Now().Add(s.ttl).Unix()
	payload := userID + "." + strconv.FormatInt(expiresAt, 10)
	signed := payload + "." + s.sign(payload)
	return base64.RawURLEncoding.EncodeToString([]byte(signed)), nil
}

// Verify returns the userID asserted by token if its signature is valid
// and it has not expired.
func (s *HMACTokenSigner) Verify(token string) (string, error) {
	raw, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return "", ErrInvalidToken
	}

	parts := strings.SplitN(string(raw), ".", 3)
	if len(parts) != 3 {
		return "", ErrInvalidToken
	}
	userID, expiresAtStr, signature := parts[0], parts[1], parts[2]

	payload := userID + "." + expiresAtStr
	if !hmac.Equal([]byte(signature), []byte(s.sign(payload))) {
		return "", ErrInvalidToken
	}

	expiresAt, err := strconv.ParseInt(expiresAtStr, 10, 64)
	if err != nil {
		return "", ErrInvalidToken
	}
	if time.Now().Unix() > expiresAt {
		return "", ErrInvalidToken
	}

	return userID, nil
}

// sign computes the HMAC-SHA256 of payload under s.secret, base64-encoded.
func (s *HMACTokenSigner) sign(payload string) string {
	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
