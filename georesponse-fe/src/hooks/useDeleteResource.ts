/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Mutation for DELETE /api/v1/resources/{id} (FR-005,
 *                UC-10). On success, invalidates resourceKeys.lists() and
 *                removes resourceKeys.detail(id) from the cache entirely
 *                (FRONTEND_STATE.md section 6's table — a deleted resource
 *                shouldn't linger in cache to be refetched), so the list
 *                and map pick up the removal without a manual refresh.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { resourceApi } from "@api/resources/resourceApi";
import { resourceKeys } from "@api/resources/resourceKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteResource(id: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => resourceApi.remove(id),
		onSuccess: () => {
			queryClient.removeQueries({ queryKey: resourceKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
		}
	});
}
