/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Mutation for PATCH /api/v1/resources/{id}/location
 *                (FR-022-026, UC-09). Applies an optimistic update
 *                (FRONTEND_STATE.md section 7 names relocation as exactly
 *                the case for this — "dragging a marker should feel
 *                immediate"): on mutate, the resource's cached location is
 *                updated straight away in both the detail and every
 *                matching list query, so the marker moves before the
 *                backend confirms; on error, it's rolled back and the
 *                error surfaced; either way, the affected queries are
 *                invalidated afterward so the cache converges with the
 *                backend's actual state.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { DataEnvelope, ListEnvelope } from "@api/httpClient.types";
import { resourceApi } from "@api/resources/resourceApi";
import { RelocateResourceRequest } from "@api/resources/resourceApi.types";
import { resourceKeys } from "@api/resources/resourceKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { Resource } from "../types/resource.types";

interface RelocationSnapshot {
	previousDetail: DataEnvelope<Resource> | undefined;
	previousLists: [readonly unknown[], ListEnvelope<Resource> | undefined][];
}

export function useRelocateResource(id: string) {
	const queryClient = useQueryClient();

	return useMutation<
		DataEnvelope<Resource>,
		unknown,
		RelocateResourceRequest,
		RelocationSnapshot
	>({
		mutationFn: (payload: RelocateResourceRequest) => resourceApi.relocate(id, payload),

		onMutate: async (payload) => {
			await queryClient.cancelQueries({ queryKey: resourceKeys.detail(id) });
			await queryClient.cancelQueries({ queryKey: resourceKeys.lists() });

			const previousDetail = queryClient.getQueryData<DataEnvelope<Resource>>(
				resourceKeys.detail(id)
			);
			const previousLists = queryClient.getQueriesData<ListEnvelope<Resource>>({
				queryKey: resourceKeys.lists()
			});

			queryClient.setQueryData<DataEnvelope<Resource>>(resourceKeys.detail(id), (old) =>
				old ? { data: { ...old.data, location: payload } } : old
			);
			queryClient.setQueriesData<ListEnvelope<Resource>>(
				{ queryKey: resourceKeys.lists() },
				(old) =>
					old
						? {
								...old,
								data: old.data.map((resource) =>
									resource.id === id
										? { ...resource, location: payload }
										: resource
								)
							}
						: old
			);

			return { previousDetail, previousLists };
		},

		onError: (_error, _payload, context) => {
			if (!context) return;
			queryClient.setQueryData(resourceKeys.detail(id), context.previousDetail);
			for (const [queryKey, data] of context.previousLists) {
				queryClient.setQueryData(queryKey, data);
			}
		},

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: resourceKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
			queryClient.invalidateQueries({ queryKey: resourceKeys.history(id) });
		}
	});
}
