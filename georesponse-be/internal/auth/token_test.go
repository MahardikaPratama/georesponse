/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests HMACTokenSigner's sign/verify round-trip, tamper

	rejection, and expiry.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package auth

import (
	"errors"
	"testing"
	"time"
)

func TestHMACTokenSigner_SignAndVerify(t *testing.T) {
	signer := NewHMACTokenSigner("test-secret", time.Hour)

	token, err := signer.Sign("user-001")
	if err != nil {
		t.Fatalf("Sign() = %v, want nil", err)
	}

	userID, err := signer.Verify(token)
	if err != nil {
		t.Fatalf("Verify() = %v, want nil", err)
	}
	if userID != "user-001" {
		t.Fatalf("Verify() = %q, want user-001", userID)
	}
}

func TestHMACTokenSigner_Verify_RejectsTamperedToken(t *testing.T) {
	signer := NewHMACTokenSigner("test-secret", time.Hour)

	token, err := signer.Sign("user-001")
	if err != nil {
		t.Fatalf("Sign() = %v, want nil", err)
	}

	tampered := token + "x"
	if _, err := signer.Verify(tampered); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("Verify(tampered) = %v, want ErrInvalidToken", err)
	}
}

func TestHMACTokenSigner_Verify_RejectsWrongSecret(t *testing.T) {
	token, err := NewHMACTokenSigner("secret-a", time.Hour).Sign("user-001")
	if err != nil {
		t.Fatalf("Sign() = %v, want nil", err)
	}

	if _, err := NewHMACTokenSigner("secret-b", time.Hour).Verify(token); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("Verify() with wrong secret = %v, want ErrInvalidToken", err)
	}
}

func TestHMACTokenSigner_Verify_RejectsExpiredToken(t *testing.T) {
	signer := NewHMACTokenSigner("test-secret", -time.Second) // already expired

	token, err := signer.Sign("user-001")
	if err != nil {
		t.Fatalf("Sign() = %v, want nil", err)
	}

	if _, err := signer.Verify(token); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("Verify(expired) = %v, want ErrInvalidToken", err)
	}
}

func TestHMACTokenSigner_Verify_RejectsGarbage(t *testing.T) {
	signer := NewHMACTokenSigner("test-secret", time.Hour)

	if _, err := signer.Verify("not a valid token"); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("Verify(garbage) = %v, want ErrInvalidToken", err)
	}
}
