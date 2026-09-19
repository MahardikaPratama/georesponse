/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests the AuditRecord domain type's validation rules

	(BR-036, BR-037).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package audit

import (
	"errors"
	"testing"
	"time"
)

func validRecord() AuditRecord {
	return AuditRecord{
		ID:         "audit-001",
		Operation:  OperationResourceCreated,
		OccurredAt: time.Date(2026, 9, 19, 10, 40, 0, 0, time.UTC),
	}
}

func TestAuditRecord_Validate(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(r AuditRecord) AuditRecord
		wantErr error
	}{
		{
			name:    "valid record",
			mutate:  func(r AuditRecord) AuditRecord { return r },
			wantErr: nil,
		},
		{
			name:    "missing id",
			mutate:  func(r AuditRecord) AuditRecord { r.ID = ""; return r },
			wantErr: ErrMissingID,
		},
		{
			name:    "invalid operation",
			mutate:  func(r AuditRecord) AuditRecord { r.Operation = "RESOURCE_TELEPORTED"; return r },
			wantErr: ErrInvalidOperation,
		},
		{
			name:    "empty operation",
			mutate:  func(r AuditRecord) AuditRecord { r.Operation = ""; return r },
			wantErr: ErrInvalidOperation,
		},
		{
			name:    "missing occurredAt",
			mutate:  func(r AuditRecord) AuditRecord { r.OccurredAt = time.Time{}; return r },
			wantErr: ErrMissingOccurredAt,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.mutate(validRecord()).Validate()
			if tt.wantErr == nil {
				if err != nil {
					t.Fatalf("Validate() = %v, want nil", err)
				}
				return
			}
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Validate() = %v, want error wrapping %v", err, tt.wantErr)
			}
		})
	}
}

func TestOperation_Valid(t *testing.T) {
	tests := []struct {
		name string
		op   Operation
		want bool
	}{
		{name: "resource created", op: OperationResourceCreated, want: true},
		{name: "resource updated", op: OperationResourceUpdated, want: true},
		{name: "resource status changed", op: OperationResourceStatusChanged, want: true},
		{name: "resource relocated", op: OperationResourceRelocated, want: true},
		{name: "resource deleted", op: OperationResourceDeleted, want: true},
		{name: "role changed", op: OperationRoleChanged, want: true},
		{name: "permission changed", op: OperationPermissionChanged, want: true},
		{name: "unrecognized", op: Operation("RESOURCE_TELEPORTED"), want: false},
		{name: "empty", op: Operation(""), want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.op.Valid(); got != tt.want {
				t.Fatalf("Operation(%q).Valid() = %v, want %v", tt.op, got, tt.want)
			}
		})
	}
}
