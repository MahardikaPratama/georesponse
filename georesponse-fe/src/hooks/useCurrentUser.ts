/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Queries the authenticated user (GET /api/v1/auth/me).
 *                The authenticated user is server state, per
 *                FRONTEND_STATE.md's client/server state boundary — not
 *                a client-side store — so components/App.tsx use this to
 *                decide whether to show the login form or the app shell.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { authApi } from "@api/auth/authApi";
import { authKeys } from "@api/auth/authKeys";
import { ApiError } from "@api/httpClient.types";
import { useQuery } from "@tanstack/react-query";

/**
 * Returns the authenticated user, or undefined while loading or when no
 * one is authenticated (a 401 from GET /auth/me is expected, not an
 * error condition to retry or surface — it just means "logged out").
 */
export function useCurrentUser() {
	return useQuery({
		queryKey: authKeys.me(),
		queryFn: async () => (await authApi.me()).data,
		retry: (failureCount, error) => {
			if (error instanceof ApiError && error.status === 401) return false;
			return failureCount < 2;
		},
		staleTime: 5 * 60 * 1000
	});
}
