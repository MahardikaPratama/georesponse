/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests Service's use cases against hand-written fakes of

	Repository, HistoryRecorder, audit.Repository, PermissionChecker,
	and TxRunner, covering the BR-symmetry (ChangeResourceStatus must
	not modify location), the relocation invariants (RelocateResource
	preserves id/type/status), and that validation failures persist
	nothing (BR-018, BR-030, BR-042).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import (
	"context"
	"errors"
	"testing"

	"github.com/mahardika-pratama/georesponse-be/internal/audit"
)

type fakeRepository struct {
	resources map[string]Resource

	createErr, updateErr, updateStatusErr, updateLocationErr, deleteErr error

	createCalls, updateCalls, updateStatusCalls, updateLocationCalls, deleteCalls int
}

func newFakeRepository() *fakeRepository {
	return &fakeRepository{resources: map[string]Resource{}}
}

func (f *fakeRepository) Create(ctx context.Context, r Resource) error {
	f.createCalls++
	if f.createErr != nil {
		return f.createErr
	}
	if _, exists := f.resources[r.ID]; exists {
		return ErrIDConflict
	}
	f.resources[r.ID] = r
	return nil
}

func (f *fakeRepository) GetByID(ctx context.Context, id string) (*Resource, error) {
	r, ok := f.resources[id]
	if !ok {
		return nil, ErrNotFound
	}
	cp := r
	return &cp, nil
}

func (f *fakeRepository) List(ctx context.Context, filters Filters) ([]Resource, int, error) {
	var out []Resource
	for _, r := range f.resources {
		out = append(out, r)
	}
	return out, len(out), nil
}

func (f *fakeRepository) Update(ctx context.Context, r Resource) error {
	f.updateCalls++
	if f.updateErr != nil {
		return f.updateErr
	}
	if _, ok := f.resources[r.ID]; !ok {
		return ErrNotFound
	}
	f.resources[r.ID] = r
	return nil
}

func (f *fakeRepository) UpdateStatus(ctx context.Context, id string, status Status) error {
	f.updateStatusCalls++
	if f.updateStatusErr != nil {
		return f.updateStatusErr
	}
	r, ok := f.resources[id]
	if !ok {
		return ErrNotFound
	}
	r.Status = status
	f.resources[id] = r
	return nil
}

func (f *fakeRepository) UpdateLocation(ctx context.Context, id string, location Location) error {
	f.updateLocationCalls++
	if f.updateLocationErr != nil {
		return f.updateLocationErr
	}
	r, ok := f.resources[id]
	if !ok {
		return ErrNotFound
	}
	r.Location = location
	f.resources[id] = r
	return nil
}

func (f *fakeRepository) Delete(ctx context.Context, id string) error {
	f.deleteCalls++
	if f.deleteErr != nil {
		return f.deleteErr
	}
	if _, ok := f.resources[id]; !ok {
		return ErrNotFound
	}
	delete(f.resources, id)
	return nil
}

type fakeHistoryRecorder struct {
	statusCalls, locationCalls, changeCalls int
	err                                     error
}

func (f *fakeHistoryRecorder) RecordStatusChange(ctx context.Context, resourceID string, previous, newStatus Status, changedBy *string) error {
	f.statusCalls++
	return f.err
}

func (f *fakeHistoryRecorder) RecordLocationChange(ctx context.Context, resourceID string, previous, newLocation Location, changedBy *string) error {
	f.locationCalls++
	return f.err
}

func (f *fakeHistoryRecorder) RecordChange(ctx context.Context, resourceID string, changes []FieldChange, changedBy *string) error {
	f.changeCalls++
	return f.err
}

type fakeAuditRepository struct {
	records []audit.AuditRecord
	err     error
}

func (f *fakeAuditRepository) Insert(ctx context.Context, r audit.AuditRecord) error {
	if f.err != nil {
		return f.err
	}
	f.records = append(f.records, r)
	return nil
}

func (f *fakeAuditRepository) List(ctx context.Context, filters audit.Filters) ([]audit.AuditRecord, int, error) {
	return f.records, len(f.records), nil
}

type fakePermissionChecker struct {
	denyErr error
}

func (f *fakePermissionChecker) Require(ctx context.Context, roleNames []string, permissionCode string) error {
	return f.denyErr
}

// fakeTxRunner simulates a real transaction's atomicity for the fakes:
// it snapshots fakeRepository and fakeAuditRepository before running fn,
// and restores that snapshot if fn returns an error, so tests can rely on
// "a failure partway through leaves nothing persisted" the same way they
// could against a real database (see
// internal/repository/postgres/transactor_test.go for that against the
// real thing).
type fakeTxRunner struct {
	repo  *fakeRepository
	audit *fakeAuditRepository
}

func (t fakeTxRunner) WithinTx(ctx context.Context, fn func(ctx context.Context) error) error {
	repoSnapshot := make(map[string]Resource, len(t.repo.resources))
	for k, v := range t.repo.resources {
		repoSnapshot[k] = v
	}
	auditSnapshot := append([]audit.AuditRecord(nil), t.audit.records...)

	if err := fn(ctx); err != nil {
		t.repo.resources = repoSnapshot
		t.audit.records = auditSnapshot
		return err
	}
	return nil
}

func newTestService(repo *fakeRepository, history *fakeHistoryRecorder, auditRepo *fakeAuditRepository, checker *fakePermissionChecker) *Service {
	validators := NewAttributeValidatorRegistry(
		NewVehicleAttributeValidator(),
		NewFacilityAttributeValidator(),
		NewEquipmentAttributeValidator(),
		NewIoTDeviceAttributeValidator(),
	)
	return NewService(repo, history, auditRepo, validators, checker, fakeTxRunner{repo: repo, audit: auditRepo})
}

func seedResource() Resource {
	return Resource{
		ID:         "resource-001",
		Name:       "Ambulance Unit 1",
		Type:       TypeVehicle,
		Status:     StatusAvailable,
		Attributes: map[string]any{"vehicleType": "Ambulance", "capacity": 4.0},
		Location:   Location{Latitude: -6.9147, Longitude: 107.6098},
	}
}

func TestService_ChangeResourceStatus_DoesNotModifyLocation(t *testing.T) {
	repo := newFakeRepository()
	seed := seedResource()
	repo.resources[seed.ID] = seed
	history := &fakeHistoryRecorder{}
	auditRepo := &fakeAuditRepository{}
	svc := newTestService(repo, history, auditRepo, &fakePermissionChecker{})

	got, err := svc.ChangeResourceStatus(context.Background(), "user-001", nil, seed.ID, StatusInUse)
	if err != nil {
		t.Fatalf("ChangeResourceStatus() = %v, want nil", err)
	}

	if got.Status != StatusInUse {
		t.Fatalf("Status = %v, want IN_USE", got.Status)
	}
	if got.Location != seed.Location {
		t.Fatalf("Location = %+v, want unchanged %+v (status changes must not move a resource)", got.Location, seed.Location)
	}
	if got.ID != seed.ID || got.Type != seed.Type {
		t.Fatalf("ChangeResourceStatus must not change identity/type, got %+v", got)
	}
	if history.locationCalls != 0 {
		t.Fatalf("RecordLocationChange called %d times, want 0", history.locationCalls)
	}
	if history.statusCalls != 1 {
		t.Fatalf("RecordStatusChange called %d times, want 1", history.statusCalls)
	}
	if len(auditRepo.records) != 1 || auditRepo.records[0].Operation != audit.OperationResourceStatusChanged {
		t.Fatalf("audit records = %+v, want one RESOURCE_STATUS_CHANGED entry", auditRepo.records)
	}
}

func TestService_ChangeResourceStatus_InvalidStatus_NoPersistence(t *testing.T) {
	repo := newFakeRepository()
	seed := seedResource()
	repo.resources[seed.ID] = seed
	history := &fakeHistoryRecorder{}
	auditRepo := &fakeAuditRepository{}
	svc := newTestService(repo, history, auditRepo, &fakePermissionChecker{})

	_, err := svc.ChangeResourceStatus(context.Background(), "user-001", nil, seed.ID, Status("BROKEN"))
	if !errors.Is(err, ErrInvalidStatus) {
		t.Fatalf("ChangeResourceStatus() = %v, want ErrInvalidStatus", err)
	}
	if repo.updateStatusCalls != 0 {
		t.Fatalf("UpdateStatus called %d times, want 0 (BR-018/BR-042: invalid input must not persist)", repo.updateStatusCalls)
	}
	if history.statusCalls != 0 || len(auditRepo.records) != 0 {
		t.Fatalf("history/audit written on validation failure: history=%d audit=%d, want 0/0", history.statusCalls, len(auditRepo.records))
	}
}

func TestService_RelocateResource_PreservesIdentityTypeStatus(t *testing.T) {
	repo := newFakeRepository()
	seed := seedResource()
	seed.Status = StatusInUse
	repo.resources[seed.ID] = seed
	history := &fakeHistoryRecorder{}
	auditRepo := &fakeAuditRepository{}
	svc := newTestService(repo, history, auditRepo, &fakePermissionChecker{})

	newLocation := Location{Latitude: -6.2088, Longitude: 106.8456}
	got, err := svc.RelocateResource(context.Background(), "user-001", nil, seed.ID, newLocation)
	if err != nil {
		t.Fatalf("RelocateResource() = %v, want nil", err)
	}

	if got.Location != newLocation {
		t.Fatalf("Location = %+v, want %+v", got.Location, newLocation)
	}
	// BR-012 / UC-09 invariants: id, type, and status are unchanged.
	if got.ID != seed.ID {
		t.Fatalf("ID = %q, want unchanged %q", got.ID, seed.ID)
	}
	if got.Type != seed.Type {
		t.Fatalf("Type = %v, want unchanged %v", got.Type, seed.Type)
	}
	if got.Status != seed.Status {
		t.Fatalf("Status = %v, want unchanged %v", got.Status, seed.Status)
	}
	if history.locationCalls != 1 {
		t.Fatalf("RecordLocationChange called %d times, want 1", history.locationCalls)
	}
	if len(auditRepo.records) != 1 || auditRepo.records[0].Operation != audit.OperationResourceRelocated {
		t.Fatalf("audit records = %+v, want one RESOURCE_RELOCATED entry", auditRepo.records)
	}
}

func TestService_RelocateResource_InvalidLocation_NoPersistence(t *testing.T) {
	repo := newFakeRepository()
	seed := seedResource()
	repo.resources[seed.ID] = seed
	history := &fakeHistoryRecorder{}
	auditRepo := &fakeAuditRepository{}
	svc := newTestService(repo, history, auditRepo, &fakePermissionChecker{})

	_, err := svc.RelocateResource(context.Background(), "user-001", nil, seed.ID, Location{Latitude: 1000, Longitude: 0})
	if !errors.Is(err, ErrInvalidLocation) {
		t.Fatalf("RelocateResource() = %v, want ErrInvalidLocation", err)
	}
	if repo.updateLocationCalls != 0 {
		t.Fatalf("UpdateLocation called %d times, want 0", repo.updateLocationCalls)
	}
	if history.locationCalls != 0 || len(auditRepo.records) != 0 {
		t.Fatalf("history/audit written on validation failure: history=%d audit=%d, want 0/0", history.locationCalls, len(auditRepo.records))
	}
}

func TestService_CreateResource_ValidationFailure_NoPersistence(t *testing.T) {
	repo := newFakeRepository()
	history := &fakeHistoryRecorder{}
	auditRepo := &fakeAuditRepository{}
	svc := newTestService(repo, history, auditRepo, &fakePermissionChecker{})

	invalid := Resource{ID: "", Name: "No ID", Type: TypeVehicle, Status: StatusAvailable, Location: Location{}}
	_, err := svc.CreateResource(context.Background(), "user-001", nil, invalid)
	if !errors.Is(err, ErrMissingID) {
		t.Fatalf("CreateResource() = %v, want ErrMissingID", err)
	}
	if repo.createCalls != 0 {
		t.Fatalf("Create called %d times, want 0 (BR-018/BR-042)", repo.createCalls)
	}
	if len(auditRepo.records) != 0 {
		t.Fatalf("audit records = %+v, want none", auditRepo.records)
	}
}

func TestService_CreateResource_InvalidAttributes_NoPersistence(t *testing.T) {
	repo := newFakeRepository()
	history := &fakeHistoryRecorder{}
	auditRepo := &fakeAuditRepository{}
	svc := newTestService(repo, history, auditRepo, &fakePermissionChecker{})

	invalid := Resource{
		ID: "resource-002", Name: "Missing Capacity", Type: TypeVehicle, Status: StatusAvailable,
		Attributes: map[string]any{"vehicleType": "Truck"}, // capacity missing (BR-004)
		Location:   Location{},
	}
	_, err := svc.CreateResource(context.Background(), "user-001", nil, invalid)
	if !errors.Is(err, ErrMissingAttribute) {
		t.Fatalf("CreateResource() = %v, want ErrMissingAttribute", err)
	}
	if repo.createCalls != 0 {
		t.Fatalf("Create called %d times, want 0", repo.createCalls)
	}
}

func TestService_CreateResource_PermissionDenied(t *testing.T) {
	repo := newFakeRepository()
	history := &fakeHistoryRecorder{}
	auditRepo := &fakeAuditRepository{}
	svc := newTestService(repo, history, auditRepo, &fakePermissionChecker{denyErr: authErrDenied})

	_, err := svc.CreateResource(context.Background(), "user-001", nil, seedResource())
	if !errors.Is(err, authErrDenied) {
		t.Fatalf("CreateResource() = %v, want the checker's denial error", err)
	}
	if repo.createCalls != 0 {
		t.Fatalf("Create called %d times, want 0 when permission is denied", repo.createCalls)
	}
}

func TestService_DeleteResource_NotFound_NoAudit(t *testing.T) {
	repo := newFakeRepository()
	history := &fakeHistoryRecorder{}
	auditRepo := &fakeAuditRepository{}
	svc := newTestService(repo, history, auditRepo, &fakePermissionChecker{})

	err := svc.DeleteResource(context.Background(), "user-001", nil, "does-not-exist")
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("DeleteResource() = %v, want ErrNotFound", err)
	}
	if len(auditRepo.records) != 0 {
		t.Fatalf("audit records = %+v, want none when the delete itself failed", auditRepo.records)
	}
}

// authErrDenied stands in for authorization.ErrPermissionDenied without
// this test file importing the authorization package, keeping the fake
// checker (and this package's tests) independent of it.
var authErrDenied = errors.New("permission denied (test double)")
