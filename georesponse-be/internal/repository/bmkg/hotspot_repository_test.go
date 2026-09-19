/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Tests HotspotRepository against an httptest.NewServer

	fixture serving a canned ArcGIS GeoHotspot response, verifying the
	Indonesia-only/recency filter is applied and features convert
	correctly to hotspot.Hotspot.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package bmkg_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	platformbmkg "github.com/mahardika-pratama/georesponse-be/internal/platform/bmkg"
	repobmkg "github.com/mahardika-pratama/georesponse-be/internal/repository/bmkg"
	"github.com/mahardika-pratama/georesponse-be/internal/hotspot"
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

func TestHotspotRepository_List(t *testing.T) {
	var capturedWhere string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedWhere = r.URL.Query().Get("where")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(cannedResponse))
	}))
	defer server.Close()

	client := platformbmkg.NewClient(server.URL, 5*time.Second)
	repo := repobmkg.NewHotspotRepository(client)

	hotspots, err := repo.List(context.Background(), hotspot.Filters{Since: 48 * time.Hour})
	if err != nil {
		t.Fatalf("List() error = %v, want nil", err)
	}

	if !strings.Contains(capturedWhere, "provinsi <> '-'") {
		t.Errorf("where clause %q missing Indonesia-only filter", capturedWhere)
	}
	if !strings.Contains(capturedWhere, "date_full >=") {
		t.Errorf("where clause %q missing recency filter", capturedWhere)
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
