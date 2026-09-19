/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Mutation for POST /api/v1/auth/logout. Clears every
 *                cached query on success, not just the current-user
 *                query, so no other user's data lingers in the cache
 *                for whoever logs in next on the same browser.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { authApi } from "@api/auth/authApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useLogout() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => authApi.logout(),
		onSuccess: () => {
			queryClient.clear();
		}
	});
}
