/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Mutation for PUT /api/v1/resources/{id}. On success,
 *                invalidates resourceKeys.detail(id) and
 *                resourceKeys.lists() so the detail panel and the list/map
 *                pick up the change without
 *                a manual refresh.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { resourceApi } from "@api/resources/resourceApi";
import { UpdateResourceRequest } from "@api/resources/resourceApi.types";
import { resourceKeys } from "@api/resources/resourceKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdateResource(id: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: UpdateResourceRequest) => resourceApi.update(id, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: resourceKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
		}
	});
}
