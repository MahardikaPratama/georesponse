/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : TanStack Query key factory for hotspots. Keyed on domain
 *                concept ("hotspots"), not the HTTP path.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { HotspotFilters } from "./hotspotApi.types";

export const hotspotKeys = {
	all: ["hotspots"] as const,
	lists: () => [...hotspotKeys.all, "list"] as const,
	list: (filters: HotspotFilters) => [...hotspotKeys.lists(), filters] as const
};
