/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Queries the resource list (GET /api/v1/resources), per
 *                FRONTEND_UI_UX.md section 4 and the resourceKeys factory
 *                in FRONTEND_STATE.md section 5. Callable from multiple
 *                components (list, map) — TanStack Query shares one cache
 *                entry per identical filters, so this never issues
 *                duplicate requests, the same pattern useCurrentUser
 *                already uses across App.tsx and AppShell.tsx.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { resourceApi } from "@api/resources/resourceApi";
import { ResourceFilters } from "@api/resources/resourceApi.types";
import { resourceKeys } from "@api/resources/resourceKeys";
import { useQuery } from "@tanstack/react-query";

/** Returns the filtered, paginated resource list. */
export function useResources(filters: ResourceFilters = {}) {
	return useQuery({
		queryKey: resourceKeys.list(filters),
		queryFn: () => resourceApi.list(filters)
	});
}
