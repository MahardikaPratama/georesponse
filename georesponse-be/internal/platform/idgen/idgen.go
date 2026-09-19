/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Package idgen generates server-side identifiers for

	records the caller has no natural id to reuse for (history and
	audit records). Resource, role, and permission ids are supplied by
	the caller instead, so this package is not used for those.
	Per BACKEND_DEPENDENCIES.md's guidance, this uses crypto/rand plus
	a small local helper rather than adding a UUID library dependency.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package idgen

import (
	"crypto/rand"
	"fmt"
)

// New returns a random, version-4-UUID-formatted identifier.
func New() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		// crypto/rand.Read only fails if the OS entropy source is
		// unavailable, which is not a condition this process can recover
		// from meaningfully.
		panic(fmt.Errorf("idgen: read random bytes: %w", err))
	}

	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant 10

	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
