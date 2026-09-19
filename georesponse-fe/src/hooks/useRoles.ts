/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Queries every role (GET /api/v1/roles), restricted to
 *                callers holding `role.read` — the query's `error` is how
 *                the frontend detects the caller lacks access (FR-032,
 *                BR-027), since the current user's own permission set
 *                isn't otherwise exposed to the frontend (GET
 *                /api/v1/auth/me returns role names, not permission
 *                codes).
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { authorizationApi } from "@api/authorization/authorizationApi";
import { authorizationKeys } from "@api/authorization/authorizationKeys";
import { useQuery } from "@tanstack/react-query";

export function useRoles() {
	return useQuery({
		queryKey: authorizationKeys.roles,
		queryFn: () => authorizationApi.listRoles(),
		retry: false
	});
}
