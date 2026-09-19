/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Queries every defined permission (GET
 *                /api/v1/permissions), restricted to callers holding
 *                `permission.read`.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { authorizationApi } from "@api/authorization/authorizationApi";
import { authorizationKeys } from "@api/authorization/authorizationKeys";
import { useQuery } from "@tanstack/react-query";

export function usePermissions() {
	return useQuery({
		queryKey: authorizationKeys.permissions,
		queryFn: () => authorizationApi.listPermissions(),
		retry: false
	});
}
