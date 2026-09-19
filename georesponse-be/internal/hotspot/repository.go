/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Repository is the hotspot package's dependency on its data

	source, satisfied by internal/repository/bmkg.HotspotRepository
	(BMKG's GeoHotspot service) in the running application, and by a
	hand-rolled fake in tests — the same seam resource.Repository gives
	the resource package over Postgres.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package hotspot

import "context"

// Repository fetches current hotspots from wherever they're sourced.
type Repository interface {
	// List returns every hotspot matching f.
	List(ctx context.Context, f Filters) ([]Hotspot, error)
}
