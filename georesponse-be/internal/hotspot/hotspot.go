/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Package hotspot contains the Hotspot domain type: a

	situational-awareness point sourced from BMKG's GeoHotspot service,
	kept deliberately separate from resource.Resource — a hotspot is
	never an application-managed resource, never auto-dispatches one,
	and carries no lifecycle of its own beyond what BMKG reports.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package hotspot

import (
	"errors"
	"time"
)

// ErrUpstreamUnavailable reports that BMKG's GeoHotspot service could not
// be reached and no cached result was available to serve instead.
var ErrUpstreamUnavailable = errors.New("hotspot: BMKG service unavailable")

// Hotspot is a single fire/heat-anomaly point as reported by BMKG's
// GeoHotspot service. Field names and presence are faithful to BMKG's
// verified schema (objectid, longitude, latitude, date, time, region,
// provinsi, kabupaten, kecamatan, system_date, date_full) — no
// confidence/brightness/FRP fields exist on that service, so none are
// invented here.
type Hotspot struct {
	// ID is BMKG's objectid for this detection.
	ID string

	Latitude  float64
	Longitude float64

	// Region, Province, Regency, and District are BMKG's administrative
	// labels for the detection (region/provinsi/kabupaten/kecamatan).
	// BMKG's GeoHotspot layer also covers neighboring countries; for
	// those, Province is "-".
	Region   string
	Province string
	Regency  string
	District string

	// ObservedDate and ObservedTime are BMKG's own "date"/"time" strings
	// (e.g. "2026-09-01", "05:50"), kept as reported rather than combined
	// into a single timestamp under an unverified timezone assumption.
	ObservedDate string
	ObservedTime string

	// UpdatedAt is BMKG's "system_date" (when BMKG's system last updated
	// this record).
	UpdatedAt time.Time

	// OriginDate is BMKG's "date_full" (the detection's origin date).
	OriginDate time.Time
}

// Filters narrows a hotspot query.
type Filters struct {
	// Since bounds how far back a hotspot may have been detected. Zero
	// means the service's default window applies.
	Since time.Duration
}
