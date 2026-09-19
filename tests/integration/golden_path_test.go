/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-20
Description  : Black-box integration test for the resource lifecycle

	against a real, running backend + database: log in, create →
	read → update → change status → relocate → read history → delete →
	confirm gone, checking after every step that what the API persisted
	matches what it returned. Also covers the documented error contract
	for the main failure paths (unauthenticated, invalid input, unknown
	id, duplicate id) and, when the read-only demo account is seeded,
	authorization denial.

	Configuration:
	  GEORESPONSE_API_URL   base URL of the running backend, e.g.
	                        http://localhost:8080 (required; the test is
	                        skipped when unset)
	  GEORESPONSE_ADMIN_ID / GEORESPONSE_ADMIN_PASSWORD
	                        administrator login (default: the seeded
	                        user-001 / ChangeMe123!)
	  GEORESPONSE_READONLY_ID / GEORESPONSE_READONLY_PASSWORD
	                        read-only login (default: the seeded
	                        user-002 / ChangeMe123!); the authorization
	                        sub-test is skipped if this login fails

Changelog:
  - 1.0.0 (2026-09-20): Initial creation.
*/
package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"os"
	"strings"
	"testing"
	"time"
)

// --- Wire shapes (mirroring API_CONTRACT.md) ---

type location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type resource struct {
	ID         string         `json:"id"`
	Name       string         `json:"name"`
	Type       string         `json:"type"`
	Status     string         `json:"status"`
	Attributes map[string]any `json:"attributes"`
	Location   location       `json:"location"`
}

type dataEnvelope[T any] struct {
	Data T `json:"data"`
}

type listEnvelope struct {
	Data []resource `json:"data"`
	Meta struct {
		Page     int `json:"page"`
		PageSize int `json:"pageSize"`
		Total    int `json:"total"`
	} `json:"meta"`
}

type errorEnvelope struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
		Details any    `json:"details"`
	} `json:"error"`
}

type history struct {
	StatusHistory []struct {
		PreviousStatus string `json:"previousStatus"`
		NewStatus      string `json:"newStatus"`
	} `json:"statusHistory"`
	LocationHistory []struct {
		PreviousLocation location `json:"previousLocation"`
		NewLocation      location `json:"newLocation"`
	} `json:"locationHistory"`
	ChangeHistory []struct {
		Changes []struct {
			Field  string `json:"field"`
			Before any    `json:"before"`
			After  any    `json:"after"`
		} `json:"changes"`
	} `json:"changeHistory"`
}

// --- Test client ---

type apiClient struct {
	t       *testing.T
	baseURL string
	http    *http.Client
}

func newClient(t *testing.T, baseURL string) *apiClient {
	t.Helper()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookie jar: %v", err)
	}
	return &apiClient{
		t:       t,
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Jar: jar, Timeout: 15 * time.Second},
	}
}

// do sends a JSON request and returns the status code and raw body.
func (c *apiClient) do(method, path string, body any) (int, []byte) {
	c.t.Helper()
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			c.t.Fatalf("marshal %s %s body: %v", method, path, err)
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequest(method, c.baseURL+path, reader)
	if err != nil {
		c.t.Fatalf("build %s %s: %v", method, path, err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		c.t.Fatalf("%s %s: %v", method, path, err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		c.t.Fatalf("read %s %s response: %v", method, path, err)
	}
	return resp.StatusCode, raw
}

func decode[T any](t *testing.T, raw []byte, into *T) {
	t.Helper()
	if err := json.Unmarshal(raw, into); err != nil {
		t.Fatalf("decode response %s: %v", string(raw), err)
	}
}

func expectStatus(t *testing.T, got, want int, raw []byte, what string) {
	t.Helper()
	if got != want {
		t.Fatalf("%s: status = %d, want %d; body: %s", what, got, want, string(raw))
	}
}

func expectErrorCode(t *testing.T, raw []byte, want string, what string) {
	t.Helper()
	var env errorEnvelope
	decode(t, raw, &env)
	if env.Error.Code != want {
		t.Fatalf("%s: error.code = %q, want %q; body: %s", what, env.Error.Code, want, string(raw))
	}
	if env.Error.Message == "" {
		t.Errorf("%s: error.message is empty", what)
	}
}

func (c *apiClient) login(id, password string) (int, []byte) {
	return c.do(http.MethodPost, "/api/v1/auth/login", map[string]string{"identifier": id, "password": password})
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func baseURL(t *testing.T) string {
	t.Helper()
	url := os.Getenv("GEORESPONSE_API_URL")
	if url == "" {
		t.Skip("GEORESPONSE_API_URL not set; skipping integration test (needs a running backend + database)")
	}
	return url
}

func waitForHealth(t *testing.T, base string) {
	t.Helper()
	client := &http.Client{Timeout: 3 * time.Second}
	deadline := time.Now().Add(60 * time.Second)
	for {
		resp, err := client.Get(strings.TrimRight(base, "/") + "/health")
		if err == nil {
			raw, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK && strings.Contains(string(raw), `"database":"ok"`) {
				return
			}
		}
		if time.Now().After(deadline) {
			t.Fatalf("backend at %s did not become healthy within 60s (last error: %v)", base, err)
		}
		time.Sleep(time.Second)
	}
}

// --- Tests ---

func TestGoldenPath_CreateUpdateRelocateDelete(t *testing.T) {
	base := baseURL(t)
	waitForHealth(t, base)

	admin := newClient(t, base)
	status, raw := admin.login(envOrDefault("GEORESPONSE_ADMIN_ID", "user-001"), envOrDefault("GEORESPONSE_ADMIN_PASSWORD", "ChangeMe123!"))
	expectStatus(t, status, http.StatusOK, raw, "admin login")

	id := fmt.Sprintf("it-resource-%d", time.Now().UnixNano())
	// Always clean up, even if an assertion fails half-way.
	t.Cleanup(func() { admin.do(http.MethodDelete, "/api/v1/resources/"+id, nil) })

	// 1. Create
	created := resource{
		ID: id, Name: "Integration Ambulance", Type: "VEHICLE", Status: "AVAILABLE",
		Attributes: map[string]any{"vehicleType": "Ambulance", "capacity": 4},
		Location:   location{Latitude: -6.2088, Longitude: 106.8456},
	}
	status, raw = admin.do(http.MethodPost, "/api/v1/resources", created)
	expectStatus(t, status, http.StatusCreated, raw, "create")
	var createResp dataEnvelope[resource]
	decode(t, raw, &createResp)
	if createResp.Data.ID != id || createResp.Data.Name != created.Name || createResp.Data.Type != "VEHICLE" || createResp.Data.Status != "AVAILABLE" {
		t.Fatalf("create: response %+v does not echo the request", createResp.Data)
	}

	// 2. Read back — the persisted row must match the create response.
	status, raw = admin.do(http.MethodGet, "/api/v1/resources/"+id, nil)
	expectStatus(t, status, http.StatusOK, raw, "get after create")
	var got dataEnvelope[resource]
	decode(t, raw, &got)
	if got.Data.Location != created.Location || got.Data.Attributes["vehicleType"] != "Ambulance" {
		t.Fatalf("get after create: persisted %+v, want %+v", got.Data, created)
	}

	// It must also be visible in the list (searched by name).
	status, raw = admin.do(http.MethodGet, "/api/v1/resources?search=Integration+Ambulance&pageSize=50", nil)
	expectStatus(t, status, http.StatusOK, raw, "list")
	var list listEnvelope
	decode(t, raw, &list)
	found := false
	for _, r := range list.Data {
		if r.ID == id {
			found = true
		}
	}
	if !found || list.Meta.Total < 1 {
		t.Fatalf("list: created resource %s not found in %+v", id, list)
	}

	// 3. Update name + attributes (type stays VEHICLE, location/status untouched).
	status, raw = admin.do(http.MethodPut, "/api/v1/resources/"+id, map[string]any{
		"name": "Integration Ambulance (renamed)", "type": "VEHICLE",
		"attributes": map[string]any{"vehicleType": "Ambulance", "capacity": 6},
	})
	expectStatus(t, status, http.StatusOK, raw, "update")
	decode(t, raw, &got)
	if got.Data.Name != "Integration Ambulance (renamed)" || got.Data.Attributes["capacity"] != float64(6) {
		t.Fatalf("update: response %+v did not apply the change", got.Data)
	}
	if got.Data.Location != created.Location || got.Data.Status != "AVAILABLE" {
		t.Fatalf("update: must not touch location/status, got %+v", got.Data)
	}

	// 4. Change status (side effect: status history written).
	status, raw = admin.do(http.MethodPatch, "/api/v1/resources/"+id+"/status", map[string]string{"status": "IN_USE"})
	expectStatus(t, status, http.StatusOK, raw, "change status")
	decode(t, raw, &got)
	if got.Data.Status != "IN_USE" {
		t.Fatalf("change status: status = %q, want IN_USE", got.Data.Status)
	}

	// 5. Relocate (side effect: location history written; status unchanged).
	newLoc := location{Latitude: -6.9175, Longitude: 107.6191}
	status, raw = admin.do(http.MethodPatch, "/api/v1/resources/"+id+"/location", newLoc)
	expectStatus(t, status, http.StatusOK, raw, "relocate")
	decode(t, raw, &got)
	if got.Data.Location != newLoc {
		t.Fatalf("relocate: location = %+v, want %+v", got.Data.Location, newLoc)
	}
	if got.Data.Status != "IN_USE" || got.Data.ID != id || got.Data.Type != "VEHICLE" {
		t.Fatalf("relocate: must not change status/identity/type, got %+v", got.Data)
	}

	// Persisted state after relocation.
	status, raw = admin.do(http.MethodGet, "/api/v1/resources/"+id, nil)
	expectStatus(t, status, http.StatusOK, raw, "get after relocate")
	decode(t, raw, &got)
	if got.Data.Location != newLoc || got.Data.Status != "IN_USE" {
		t.Fatalf("get after relocate: persisted %+v", got.Data)
	}

	// 6. History reflects every side effect above.
	status, raw = admin.do(http.MethodGet, "/api/v1/resources/"+id+"/history", nil)
	expectStatus(t, status, http.StatusOK, raw, "history")
	var hist dataEnvelope[history]
	decode(t, raw, &hist)
	if len(hist.Data.StatusHistory) != 1 || hist.Data.StatusHistory[0].PreviousStatus != "AVAILABLE" || hist.Data.StatusHistory[0].NewStatus != "IN_USE" {
		t.Errorf("history: statusHistory = %+v, want one AVAILABLE→IN_USE entry", hist.Data.StatusHistory)
	}
	if len(hist.Data.LocationHistory) != 1 || hist.Data.LocationHistory[0].PreviousLocation != created.Location || hist.Data.LocationHistory[0].NewLocation != newLoc {
		t.Errorf("history: locationHistory = %+v, want one entry from the original to the new location", hist.Data.LocationHistory)
	}
	if len(hist.Data.ChangeHistory) < 1 {
		t.Errorf("history: changeHistory is empty, want the name/attribute update recorded")
	}

	// 7. Delete, then confirm it is gone.
	status, raw = admin.do(http.MethodDelete, "/api/v1/resources/"+id, nil)
	if status != http.StatusNoContent && status != http.StatusOK {
		t.Fatalf("delete: status = %d, want 204 or 200; body: %s", status, string(raw))
	}
	status, raw = admin.do(http.MethodGet, "/api/v1/resources/"+id, nil)
	expectStatus(t, status, http.StatusNotFound, raw, "get after delete")
	expectErrorCode(t, raw, "RESOURCE_NOT_FOUND", "get after delete")
}

func TestErrorContract(t *testing.T) {
	base := baseURL(t)
	waitForHealth(t, base)

	t.Run("unauthenticated request is rejected", func(t *testing.T) {
		anon := newClient(t, base)
		status, raw := anon.do(http.MethodGet, "/api/v1/resources", nil)
		expectStatus(t, status, http.StatusUnauthorized, raw, "anonymous list")
		expectErrorCode(t, raw, "AUTHENTICATION_FAILED", "anonymous list")
	})

	t.Run("bad credentials are rejected", func(t *testing.T) {
		c := newClient(t, base)
		status, raw := c.login("user-001", "definitely-wrong")
		expectStatus(t, status, http.StatusUnauthorized, raw, "bad login")
		expectErrorCode(t, raw, "AUTHENTICATION_FAILED", "bad login")
	})

	admin := newClient(t, base)
	status, raw := admin.login(envOrDefault("GEORESPONSE_ADMIN_ID", "user-001"), envOrDefault("GEORESPONSE_ADMIN_PASSWORD", "ChangeMe123!"))
	expectStatus(t, status, http.StatusOK, raw, "admin login")

	t.Run("unknown resource id is 404", func(t *testing.T) {
		status, raw := admin.do(http.MethodGet, "/api/v1/resources/does-not-exist-"+fmt.Sprint(time.Now().UnixNano()), nil)
		expectStatus(t, status, http.StatusNotFound, raw, "get unknown")
		expectErrorCode(t, raw, "RESOURCE_NOT_FOUND", "get unknown")
	})

	t.Run("out-of-range coordinates are rejected", func(t *testing.T) {
		status, raw := admin.do(http.MethodPost, "/api/v1/resources", map[string]any{
			"id": "it-bad-location", "name": "Bad", "type": "VEHICLE", "status": "AVAILABLE",
			"attributes": map[string]any{"vehicleType": "Truck", "capacity": 1},
			"location":   map[string]any{"latitude": 95.0, "longitude": 200.0},
		})
		expectStatus(t, status, http.StatusBadRequest, raw, "create with bad location")
		var env errorEnvelope
		decode(t, raw, &env)
		if env.Error.Code != "INVALID_LOCATION" && env.Error.Code != "VALIDATION_ERROR" {
			t.Fatalf("create with bad location: error.code = %q, want INVALID_LOCATION or VALIDATION_ERROR", env.Error.Code)
		}
	})

	t.Run("unknown type and status are rejected", func(t *testing.T) {
		status, raw := admin.do(http.MethodPost, "/api/v1/resources", map[string]any{
			"id": "it-bad-type", "name": "Bad", "type": "SPACESHIP", "status": "AVAILABLE",
			"attributes": map[string]any{}, "location": map[string]any{"latitude": 0, "longitude": 0},
		})
		expectStatus(t, status, http.StatusBadRequest, raw, "create with bad type")
		var env errorEnvelope
		decode(t, raw, &env)
		if env.Error.Code != "INVALID_RESOURCE_TYPE" && env.Error.Code != "VALIDATION_ERROR" {
			t.Fatalf("create with bad type: error.code = %q", env.Error.Code)
		}

		status, raw = admin.do(http.MethodPost, "/api/v1/resources", map[string]any{
			"id": "it-bad-status", "name": "Bad", "type": "VEHICLE", "status": "SLEEPING",
			"attributes": map[string]any{"vehicleType": "Truck", "capacity": 1}, "location": map[string]any{"latitude": 0, "longitude": 0},
		})
		expectStatus(t, status, http.StatusBadRequest, raw, "create with bad status")
		decode(t, raw, &env)
		if env.Error.Code != "INVALID_RESOURCE_STATUS" && env.Error.Code != "VALIDATION_ERROR" {
			t.Fatalf("create with bad status: error.code = %q", env.Error.Code)
		}
	})

	t.Run("duplicate id conflicts", func(t *testing.T) {
		id := fmt.Sprintf("it-dup-%d", time.Now().UnixNano())
		body := map[string]any{
			"id": id, "name": "Dup", "type": "VEHICLE", "status": "AVAILABLE",
			"attributes": map[string]any{"vehicleType": "Truck", "capacity": 1},
			"location":   map[string]any{"latitude": 1.0, "longitude": 1.0},
		}
		t.Cleanup(func() { admin.do(http.MethodDelete, "/api/v1/resources/"+id, nil) })
		status, raw := admin.do(http.MethodPost, "/api/v1/resources", body)
		expectStatus(t, status, http.StatusCreated, raw, "first create")
		status, raw = admin.do(http.MethodPost, "/api/v1/resources", body)
		expectStatus(t, status, http.StatusConflict, raw, "duplicate create")
		expectErrorCode(t, raw, "RESOURCE_ID_CONFLICT", "duplicate create")
	})
}

func TestAuthorization_ReadOnlyAccountCannotWrite(t *testing.T) {
	base := baseURL(t)
	waitForHealth(t, base)

	readOnly := newClient(t, base)
	status, raw := readOnly.login(envOrDefault("GEORESPONSE_READONLY_ID", "user-002"), envOrDefault("GEORESPONSE_READONLY_PASSWORD", "ChangeMe123!"))
	if status != http.StatusOK {
		t.Skipf("read-only demo account not available (login status %d); seed database/seeds/0003_sample_auth_coordinator.sql to enable this test", status)
	}

	// Permitted path: reading.
	status, raw = readOnly.do(http.MethodGet, "/api/v1/resources", nil)
	expectStatus(t, status, http.StatusOK, raw, "read-only list")

	// Denied path: every write.
	id := fmt.Sprintf("it-denied-%d", time.Now().UnixNano())
	status, raw = readOnly.do(http.MethodPost, "/api/v1/resources", map[string]any{
		"id": id, "name": "Denied", "type": "VEHICLE", "status": "AVAILABLE",
		"attributes": map[string]any{"vehicleType": "Truck", "capacity": 1},
		"location":   map[string]any{"latitude": 1.0, "longitude": 1.0},
	})
	expectStatus(t, status, http.StatusForbidden, raw, "read-only create")
	expectErrorCode(t, raw, "AUTHORIZATION_DENIED", "read-only create")

	status, raw = readOnly.do(http.MethodPatch, "/api/v1/resources/resource-001/location", location{Latitude: 0, Longitude: 0})
	expectStatus(t, status, http.StatusForbidden, raw, "read-only relocate")
	expectErrorCode(t, raw, "AUTHORIZATION_DENIED", "read-only relocate")
}
