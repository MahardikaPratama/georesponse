/*
Author       : Mahardika Pratama
Version      : 1.1.0
Created Date : 2026-09-19
Description  : Package bmkg is the only package that opens an HTTP

	connection to BMKG's public GeoHotspot ArcGIS REST layer
	(datacuaca.bmkg.go.id/arcgis/rest/services/production/geohotspot/
	MapServer/0), mirroring internal/platform/postgres's role as the sole
	owner of an external connection. It knows the ArcGIS query/response
	wire format; nothing outside this package should.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
  - 1.1.0 (2026-09-20): Treat ArcGIS's HTTP-200 error envelope as a
    failure (previously decoded as an empty feature list); add
    OutFields/OrderBy/ResultRecordCount query options.
*/
package bmkg

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
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
	// An empty Where queries every feature. Date fields must be compared
	// against a TIMESTAMP literal (see TimestampLiteral); a bare epoch
	// integer is rejected by the layer.
	Where string

	// OutFields lists the attribute fields to return. Empty means every
	// field ("*").
	OutFields []string

	// OrderBy is an ArcGIS orderByFields expression (e.g. "date_full
	// DESC"). Empty means "objectid DESC".
	OrderBy string

	// ResultRecordCount caps the number of features returned. Zero means
	// the layer's own maximum (2000 on BMKG's layer; larger result sets
	// are truncated by the layer, which is why OrderBy matters).
	ResultRecordCount int
}

// TimestampLiteral formats t as the ArcGIS SQL TIMESTAMP literal the layer
// accepts in a WHERE clause against a date field. The layer interprets the
// literal in UTC, matching how it reports date fields (epoch milliseconds).
func TimestampLiteral(t time.Time) string {
	return "TIMESTAMP '" + t.UTC().Format("2006-01-02 15:04:05") + "'"
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
		ObjectID   int64   `json:"objectid"`
		Longitude  float64 `json:"longitude"`
		Latitude   float64 `json:"latitude"`
		Date       string  `json:"date"`
		Time       string  `json:"time"`
		Region     string  `json:"region"`
		Provinsi   string  `json:"provinsi"`
		Kabupaten  string  `json:"kabupaten"`
		Kecamatan  string  `json:"kecamatan"`
		SystemDate int64   `json:"system_date"` // epoch milliseconds, alias "Updated At"
		DateFull   int64   `json:"date_full"`   // epoch milliseconds, alias "Origin Date"
	} `json:"properties"`
}

// featureCollection is the raw ArcGIS GeoJSON envelope. ArcGIS reports a
// rejected query (for example a malformed WHERE clause) as HTTP 200 with an
// "error" member instead of "features", so both are decoded and the error
// member is checked first.
type featureCollection struct {
	Features []Feature `json:"features"`
	Error    *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// Query fetches every current GeoHotspot feature matching opts.
func (c *Client) Query(ctx context.Context, opts QueryOptions) ([]Feature, error) {
	where := opts.Where
	if where == "" {
		where = "1=1"
	}

	outFields := "*"
	if len(opts.OutFields) > 0 {
		outFields = strings.Join(opts.OutFields, ",")
	}
	orderBy := opts.OrderBy
	if orderBy == "" {
		orderBy = "objectid DESC"
	}

	query := url.Values{
		"where":         {where},
		"outFields":     {outFields},
		"f":             {"geojson"},
		"orderByFields": {orderBy},
	}
	if opts.ResultRecordCount > 0 {
		query.Set("resultRecordCount", strconv.Itoa(opts.ResultRecordCount))
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
	if decoded.Error != nil {
		return nil, fmt.Errorf("%w: arcgis error %d: %s", ErrRequestFailed, decoded.Error.Code, decoded.Error.Message)
	}

	return decoded.Features, nil
}
