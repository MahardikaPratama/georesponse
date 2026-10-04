# Backend Testing

## 1. Purpose

This document describes how `georesponse-be` is tested at each layer of the
architecture in `BACKEND_ARCHITECTURE.md`. The overall strategy and the
"must always be tested" list are owned by
`docs/05_engineering/TESTING_STRATEGY.md`; the frontend counterpart is
`docs/06_frontend/FRONTEND_TESTING.md`; the cross-application integration
and end-to-end suites are documented in `tests/README.md`. Performance and
load testing are out of scope for the current requirements.

Tests use Go's standard `testing` package, `httptest`, and table-driven
tests. No additional framework (Testify, Ginkgo) is used;
`TECHNOLOGY_SELECTION.md` section 14 allows one only when it gives a
concrete benefit over the standard tooling.

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
Repository tests exist to verify that SQL/PostGIS queries do what the
repository interface promises, which a mocked test cannot show.

---

## 3. Domain Tests

Domain tests exercise pure logic with no infrastructure dependency: no HTTP,
no database, no mocks needed beyond plain Go values.

```go
// internal/resource/location_test.go (abridged: the real table also
// covers the exact boundary values)

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
            if err != nil && !errors.Is(err, ErrInvalidLocation) {
                t.Fatalf("ValidateLocation(%v, %v) error = %v, want it to wrap ErrInvalidLocation", tt.lat, tt.lng, err)
            }
        })
    }
}
```

Cover, at minimum: resource type/status enum validation (BR-003, BR-006),
coordinate bounds (BR-010), and every type-specific attribute rule.

---

## 4. Application / Use Case Tests

Use-case tests verify business-rule behavior (e.g. relocation side effects,
status-change side effects) against a **fake or mocked repository**, so the
test stays isolated from PostgreSQL:

```go
// internal/resource/service_test.go (package resource; abridged: the file
// also defines fakeRepository, fakeHistoryRecorder, fakeAuditRepository,
// fakePermissionChecker, and a pass-through fakeTxRunner)

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

    if got.ID != seed.ID || got.Type != seed.Type || got.Status != seed.Status {
        t.Fatalf("got %+v, want id, type, and status unchanged from %+v", got, seed)
    }
    if history.locationCalls != 1 {
        t.Fatalf("RecordLocationChange called %d times, want 1", history.locationCalls)
    }
    if len(auditRepo.records) != 1 || auditRepo.records[0].Operation != audit.OperationResourceRelocated {
        t.Fatalf("audit records = %+v, want one RESOURCE_RELOCATED entry", auditRepo.records)
    }
}
```

Because every cross-feature collaborator is a narrow interface declared by
the consumer (`resource.HistoryRecorder`, `resource.PermissionChecker`,
`resource.TxRunner`; see `BACKEND_ARCHITECTURE.md` section 3), each can be
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
decoding, status codes, and the response envelope, using fakes rather than
a real database.

```go
// internal/http/resource_handler_test.go (fakes shared across handler
// tests live in internal/http/testhelpers_test.go; requests are sent
// through the real router so RequireAuth and Chi URL params are exercised)

func TestResourceHandler_Relocate_InvalidLocation(t *testing.T) {
    f := newResourceTestFixture(t) // fakes + real router; f.do adds a
                                   // signed auth cookie for the test user

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

Repository tests verify that the SQL/PostGIS layer persists and queries
correctly. They run against a real PostgreSQL + PostGIS database that has
the migrations applied (`scripts/database/migrate.sh`, or start the API
once with `APP_ENV=development`, which auto-migrates). Seeds are optional.

```go
// internal/repository/postgres/resource_repository_test.go (abridged)

func TestResourceRepository_List_Filters(t *testing.T) {
    repo := NewResourceRepository(testTx(t)) // testhelpers_test.go: connects
                                             // to DATABASE_URL, opens a
                                             // transaction, rolls it back in
                                             // t.Cleanup
    ctx := context.Background()

    // Rows carry a "zztest" name marker so seed data can never satisfy
    // an assertion.
    // ... repo.Create for a VEHICLE, a FACILITY, and an EQUIPMENT row

    marker := "zztest"
    vehicleType := resource.TypeVehicle
    got, total, err := repo.List(ctx, resource.Filters{Search: &marker, Type: &vehicleType, Page: 1, PageSize: 20})
    if err != nil {
        t.Fatalf("List(search=zztest, type=Vehicle) = %v, want nil", err)
    }
    if total != 1 || len(got) != 1 || got[0].ID != "test-list-1" {
        t.Fatalf("List(search=zztest, type=Vehicle) = %+v (total %d), want only test-list-1", got, total)
    }
}
```

Guidelines:

- Each test runs inside its own transaction (`testTx`) that is rolled back
  in `t.Cleanup`, so tests are independent, repeatable, and never modify
  shared seed data. Repositories accept the package's `db` interface so a
  `pgx.Tx` can stand in for the pool.
- Repository tests call `t.Skip` when `DATABASE_URL` is unset (no build
  tag), so `go test ./...` runs without PostgreSQL. The migration-runner
  test in `internal/platform/postgres` reads `TEST_DATABASE_URL` instead.
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
go test ./...                     # domain, application, and handler tests
                                  # (repository tests self-skip without
                                  # DATABASE_URL)

DATABASE_URL=postgres://... go test ./...
                                  # same, plus repository tests against a
                                  # migrated PostGIS database
```

`scripts/dev/test.sh` / `test.ps1` is the project-wide entry point. The
black-box API suite in `tests/integration/` and how CI runs it are
documented in `tests/README.md` and `docs/11_devops/CI_CD.md`.

---

## 9. Test Principles

- Tests verify observable behavior and business rules, not implementation
  details.
- Tests are deterministic: no reliance on wall-clock timing, external
  network calls, or test execution order.
- Table-driven style is preferred wherever a function has several input
  variations (naming in `BACKEND_NAMING.md` section 8).
- Fake only the boundaries (repositories and cross-feature collaborators)
  in application and handler tests; do not fake the domain itself.
