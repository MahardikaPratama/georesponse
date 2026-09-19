/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Request shape for GET /api/v1/hotspots.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */

export interface HotspotFilters {
	/** How many hours back to look. Backend default is 24, max 72. */
	hours?: number;
}
