/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Integration tests for AuditRepository against a real

	PostgreSQL instance.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/mahardika-pratama/georesponse-be/internal/audit"
)

func TestAuditRepository_InsertAndList(t *testing.T) {
	tx := testTx(t)
	repo := NewAuditRepository(tx)
	ctx := context.Background()

	userID := "test-audit-user"
	// audit_records.user_id references users(id); seed a user row so the
	// insert below satisfies that foreign key.
	if _, err := tx.Exec(ctx, "INSERT INTO users (id, name) VALUES ($1, $2)", userID, "Test User"); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	occurredAt := time.Now().UTC().Truncate(time.Second)

	rec := audit.AuditRecord{
		ID: "test-audit-1", Operation: audit.OperationResourceCreated,
		UserID: &userID, OccurredAt: occurredAt, Details: map[string]any{"note": "seed"},
	}
	if err := repo.Insert(ctx, rec); err != nil {
		t.Fatalf("Insert() = %v, want nil", err)
	}

	got, total, err := repo.List(ctx, audit.Filters{UserID: &userID, Page: 1, PageSize: 20})
	if err != nil {
		t.Fatalf("List(userId=...) = %v, want nil", err)
	}
	if total != 1 || len(got) != 1 || got[0].ID != rec.ID {
		t.Fatalf("List(userId=...) = %+v (total %d), want only %q", got, total, rec.ID)
	}
	if got[0].Operation != audit.OperationResourceCreated {
		t.Fatalf("Operation = %v, want RESOURCE_CREATED", got[0].Operation)
	}
	if got[0].Details["note"] != "seed" {
		t.Fatalf("Details = %+v, want note=seed", got[0].Details)
	}

	op := audit.OperationResourceDeleted
	got, total, err = repo.List(ctx, audit.Filters{Operation: &op, Page: 1, PageSize: 20})
	if err != nil {
		t.Fatalf("List(operation=RESOURCE_DELETED) = %v, want nil", err)
	}
	if total != 0 || len(got) != 0 {
		t.Fatalf("List(operation=RESOURCE_DELETED) = %+v (total %d), want no matches", got, total)
	}
}
