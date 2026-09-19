/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Mutation for PUT /api/v1/roles/{id}/permissions,
 *                restricted to callers holding `role.manage`. On success,
 *                invalidates authorizationKeys.roles so the permission
 *                matrix reflects the change.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { authorizationApi } from "@api/authorization/authorizationApi";
import { SetRolePermissionsRequest } from "@api/authorization/authorizationApi.types";
import { authorizationKeys } from "@api/authorization/authorizationKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useSetRolePermissions(roleId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: SetRolePermissionsRequest) =>
			authorizationApi.setRolePermissions(roleId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authorizationKeys.roles });
		}
	});
}
