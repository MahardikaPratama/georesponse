/*
Author       : Mahardika Pratama
Version      : 1.1.0
Created Date : 2026-09-19
Description  : Tests HotspotRepository against an httptest.NewServer

	fixture serving a canned ArcGIS GeoHotspot response, verifying the
	Indonesia-only/recency filter is applied and features convert
	correctly to hotspot.Hotspot.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
  - 1.1.0 (2026-09-20): The fixture now answers the latest-observation
    probe as well; assert the window is anchored to it via a TIMESTAMP
    literal.
*/
package bmkg_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/mahardika-pratama/georesponse-be/internal/hotspot"
	platformbmkg "github.com/mahardika-pratama/georesponse-be/internal/platform/bmkg"
	repobmkg "github.com/mahardika-pratama/georesponse-be/internal/repository/bmkg"
)

const cannedResponse = `{
	"type": "FeatureCollection",
	"features": [
		{
			"type": "Feature",
			"geometry": {"type": "Point", "coordinates": [117.98000000000002, -8.7999999999999545]},
			"properties": {
				"objectid": 3,
				"longitude": 117.98,
				"latitude": -8.8,
				"date": "2026-09-18",
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

// latestResponse is what the latest-observation probe (outFields=date_full,
// resultRecordCount=1) returns: date_full 1788241800000 = 2026-09-01T05:50Z.
const latestResponse = `{
	"type": "FeatureCollection",
	"features": [{"type": "Feature", "geometry": null, "properties": {"date_full": 1788241800000}}]
}`

// newFixture serves latestResponse to the probe and listResponse to the
// list query, capturing the WHERE clause of each request in order.
func newFixture(t *testing.T, listResponse string) (*httptest.Server, *[]string) {
	t.Helper()
	captured := []string{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured = append(captured, r.URL.Query().Get("where"))
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Query().Get("resultRecordCount") == "1" {
			_, _ = w.Write([]byte(latestResponse))
			return
		}
		_, _ = w.Write([]byte(listResponse))
	}))
	return server, &captured
}

func TestHotspotRepository_List(t *testing.T) {
	server, wheres := newFixture(t, cannedResponse)
	defer server.Close()

	client := platformbmkg.NewClient(server.URL, 5*time.Second)
	repo := repobmkg.NewHotspotRepository(client)

	hotspots, err := repo.List(context.Background(), hotspot.Filters{Since: 48 * time.Hour})
	if err != nil {
		t.Fatalf("List() error = %v, want nil", err)
	}

	if len(*wheres) != 2 {
		t.Fatalf("expected a latest-observation probe followed by the list query, got %d requests", len(*wheres))
	}
	probeWhere, listWhere := (*wheres)[0], (*wheres)[1]
	if probeWhere != "provinsi <> '-'" {
		t.Errorf("probe where = %q, want Indonesia-only filter", probeWhere)
	}
	if !strings.Contains(listWhere, "provinsi <> '-'") {
		t.Errorf("where clause %q missing Indonesia-only filter", listWhere)
	}
	// Window anchored to the latest observation (2026-09-01 05:50 UTC)
	// minus 48h, expressed as a TIMESTAMP literal - never a bare integer.
	if want := "date_full >= TIMESTAMP '2026-08-30 05:50:00'"; !strings.Contains(listWhere, want) {
		t.Errorf("where clause %q missing %q", listWhere, want)
	}

	if len(hotspots) != 1 {
		t.Fatalf("len(hotspots) = %d, want 1", len(hotspots))
	}

	got := hotspots[0]
	if got.ID != "3" {
		t.Errorf("ID = %q, want %q", got.ID, "3")
	}
	if got.Province != "NUSA TENGGARA BARAT" {
		t.Errorf("Province = %q, want %q", got.Province, "NUSA TENGGARA BARAT")
	}
	if got.Regency != "KAB. SUMBAWA" {
		t.Errorf("Regency = %q, want %q", got.Regency, "KAB. SUMBAWA")
	}
	if got.ObservedDate != "2026-09-18" || got.ObservedTime != "04:20" {
		t.Errorf("ObservedDate/Time = %q/%q, want 2026-09-18/04:20", got.ObservedDate, got.ObservedTime)
	}
	if got.Latitude != -8.8 || got.Longitude != 117.98 {
		t.Errorf("Latitude/Longitude = %v/%v, want -8.8/117.98", got.Latitude, got.Longitude)
	}
}

func TestHotspotRepository_List_DefaultWindow(t *testing.T) {
	server, wheres := newFixture(t, cannedResponse)
	defer server.Close()

	repo := repobmkg.NewHotspotRepository(platformbmkg.NewClient(server.URL, 5*time.Second))
	if _, err := repo.List(context.Background(), hotspot.Filters{}); err != nil {
		t.Fatalf("List() error = %v, want nil", err)
	}
	if want := "TIMESTAMP '2026-08-31 05:50:00'"; !strings.Contains((*wheres)[1], want) {
		t.Errorf("default window should be 24h before the latest observation; where = %q", (*wheres)[1])
	}
}

func TestHotspotRepository_List_NoObservations(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"type":"FeatureCollection","features":[]}`))
	}))
	defer server.Close()

	repo := repobmkg.NewHotspotRepository(platformbmkg.NewClient(server.URL, 5*time.Second))
	hotspots, err := repo.List(context.Background(), hotspot.Filters{})
	if err != nil {
		t.Fatalf("List() error = %v, want nil", err)
	}
	if len(hotspots) != 0 {
		t.Errorf("len(hotspots) = %d, want 0", len(hotspots))
	}
}

func TestHotspotRepository_List_ArcGISErrorIsUpstreamError(t *testing.T) {
	server, _ := newFixture(t, `{"error":{"code":400,"message":"Unable to complete operation."}}`)
	defer server.Close()

	repo := repobmkg.NewHotspotRepository(platformbmkg.NewClient(server.URL, 5*time.Second))
	if _, err := repo.List(context.Background(), hotspot.Filters{}); err == nil {
		t.Fatal("List() error = nil, want non-nil for an ArcGIS error envelope")
	}
}

func TestHotspotRepository_List_UpstreamError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	client := platformbmkg.NewClient(server.URL, 5*time.Second)
	repo := repobmkg.NewHotspotRepository(client)

	_, err := repo.List(context.Background(), hotspot.Filters{})
	if err == nil {
		t.Fatal("List() error = nil, want non-nil")
	}
}
