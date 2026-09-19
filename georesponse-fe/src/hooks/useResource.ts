/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Queries a single resource (GET /api/v1/resources/{id}),
 *                using the resourceKeys factory for its cache key.
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
