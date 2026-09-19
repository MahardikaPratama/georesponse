/*
Author       : Mahardika Pratama
Version      : 1.1.0
Created Date : 2026-09-19
Description  : Tests for Client against an httptest.NewServer fixture

	serving a canned ArcGIS GeoHotspot response (captured from BMKG's
	live service during design), rather than the real network — the
	same httptest-based approach this codebase already uses for
	inbound requests, pointed outbound.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
  - 1.1.0 (2026-09-20): Cover the ArcGIS HTTP-200 error envelope, the
    new query options, and TimestampLiteral.
*/
package bmkg

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// canned response captured from a live query against BMKG's GeoHotspot
// layer (datacuaca.bmkg.go.id/arcgis/rest/services/production/geohotspot/
// MapServer/0/query?where=1=1&outFields=*&f=geojson&resultRecordCount=3
// &orderByFields=objectid+DESC), used verbatim as a fixture.
const cannedResponse = `{
	"type": "FeatureCollection",
	"features": [
		{
			"type": "Feature",
			"id": 100890210,
			"geometry": {"type": "Point", "coordinates": [105.70000000000005, 18.680000000000064]},
			"properties": {
				"objectid": 100890210,
				"longitude": 105.7,
				"latitude": 18.68,
				"date": "2026-09-01",
				"time": "05:50",
				"region": "-",
				"provinsi": "-",
				"kabupaten": "Vietnam",
				"kecamatan": "Vietnam",
				"system_date": 1788268500000,
				"date_full": 1788241800000
			}
		},
		{
			"type": "Feature",
			"id": 3,
			"geometry": {"type": "Point", "coordinates": [117.98000000000002, -8.7999999999999545]},
			"properties": {
				"objectid": 3,
				"longitude": 117.98,
				"latitude": -8.8,
				"date": "2022-12-21",
				"time": "04:20",
				"region": "KEPULAUAN NUSA TENGGARA",
				"provinsi": "NUSA TENGGARA BARAT",
				"kabupaten": "KAB. SUMBAWA",
				"kecamatan": "EMPANG",
				"system_date": 1671622500000,
				"date_full": 1671596400000
			}
		}
	]
}`

func TestClient_Query_Success(t *testing.T) {
	var capturedPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedPath = r.URL.String()
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(cannedResponse))
	}))
	defer server.Close()

	client := NewClient(server.URL, 5*time.Second)
	features, err := client.Query(context.Background(), QueryOptions{Where: "provinsi <> '-'"})
	if err != nil {
		t.Fatalf("Query() error = %v, want nil", err)
	}

	if len(features) != 2 {
		t.Fatalf("len(features) = %d, want 2", len(features))
	}

	if !strings.Contains(capturedPath, "/query?") {
		t.Errorf("request path %q does not target /query", capturedPath)
	}
	if !strings.Contains(capturedPath, "provinsi") {
		t.Errorf("request path %q does not carry the where clause", capturedPath)
	}

	second := features[1]
	if second.Properties.Provinsi != "NUSA TENGGARA BARAT" {
		t.Errorf("Properties.Provinsi = %q, want %q", second.Properties.Provinsi, "NUSA TENGGARA BARAT")
	}
	if second.Geometry.Coordinates[0] != 117.98000000000002 {
		t.Errorf("Geometry.Coordinates[0] = %v, want 117.98000000000002", second.Geometry.Coordinates[0])
	}
	if second.Properties.DateFull != 1671596400000 {
		t.Errorf("Properties.DateFull = %d, want 1671596400000", second.Properties.DateFull)
	}
}

func TestClient_Query_NonOKStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := NewClient(server.URL, 5*time.Second)
	_, err := client.Query(context.Background(), QueryOptions{})
	if err == nil {
		t.Fatal("Query() error = nil, want non-nil")
	}
}

func TestClient_Query_MalformedBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte("not json"))
	}))
	defer server.Close()

	client := NewClient(server.URL, 5*time.Second)
	_, err := client.Query(context.Background(), QueryOptions{})
	if err == nil {
		t.Fatal("Query() error = nil, want non-nil")
	}
}

func TestClient_Query_Timeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(50 * time.Millisecond)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(cannedResponse))
	}))
	defer server.Close()

	client := NewClient(server.URL, 5*time.Millisecond)
	_, err := client.Query(context.Background(), QueryOptions{})
	if err == nil {
		t.Fatal("Query() error = nil, want non-nil (timeout)")
	}
}

// arcgisErrorEnvelope is what the layer returns (with HTTP 200 under
// f=geojson) for a rejected query, e.g. a date compared to a bare integer.
const arcgisErrorEnvelope = `{"error":{"code":400,"extendedCode":-2147220985,"message":"Unable to complete operation.","details":[]}}`

func TestClient_Query_ArcGISErrorEnvelope(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(arcgisErrorEnvelope))
	}))
	defer server.Close()

	client := NewClient(server.URL, 5*time.Second)
	features, err := client.Query(context.Background(), QueryOptions{Where: "date_full >= 1"})
	if err == nil {
		t.Fatalf("Query() error = nil, want ErrRequestFailed (got %d features)", len(features))
	}
	if !strings.Contains(err.Error(), "arcgis error 400") {
		t.Errorf("error %q does not carry the ArcGIS error code/message", err)
	}
}

func TestClient_Query_PassesOptions(t *testing.T) {
	var captured map[string][]string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured = r.URL.Query()
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(cannedResponse))
	}))
	defer server.Close()

	client := NewClient(server.URL, 5*time.Second)
	_, err := client.Query(context.Background(), QueryOptions{
		Where:             "provinsi <> '-'",
		OutFields:         []string{"date_full", "objectid"},
		OrderBy:           "date_full DESC",
		ResultRecordCount: 1,
	})
	if err != nil {
		t.Fatalf("Query() error = %v, want nil", err)
	}

	want := map[string]string{
		"outFields":         "date_full,objectid",
		"orderByFields":     "date_full DESC",
		"resultRecordCount": "1",
		"f":                 "geojson",
	}
	for key, value := range want {
		if got := captured[key]; len(got) != 1 || got[0] != value {
			t.Errorf("query %s = %q, want %q", key, got, value)
		}
	}
}

func TestClient_Query_DefaultsWhenOptionsEmpty(t *testing.T) {
	var captured map[string][]string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured = r.URL.Query()
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(cannedResponse))
	}))
	defer server.Close()

	client := NewClient(server.URL, 5*time.Second)
	if _, err := client.Query(context.Background(), QueryOptions{}); err != nil {
		t.Fatalf("Query() error = %v, want nil", err)
	}
	if got := captured["where"]; len(got) != 1 || got[0] != "1=1" {
		t.Errorf("where = %q, want 1=1", got)
	}
	if got := captured["outFields"]; len(got) != 1 || got[0] != "*" {
		t.Errorf("outFields = %q, want *", got)
	}
	if got := captured["orderByFields"]; len(got) != 1 || got[0] != "objectid DESC" {
		t.Errorf("orderByFields = %q, want objectid DESC", got)
	}
	if _, present := captured["resultRecordCount"]; present {
		t.Errorf("resultRecordCount should be omitted when zero, got %q", captured["resultRecordCount"])
	}
}

func TestTimestampLiteral(t *testing.T) {
	// 2026-09-01T05:50:00Z is BMKG's date_full 1788241800000 as captured
	// in cannedResponse; a non-UTC input must be normalised to UTC.
	in := time.UnixMilli(1788241800000).In(time.FixedZone("WIB", 7*3600))
	if got, want := TimestampLiteral(in), "TIMESTAMP '2026-09-01 05:50:00'"; got != want {
		t.Errorf("TimestampLiteral() = %q, want %q", got, want)
	}
}
