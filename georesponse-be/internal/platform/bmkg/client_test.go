/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests for Client against an httptest.NewServer fixture

	serving a canned ArcGIS GeoHotspot response (captured from BMKG's
	live service during design), rather than the real network — the
	same httptest-based approach this codebase already uses for
	inbound requests, pointed outbound.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
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
