/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Queries a single resource (GET /api/v1/resources/{id}),
 *                per FRONTEND_UI_UX.md section 5 and the resourceKeys
 *                factory in FRONTEND_STATE.md section 5.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { resourceApi } from "@api/resources/resourceApi";
import { resourceKeys } from "@api/resources/resourceKeys";
import { useQuery } from "@tanstack/react-query";

/** Returns the resource identified by `id`, or `undefined` while `id` is `null`. */
export function useResource(id: string | null) {
	return useQuery({
		queryKey: resourceKeys.detail(id ?? ""),
		queryFn: () => resourceApi.get(id as string),
		enabled: id !== null
	});
}
