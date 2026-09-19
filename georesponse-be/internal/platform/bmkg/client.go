/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Package bmkg is the only package that opens an HTTP

	connection to BMKG's public GeoHotspot ArcGIS REST layer
	(datacuaca.bmkg.go.id/arcgis/rest/services/production/geohotspot/
	MapServer/0), mirroring internal/platform/postgres's role as the sole
	owner of an external connection. It knows the ArcGIS query/response
	wire format; nothing outside this package should.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package bmkg

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

// ErrRequestFailed wraps any failure to obtain or decode a response from
// BMKG (network error, timeout, non-200 status, malformed body).
var ErrRequestFailed = errors.New("bmkg: request failed")

// Client queries BMKG's GeoHotspot ArcGIS REST layer.
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// NewClient constructs a Client that queries baseURL (BMKG's GeoHotspot
// layer, e.g. ".../MapServer/0") with requests bounded by timeout.
func NewClient(baseURL string, timeout time.Duration) *Client {
	return &Client{
		baseURL:    baseURL,
		httpClient: &http.Client{Timeout: timeout},
	}
}

// QueryOptions constrains a GeoHotspot query.
type QueryOptions struct {
	// Where is an ArcGIS SQL-92 WHERE clause (e.g. "provinsi <> '-'").
	// An empty Where queries every feature.
	Where string
}

// Feature is a single ArcGIS GeoJSON hotspot point, decoded from BMKG's
// verified response schema: objectid, longitude, latitude, date, time,
// region, provinsi, kabupaten, kecamatan, system_date, date_full. No other
// fields exist on this layer (no confidence/brightness/FRP).
type Feature struct {
	Geometry struct {
		Coordinates [2]float64 `json:"coordinates"` // [longitude, latitude]
	} `json:"geometry"`
	Properties struct {
		ObjectID    int64  `json:"objectid"`
		Longitude   float64 `json:"longitude"`
		Latitude    float64 `json:"latitude"`
		Date        string `json:"date"`
		Time        string `json:"time"`
		Region      string `json:"region"`
		Provinsi    string `json:"provinsi"`
		Kabupaten   string `json:"kabupaten"`
		Kecamatan   string `json:"kecamatan"`
		SystemDate  int64  `json:"system_date"` // epoch milliseconds, alias "Updated At"
		DateFull    int64  `json:"date_full"`   // epoch milliseconds, alias "Origin Date"
	} `json:"properties"`
}

// featureCollection is the raw ArcGIS GeoJSON envelope.
type featureCollection struct {
	Features []Feature `json:"features"`
}

// Query fetches every current GeoHotspot feature matching opts.
func (c *Client) Query(ctx context.Context, opts QueryOptions) ([]Feature, error) {
	where := opts.Where
	if where == "" {
		where = "1=1"
	}

	query := url.Values{
		"where":         {where},
		"outFields":     {"*"},
		"f":             {"geojson"},
		"orderByFields": {"objectid DESC"},
	}

	reqURL := c.baseURL + "/query?" + query.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("%w: build request: %v", ErrRequestFailed, err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrRequestFailed, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: unexpected status %d", ErrRequestFailed, resp.StatusCode)
	}

	var decoded featureCollection
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, fmt.Errorf("%w: decode response: %v", ErrRequestFailed, err)
	}

	return decoded.Features, nil
}
