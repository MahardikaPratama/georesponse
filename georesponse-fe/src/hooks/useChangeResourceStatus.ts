/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Mutation for PATCH /api/v1/resources/{id}/status
 *                (FR-010-012, UC-08). On success, invalidates
 *                resourceKeys.detail(id), resourceKeys.lists(), and
 *                resourceKeys.history(id) (FRONTEND_STATE.md section 6),
 *                so the detail panel, the list/map, and (once section 9.9
 *                implements it) the history view all pick up the change
 *                without a manual refresh.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { resourceApi } from "@api/resources/resourceApi";
import { ChangeResourceStatusRequest } from "@api/resources/resourceApi.types";
import { resourceKeys } from "@api/resources/resourceKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useChangeResourceStatus(id: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: ChangeResourceStatusRequest) => resourceApi.changeStatus(id, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: resourceKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
			queryClient.invalidateQueries({ queryKey: resourceKeys.history(id) });
		}
	});
}
