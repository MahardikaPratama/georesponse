/*
Author       : Mahardika Pratama
Version      : 1.1.0
Created Date : 2026-09-19
Description  : Implements hotspot.Repository against BMKG's GeoHotspot

	ArcGIS REST layer via internal/platform/bmkg.Client. ArcGIS-specific
	query/response shape is isolated to this file, exactly as
	repository/postgres isolates PostGIS-specific SQL; every other
	layer works with plain hotspot.Hotspot values.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
  - 1.1.0 (2026-09-20): Anchor the recency window to BMKG's latest
    observation instead of the wall clock (the layer lags real time by
    days, so a wall-clock window was always empty) and compare date_full
    against a TIMESTAMP literal (an epoch integer is rejected by ArcGIS).
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

// dateFullField is the layer's detection-origin date field.
const dateFullField = "date_full"

// List fetches the most recent hotspots from BMKG, restricted to Indonesia
// and to the recency window in f (or defaultSince if unset). The window
// ends at BMKG's latest available observation, not at the current time:
// the GeoHotspot layer is published with a lag of days, so a window
// anchored to the wall clock would be empty whenever BMKG is behind, which
// is exactly when an operator most wants to see the latest data it does
// have. Callers can tell how old the data is from Hotspot.OriginDate.
func (r *HotspotRepository) List(ctx context.Context, f hotspot.Filters) ([]hotspot.Hotspot, error) {
	since := f.Since
	if since <= 0 {
		since = defaultSince
	}

	latest, ok, err := r.latestObservation(ctx)
	if err != nil {
		return nil, err
	}
	if !ok {
		return []hotspot.Hotspot{}, nil
	}

	cutoff := latest.Add(-since)
	where := fmt.Sprintf("%s AND %s >= %s", indonesiaOnlyClause, dateFullField, platformbmkg.TimestampLiteral(cutoff))

	features, err := r.client.Query(ctx, platformbmkg.QueryOptions{
		Where:   where,
		OrderBy: dateFullField + " DESC",
	})
	if err != nil {
		return nil, fmt.Errorf("bmkg: list hotspots: %w", err)
	}

	hotspots := make([]hotspot.Hotspot, 0, len(features))
	for _, feature := range features {
		hotspots = append(hotspots, toHotspot(feature))
	}

	return hotspots, nil
}

// latestObservation returns the origin date of BMKG's newest Indonesian
// hotspot. ok is false when the layer has no Indonesian features at all.
func (r *HotspotRepository) latestObservation(ctx context.Context) (latest time.Time, ok bool, err error) {
	features, err := r.client.Query(ctx, platformbmkg.QueryOptions{
		Where:             indonesiaOnlyClause,
		OutFields:         []string{dateFullField},
		OrderBy:           dateFullField + " DESC",
		ResultRecordCount: 1,
	})
	if err != nil {
		return time.Time{}, false, fmt.Errorf("bmkg: latest observation: %w", err)
	}
	if len(features) == 0 {
		return time.Time{}, false, nil
	}
	return time.UnixMilli(features[0].Properties.DateFull).UTC(), true, nil
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
