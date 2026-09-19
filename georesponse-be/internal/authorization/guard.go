/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements the permission-enforcement guard every protected

	use case calls before performing its operation (FR-031, FR-032,
	BR-026, BR-027). Enforcement lives here, at the use-case layer, not
	only in the frontend (BR-026) and not only as HTTP middleware, so it
	applies uniformly regardless of which client calls the API
	(BR-027).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package authorization

import (
	"context"
	"fmt"
)

// HasPermission reports whether any of roleNames grants permissionCode,
// by loading every role and checking each one the caller holds.
func (s *Service) HasPermission(ctx context.Context, roleNames []string, permissionCode string) (bool, error) {
	roles, err := s.roles.List(ctx)
	if err != nil {
		return false, fmt.Errorf("check permission %q: %w", permissionCode, err)
	}

	held := make(map[string]bool, len(roleNames))
	for _, name := range roleNames {
		held[name] = true
	}

	for _, role := range roles {
		if !held[role.Name] {
			continue
		}
		for _, code := range role.Permissions {
			if code == permissionCode {
				return true, nil
			}
		}
	}

	return false, nil
}

// Require returns ErrPermissionDenied if none of roleNames grants
// permissionCode. Every protected use case (in any feature package) calls
// this before performing its operation.
func (s *Service) Require(ctx context.Context, roleNames []string, permissionCode string) error {
	ok, err := s.HasPermission(ctx, roleNames, permissionCode)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("permission %q: %w", permissionCode, ErrPermissionDenied)
	}
	return nil
}
