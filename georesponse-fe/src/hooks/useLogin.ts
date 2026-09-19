/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Mutation for POST /api/v1/auth/login. On success, seeds
 *                the current-user query directly from the response
 *                instead of refetching, so the app shell appears
 *                immediately.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { authApi } from "@api/auth/authApi";
import { authKeys } from "@api/auth/authKeys";
import { LoginRequest } from "@api/auth/authApi.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useLogin() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: LoginRequest) => authApi.login(payload),
		onSuccess: (response) => {
			queryClient.setQueryData(authKeys.me(), response.data);
		}
	});
}
