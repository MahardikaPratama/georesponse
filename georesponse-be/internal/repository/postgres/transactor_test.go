/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Integration test proving Transactor actually makes writes

	made through repositories constructed against the same pool atomic:
	a failure partway through WithinTx rolls back every write already
	made inside it, not just the one that failed.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/mahardika-pratama/georesponse-be/internal/resource"
)

// testPool returns a pool for the live database named by DATABASE_URL, or
// skips the test if it is not set. Unlike testTx, this is not itself a
// transaction: it is what Transactor needs to begin its own.
func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	connString := os.Getenv("DATABASE_URL")
	if connString == "" {
		t.Skip("DATABASE_URL not set; skipping PostgreSQL integration test")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, connString)
	if err != nil {
		t.Fatalf("connect to test database: %v", err)
	}
	t.Cleanup(pool.Close)

	return pool
}

func TestTransactor_WithinTx_CommitsOnSuccess(t *testing.T) {
	pool := testPool(t)
	transactor := NewTransactor(pool)
	resources := NewResourceRepository(pool)
	ctx := context.Background()

	res := resource.Resource{
		ID: "test-tx-commit", Name: "R", Type: resource.TypeIoTDevice, Status: resource.StatusAvailable,
		Attributes: map[string]any{"deviceType": "Sensor"}, Location: resource.Location{},
	}
	t.Cleanup(func() { _ = resources.Delete(context.Background(), res.ID) })

	err := transactor.WithinTx(ctx, func(ctx context.Context) error {
		return resources.Create(ctx, res)
	})
	if err != nil {
		t.Fatalf("WithinTx() = %v, want nil", err)
	}

	got, err := resources.GetByID(ctx, res.ID)
	if err != nil {
		t.Fatalf("GetByID() after commit = %v, want nil (the write should be visible)", err)
	}
	if got.ID != res.ID {
		t.Fatalf("GetByID() = %+v, want id %q", got, res.ID)
	}
}

func TestTransactor_WithinTx_RollsBackOnFailure(t *testing.T) {
	pool := testPool(t)
	transactor := NewTransactor(pool)
	resources := NewResourceRepository(pool)
	ctx := context.Background()

	res := resource.Resource{
		ID: "test-tx-rollback", Name: "R", Type: resource.TypeIoTDevice, Status: resource.StatusAvailable,
		Attributes: map[string]any{"deviceType": "Sensor"}, Location: resource.Location{},
	}
	failure := errors.New("deliberate failure after the resource write")

	err := transactor.WithinTx(ctx, func(ctx context.Context) error {
		if err := resources.Create(ctx, res); err != nil {
			return err
		}
		// A second write in the same unit of work fails; the resource
		// write above must not survive the rollback this causes.
		return failure
	})
	if !errors.Is(err, failure) {
		t.Fatalf("WithinTx() = %v, want the deliberate failure", err)
	}

	if _, err := resources.GetByID(ctx, res.ID); !errors.Is(err, resource.ErrNotFound) {
		t.Fatalf("GetByID() after rollback = %v, want ErrNotFound (the write must not have survived)", err)
	}
}
