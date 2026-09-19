/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Implements hotspot.Repository against BMKG's GeoHotspot

	ArcGIS REST layer via internal/platform/bmkg.Client. ArcGIS-specific
	query/response shape is isolated to this file, exactly as
	repository/postgres isolates PostGIS-specific SQL; every other
	layer works with plain hotspot.Hotspot values.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package bmkg

import (
	"context"
	"fmt"
	"time"

	"github.com/mahardika-pratama/georesponse-be/internal/hotspot"
	platformbmkg "github.com/mahardika-pratama/georesponse-be/internal/platform/bmkg"
)

// defaultSince bounds how far back a query looks when Filters.Since is
// zero.
const defaultSince = 24 * time.Hour

// indonesiaOnlyClause excludes GeoHotspot features outside Indonesia
// (BMKG's layer also covers neighboring countries, whose "provinsi" field
// is reported as "-").
const indonesiaOnlyClause = "provinsi <> '-'"

// HotspotRepository is the BMKG-backed implementation of hotspot.Repository.
type HotspotRepository struct {
	client *platformbmkg.Client
}

// NewHotspotRepository constructs a HotspotRepository backed by client.
func NewHotspotRepository(client *platformbmkg.Client) *HotspotRepository {
	return &HotspotRepository{client: client}
}

// List fetches current hotspots from BMKG, restricted to Indonesia and to
// the recency window in f (or defaultSince if unset).
func (r *HotspotRepository) List(ctx context.Context, f hotspot.Filters) ([]hotspot.Hotspot, error) {
	since := f.Since
	if since <= 0 {
		since = defaultSince
	}
	cutoffMillis := time.Now().Add(-since).UnixMilli()

	where := fmt.Sprintf("%s AND date_full >= %d", indonesiaOnlyClause, cutoffMillis)

	features, err := r.client.Query(ctx, platformbmkg.QueryOptions{Where: where})
	if err != nil {
		return nil, fmt.Errorf("bmkg: list hotspots: %w", err)
	}

	hotspots := make([]hotspot.Hotspot, 0, len(features))
	for _, feature := range features {
		hotspots = append(hotspots, toHotspot(feature))
	}

	return hotspots, nil
}

// toHotspot converts one ArcGIS feature into a domain Hotspot.
func toHotspot(feature platformbmkg.Feature) hotspot.Hotspot {
	props := feature.Properties
	return hotspot.Hotspot{
		ID:           fmt.Sprintf("%d", props.ObjectID),
		Latitude:     props.Latitude,
		Longitude:    props.Longitude,
		Region:       props.Region,
		Province:     props.Provinsi,
		Regency:      props.Kabupaten,
		District:     props.Kecamatan,
		ObservedDate: props.Date,
		ObservedTime: props.Time,
		UpdatedAt:    time.UnixMilli(props.SystemDate).UTC(),
		OriginDate:   time.UnixMilli(props.DateFull).UTC(),
	}
}
