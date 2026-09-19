/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Queries a resource's history (GET
 *                /api/v1/resources/{id}/history), per FRONTEND_UI_UX.md
 *                section 5 and the resourceKeys factory in
 *                FRONTEND_STATE.md section 5.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { resourceApi } from "@api/resources/resourceApi";
import { resourceKeys } from "@api/resources/resourceKeys";
import { useQuery } from "@tanstack/react-query";

export function useResourceHistory(id: string) {
	return useQuery({
		queryKey: resourceKeys.history(id),
		queryFn: () => resourceApi.history(id)
	});
}
