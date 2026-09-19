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
// internal/resource/service_test.go

type fakeRepository struct {
    resources map[string]resource.Resource
    histories []resource.LocationHistory
}

func (f *fakeRepository) FindByID(_ context.Context, id string) (*resource.Resource, error) {
    r, ok := f.resources[id]
    if !ok {
        return nil, resource.ErrNotFound
    }
    return &r, nil
}

func (f *fakeRepository) SaveLocationHistory(_ context.Context, h resource.LocationHistory) error {
    f.histories = append(f.histories, h)
    return nil
}

// ... remaining Repository methods

func TestService_Relocate_PreservesIdentityAndStatus(t *testing.T) {
    repo := &fakeRepository{resources: map[string]resource.Resource{
        "resource-001": {ID: "resource-001", Type: resource.TypeVehicle, Status: resource.StatusInUse},
    }}
    svc := resource.NewService(repo)

    got, err := svc.Relocate(context.Background(), "resource-001", resource.Location{Latitude: -6.915, Longitude: 107.6102})
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
    if len(repo.histories) != 1 {
        t.Errorf("expected 1 location history record, got %d", len(repo.histories))
    }
}
```

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
// internal/resource/handler_test.go

func TestHandler_Relocate_InvalidLocation(t *testing.T) {
    svc := resource.NewService(&fakeRepository{ /* ... */ })
    h := resource.NewHandler(svc)

    body := strings.NewReader(`{"latitude": 95.0, "longitude": 107.6}`)
    req := httptest.NewRequest(http.MethodPatch, "/api/v1/resources/resource-001/location", body)
    req = withURLParam(req, "id", "resource-001")
    rec := httptest.NewRecorder()

    h.Relocate(rec, req)

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
scripts/database/migrate.sh   → applies schema to the test database
scripts/database/seed.sh      → optional: seed baseline data for scenarios
                                  that need existing rows
```

```go
// internal/repository/postgres/resource_repository_test.go

func TestResourceRepository_FindByFilters_MatchesTypeAndStatus(t *testing.T) {
    pool := testPool(t) // connects to a disposable test database, migrated via
                         // the same migrations scripts/database/migrate.sh applies

    repo := postgres.NewResourceRepository(pool)
    seedResource(t, pool, resource.Resource{ID: "r1", Type: resource.TypeVehicle, Status: resource.StatusAvailable})
    seedResource(t, pool, resource.Resource{ID: "r2", Type: resource.TypeFacility, Status: resource.StatusAvailable})

    got, err := repo.FindByFilters(context.Background(), resource.Filters{Type: resource.TypeVehicle})
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if len(got) != 1 || got[0].ID != "r1" {
        t.Fatalf("FindByFilters(type=Vehicle) = %v, want only r1", got)
    }
}
```

Guidelines:

- Each test uses an isolated schema/transaction (e.g. wrap in a transaction
  and roll back at the end, or truncate relevant tables in test setup) so
  tests remain independent and repeatable.
- Repository tests are skipped (via `t.Skip` or a build tag, e.g.
  `//go:build integration`) when no test database is configured, so `go test
  ./...` remains runnable without PostgreSQL for quick local iteration; the
  full suite (including repository tests) runs where PostgreSQL is
  available, such as in CI or via `scripts/dev/test.sh`.
- Cover at least: filter combinations (BR-045), PostGIS coordinate
  round-tripping, and the not-found path (`resource.ErrNotFound`).

---

## 7. What Must Be Covered

| Concern | Layer | Example |
|---|---|---|
| Field/enum/coordinate validation | Domain | `TestValidateLocation`, `TestValidateResourceType` |
| Relocation side effects (identity, type, status preserved; history + audit written) | Application | `TestService_Relocate_*` |
| Status-change side effects (history + audit written) | Application | `TestService_ChangeStatus_*` |
| Authorization enforcement | Application / Handler | `TestService_Delete_RequiresPermission` |
| Error → HTTP status/code mapping | Handler | `TestHandler_*_InvalidX` |
| Response envelope shape | Handler | `TestHandler_List_ReturnsEnvelope` |
| Filter/query correctness | Repository | `TestResourceRepository_FindByFilters_*` |
| Not-found propagation | Repository + Application | `TestResourceRepository_FindByID_NotFound` |

---

## 8. Running Tests

```text
go test ./...                     # unit + application tests (repository
                                   # tests self-skip without a test DB)

scripts/dev/test.sh / test.ps1    # project-standard entry point; provisions
                                   # what is needed and runs the full suite,
                                   # including repository tests
```

Refer to `georesponse-be/README.md` for the exact local commands, including
how the test database is provisioned via `scripts/database/migrate.sh`.

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
