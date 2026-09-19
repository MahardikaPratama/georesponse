/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the Location value type and its coordinate range

	validation.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import (
	"errors"
	"fmt"
)

// Valid geographic coordinate ranges (BR-010).
const (
	minLatitude  = -90.0
	maxLatitude  = 90.0
	minLongitude = -180.0
	maxLongitude = 180.0
)

// ErrInvalidLocation reports a location whose coordinates fall outside the
// valid geographic ranges (BR-009, BR-010).
var ErrInvalidLocation = errors.New("resource: location coordinates are out of valid range")

// Location is a resource's geographic position, expressed as latitude and
// longitude (BR-009 through BR-011).
type Location struct {
	Latitude  float64
	Longitude float64
}

// ValidateLocation checks that latitude falls within [-90, 90] and
// longitude within [-180, 180] (BR-010). It is a free function, rather than
// only a Location method, so callers can validate raw coordinate pairs
// before a Location value has been constructed (e.g. from request input).
func ValidateLocation(latitude, longitude float64) error {
	if latitude < minLatitude || latitude > maxLatitude {
		return fmt.Errorf("%w: latitude %v is outside [%v, %v]", ErrInvalidLocation, latitude, minLatitude, maxLatitude)
	}
	if longitude < minLongitude || longitude > maxLongitude {
		return fmt.Errorf("%w: longitude %v is outside [%v, %v]", ErrInvalidLocation, longitude, minLongitude, maxLongitude)
	}
	return nil
}

// Validate checks that l's coordinates fall within the valid geographic
// ranges (BR-010).
func (l Location) Validate() error {
	return ValidateLocation(l.Latitude, l.Longitude)
}
