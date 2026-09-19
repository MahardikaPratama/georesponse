/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Queries the BMKG hotspot overlay (GET /api/v1/hotspots).
 *                Unlike useResources, this refetches periodically:
 *                hotspot data is BMKG's periodic satellite-pass snapshot,
 *                not something a user mutates, so a map left open
 *                benefits from staying current without a manual refresh.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { hotspotApi } from "@api/hotspots/hotspotApi";
import { HotspotFilters } from "@api/hotspots/hotspotApi.types";
import { hotspotKeys } from "@api/hotspots/hotspotKeys";
import { useQuery } from "@tanstack/react-query";

/** How often to refetch the hotspot overlay while a component is mounted. */
const HOTSPOT_REFETCH_INTERVAL_MS = 5 * 60 * 1000;

/** Returns the current BMKG hotspot list. */
export function useHotspots(filters: HotspotFilters = {}) {
	return useQuery({
		queryKey: hotspotKeys.list(filters),
		queryFn: () => hotspotApi.list(filters),
		refetchInterval: HOTSPOT_REFETCH_INTERVAL_MS
	});
}
