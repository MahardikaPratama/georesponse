/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests Service's ListAuditRecords use case against a

	hand-written fake Repository and PermissionChecker.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package audit

import (
	"context"
	"errors"
	"testing"
)

type fakeRepository struct {
	records []AuditRecord
}

func (f *fakeRepository) Insert(ctx context.Context, r AuditRecord) error {
	f.records = append(f.records, r)
	return nil
}

func (f *fakeRepository) List(ctx context.Context, filters Filters) ([]AuditRecord, int, error) {
	return f.records, len(f.records), nil
}

type fakePermissionChecker struct {
	denyErr error
}

func (f *fakePermissionChecker) Require(ctx context.Context, roleNames []string, permissionCode string) error {
	return f.denyErr
}

var errDenied = errors.New("permission denied (test double)")

func TestService_ListAuditRecords_Success(t *testing.T) {
	repo := &fakeRepository{records: []AuditRecord{{ID: "audit-1", Operation: OperationResourceCreated}}}
	svc := NewService(repo, &fakePermissionChecker{})

	got, total, err := svc.ListAuditRecords(context.Background(), []string{"admin"}, Filters{Page: 1, PageSize: 20})
	if err != nil {
		t.Fatalf("ListAuditRecords() = %v, want nil", err)
	}
	if total != 1 || len(got) != 1 {
		t.Fatalf("ListAuditRecords() = %+v (total %d), want 1 record", got, total)
	}
}

func TestService_ListAuditRecords_PermissionDenied(t *testing.T) {
	repo := &fakeRepository{records: []AuditRecord{{ID: "audit-1"}}}
	svc := NewService(repo, &fakePermissionChecker{denyErr: errDenied})

	_, _, err := svc.ListAuditRecords(context.Background(), nil, Filters{})
	if !errors.Is(err, errDenied) {
		t.Fatalf("ListAuditRecords() = %v, want the checker's denial error", err)
	}
}
