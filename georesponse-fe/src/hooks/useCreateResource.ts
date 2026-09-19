/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Mutation for POST /api/v1/resources. On success,
 *                invalidates resourceKeys.lists() so the list and map pick
 *                up the new resource without a manual refresh (UC-06 step 8).
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { resourceApi } from "@api/resources/resourceApi";
import { CreateResourceRequest } from "@api/resources/resourceApi.types";
import { resourceKeys } from "@api/resources/resourceKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateResource() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CreateResourceRequest) => resourceApi.create(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
		}
	});
}
