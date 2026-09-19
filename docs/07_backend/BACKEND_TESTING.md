# Backend Testing

## 1. Purpose

This document defines the backend testing strategy for `georesponse-be`,
applying `CODING_STANDARDS.md` section 15 ("Backend") and
`TECHNOLOGY_SELECTION.md` section 14.2 (Go `testing`) to the layered
architecture in `BACKEND_ARCHITECTURE.md`.

No additional testing framework (e.g. Testify, Ginkgo) is introduced by
default. Go's standard `testing` package, `httptest`, and table-driven tests
are sufficient for this project's scope, per `TECHNOLOGY_SELECTION.md`
section 14.2: "Additional testing libraries should only be introduced when
they provide a concrete benefit over the standard tooling."

---

## 2. Testing Pyramid for the Backend

```text
                ┌───────────────────────────┐
                │   HTTP Handler Tests       │  httptest, fewer, broader
                │   (request → response)     │
                ├───────────────────────────┤
                │   Application/Use Case     │  most tests live here
                │   Tests (mocked repo)      │
                ├───────────────────────────┤
                │   Domain Tests              │  pure functions, no I/O
                │   (validation, invariants)  │
                └───────────────────────────┘
                ┌───────────────────────────┐
                │   Repository Tests          │  fewer, against real
                │   (real/test PostgreSQL)    │  PostgreSQL + PostGIS
                └───────────────────────────┘
```

Most business-rule coverage belongs in domain and application/use-case
tests, because they are fast, deterministic, and do not require a database.
Repository tests exist to verify that SQL/PostGIS queries actually do what
the repository interface promises — a concern that mocked tests cannot
verify.

---

## 3. Domain Tests

Domain tests exercise pure logic with no infrastructure dependency: no HTTP,
no database, no mocks needed beyond plain Go values.

```go
// internal/resource/location_test.go

func TestValidateLocation(t *testing.T) {
    tests := []struct {
        name    string
        lat     float64
        lng     float64
        wantErr bool
    }{
        {name: "valid coordinates", lat: -6.9147, lng: 107.6098, wantErr: false},
        {name: "latitude above 90", lat: 90.1, lng: 0, wantErr: true},
        {name: "latitude below -90", lat: -90.1, lng: 0, wantErr: true},
        {name: "longitude above 180", lat: 0, lng: 180.1, wantErr: true},
        {name: "longitude below -180", lat: 0, lng: -180.1, wantErr: true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateLocation(tt.lat, tt.lng)
            if (err != nil) != tt.wantErr {
                t.Fatalf("ValidateLocation(%v, %v) error = %v, wantErr %v", tt.lat, tt.lng, err, tt.wantErr)
            }
        })
    }
}
```

Cover, at minimum: resource type/status enum validation (BR-003, BR-006),
coordinate bounds (BR-010), and any type-specific attribute rule.

---

## 4. Application / Use Case Tests

Use-case tests verify business-rule behavior (e.g. relocation side effects,
status-change side effects) against a **fake or mocked repository**, so the
test stays isolated from PostgreSQL:

```go
// internal/resource/service_test.go (abridged — the file also defines
// fakeHistoryRecorder, fakeAuditRepository, fakePermissionChecker, and a
// pass-through TxRunner, one per Service dependency)

type fakeRepository struct {
    resources map[string]resource.Resource
}

func (f *fakeRepository) GetByID(_ context.Context, id string) (*resource.Resource, error) {
    r, ok := f.resources[id]
    if !ok {
        return nil, resource.ErrNotFound
    }
    return &r, nil
}

// ... remaining Repository methods

func TestService_RelocateResource_PreservesIdentityTypeStatus(t *testing.T) {
    repo := &fakeRepository{resources: map[string]resource.Resource{
        "resource-001": {ID: "resource-001", Type: resource.TypeVehicle, Status: resource.StatusInUse},
    }}
    history := &fakeHistoryRecorder{}
    auditRepo := &fakeAuditRepository{}
    svc := newTestService(repo, history, auditRepo, &fakePermissionChecker{})

    got, err := svc.RelocateResource(context.Background(), "user-001", nil, "resource-001", resource.Location{Latitude: -6.915, Longitude: 107.6102})
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    if got.ID != "resource-001" {
        t.Errorf("identity changed: got ID %q", got.ID)
    }
    if got.Type != resource.TypeVehicle {
        t.Errorf("type changed: got %q", got.Type)
    }
    if got.Status != resource.StatusInUse {
        t.Errorf("status changed unexpectedly: got %q", got.Status)
    }
    if history.locationCalls != 1 {
        t.Errorf("RecordLocationChange called %d times, want 1", history.locationCalls)
    }
    if len(auditRepo.records) != 1 || auditRepo.records[0].Operation != audit.OperationResourceRelocated {
        t.Errorf("audit records = %+v, want one RESOURCE_RELOCATED entry", auditRepo.records)
    }
}
```

Because every cross-feature collaborator is a narrow interface declared by
the consumer (`resource.HistoryRecorder`, `resource.PermissionChecker`,
`resource.TxRunner` — `BACKEND_ARCHITECTURE.md` section 3), each can be
faked in a few lines without importing the real implementation.

Required coverage in this layer includes the business rules with observable
side effects:

- relocation preserves identity/type, does not auto-change status, and
  writes a location history + audit record (BR-012, BR-013, BR-014);
- status change writes a status history + audit record (BR-007, BR-008);
- validation failures are rejected before any repository write occurs
  (BR-016, BR-042);
- failed operations do not produce history or audit records (BR-018,
  BR-030, BR-039);
- authorization failures short-circuit before the operation executes
  (BR-026, BR-027).

---

## 5. HTTP Handler Tests

Handler tests use `net/http/httptest` to verify the HTTP boundary: request
decoding, status codes, and the response envelope — using the same fake
repository or a fake service, not a real database.

```go
// internal/http/resource_handler_test.go (fakes shared across handler
// tests live in internal/http/testhelpers_test.go; requests are sent
// through the real router so RequireAuth and Chi URL params are exercised)

func TestResourceHandler_Relocate_InvalidLocation(t *testing.T) {
    f := newResourceTestFixture(t)   // fakes + real router; f.do adds a
                                     // signed auth cookie for f.userID

    rec := f.do(t, http.MethodPatch, "/api/v1/resources/resource-001/location",
        map[string]any{"latitude": 95.0, "longitude": 107.6})

    if rec.Code != http.StatusBadRequest {
        t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
    }

    var resp struct {
        Error struct {
            Code string `json:"code"`
        } `json:"error"`
    }
    if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
        t.Fatalf("decode response: %v", err)
    }
    if resp.Error.Code != "INVALID_LOCATION" {
        t.Errorf("error code = %q, want %q", resp.Error.Code, "INVALID_LOCATION")
    }
}
```

Required coverage: success path returns the correct envelope shape
(`API_CONTRACT.md` section 4), each mapped error condition returns the
correct HTTP status and `error.code` (`BACKEND_ERROR_HANDLING.md` section
6), and route-level authentication/authorization is enforced.

---

## 6. Repository Tests

Repository tests verify the SQL/PostGIS layer actually persists and queries
correctly — something a mock cannot verify. They run against a real
PostgreSQL + PostGIS instance rather than being mocked.

```text
scripts/database/migrate.sh   → applies schema to the database DATABASE_URL
                                  points at (or start the API once with
                                  APP_ENV=development, which auto-migrates)
scripts/database/seed.sh      → optional: seed baseline data for scenarios
                                  that need existing rows
```

```go
// internal/repository/postgres/resource_repository_test.go

func TestResourceRepository_List_Filters(t *testing.T) {
    tx := testTx(t) // testhelpers_test.go: connects to DATABASE_URL, opens a
                    // transaction, rolls it back in t.Cleanup

    repo := NewResourceRepository(tx)
    mustCreate(t, repo, resource.Resource{ID: "r1", Type: resource.TypeVehicle, Status: resource.StatusAvailable, /* ... */})
    mustCreate(t, repo, resource.Resource{ID: "r2", Type: resource.TypeFacility, Status: resource.StatusAvailable, /* ... */})

    vehicle := resource.TypeVehicle
    got, total, err := repo.List(context.Background(), resource.Filters{Type: &vehicle})
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if total != 1 || len(got) != 1 || got[0].ID != "r1" {
        t.Fatalf("List(type=VEHICLE) = %v (total %d), want only r1", got, total)
    }
}
```

Guidelines:

- Each test runs inside its own transaction (`testTx`) that is rolled back
  in `t.Cleanup`, so tests remain independent and repeatable and never
  modify shared seed data. The repositories accept the package's `db`
  interface precisely so a `pgx.Tx` can stand in for the pool here.
- Repository tests self-skip with `t.Skip` when `DATABASE_URL` is unset
  (no build tag), so `go test ./...` remains runnable without PostgreSQL
  for quick local iteration; they run wherever `DATABASE_URL` points at a
  migrated PostGIS database.
- Cover at least: filter combinations (BR-045), PostGIS coordinate
  round-tripping, and the not-found path (`resource.ErrNotFound`).

---

## 7. What Must Be Covered

| Concern | Layer | Example |
|---|---|---|
| Field/enum/coordinate validation | Domain | `TestValidateLocation`, `TestLocation_Validate`, `TestResource_Validate` |
| Relocation side effects (identity, type, status preserved; history + audit written) | Application | `TestService_RelocateResource_*` |
| Status-change side effects (history + audit written) | Application | `TestService_ChangeResourceStatus_*` |
| Authorization enforcement | Application / Handler | `TestService_CreateResource_PermissionDenied` |
| Error → HTTP status/code mapping | Handler | `TestResourceHandler_*_InvalidX`, `TestResourceHandler_Get_NotFound` |
| Response envelope shape | Handler | `TestResourceHandler_List_Success` |
| Filter/query correctness | Repository | `TestResourceRepository_List_Filters` |
| Not-found propagation | Repository + Application | `TestResourceRepository_GetByID_NotFound` |

---

## 8. Running Tests

```text
go test ./...                     # unit + application + handler tests
                                   # (repository tests self-skip without
                                   # DATABASE_URL)

DATABASE_URL=postgres://... go test ./...
                                   # same, plus repository tests against a
                                   # migrated PostGIS database

scripts/dev/test.sh / test.ps1    # project-standard entry point: frontend
                                   # tests, `go test ./...` in georesponse-be,
                                   # and — only when GEORESPONSE_API_URL is
                                   # set — the black-box API suite in
                                   # tests/integration/ against a running
                                   # stack (see tests/README.md)
```

CI (`.github/workflows/ci.yml`) runs `gofmt`, `go vet`, `go build`, and
`go test ./... -cover` without a database, then a separate job starts the
API against a PostGIS service container, loads the seeds, and runs
`tests/integration`. Refer to `georesponse-be/README.md` for the exact
local commands, including how a database is migrated via
`scripts/database/migrate.sh`.

---

## 9. Test Principles

- Tests verify observable behavior and business rules, not implementation
  details (`CODING_STANDARDS.md` section 15).
- Tests are deterministic: no reliance on wall-clock timing, external
  network calls, or test execution order.
- Table-driven style is preferred wherever a function has several input
  variations, per `BACKEND_NAMING.md` section 8.
- Mock or fake only the repository boundary in application/handler tests;
  do not mock the domain itself.

---

## 10. Scope Boundary

This document does not define:

- CI pipeline configuration;
- frontend testing (see `CODING_STANDARDS.md` section 15, "Frontend");
- performance/load testing (out of scope for the current requirements);
- test data seeding content beyond referencing `scripts/database/seed.sh`.

---

## 11. Testing Principle

A test should fail for exactly one reason, and that reason should be a
business rule or contract this project actually promised to keep.

> Prefer a fast, isolated test over a slow, comprehensive one — and add the
> slow one only where isolation would hide a real risk (PostGIS query
> correctness).
