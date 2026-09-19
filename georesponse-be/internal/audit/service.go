/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements the ListAuditRecords use case (UC-14, FR-038

	through FR-040), restricted to callers holding PermissionAuditRead.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package audit

import "context"

// PermissionAuditRead is the permission code required to view the audit
// trail. The exact code is an implementation decision (BUSINESS_RULES.md
// does not fix a concrete permission set).
const PermissionAuditRead = "audit.read"

// PermissionChecker enforces that the caller holds a given permission
// (implemented by authorization.Service; declared here, not imported,
// to avoid an audit -> authorization dependency cycle, since
// authorization.Service itself depends on audit.Repository to record
// role/permission changes).
type PermissionChecker interface {
	Require(ctx context.Context, roleNames []string, permissionCode string) error
}

// Service implements the audit trail's read use case.
type Service struct {
	repo    Repository
	checker PermissionChecker
}

// NewService constructs a Service.
func NewService(repo Repository, checker PermissionChecker) *Service {
	return &Service{repo: repo, checker: checker}
}

// ListAuditRecords returns the audit records matching f, restricted to
// callers holding PermissionAuditRead (FR-038 through FR-040, UC-14).
func (s *Service) ListAuditRecords(ctx context.Context, actingRoleNames []string, f Filters) ([]AuditRecord, int, error) {
	if err := s.checker.Require(ctx, actingRoleNames, PermissionAuditRead); err != nil {
		return nil, 0, err
	}
	return s.repo.List(ctx, f)
}
