/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Mutation for PUT /api/v1/users/{id}/roles, restricted to
 *                callers holding `role.manage` (FR-030). Takes the target
 *                user's id at call time, not construction time — unlike
 *                the resource mutations, the id isn't known until the
 *                admin types it into the assignment control (there is no
 *                GET /api/v1/users to pick from; see
 *                UserRoleAssignmentControl.tsx).
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { authorizationApi } from "@api/authorization/authorizationApi";
import { SetUserRolesRequest } from "@api/authorization/authorizationApi.types";
import { useMutation } from "@tanstack/react-query";

export function useSetUserRoles() {
	return useMutation({
		mutationFn: ({ userId, payload }: { userId: string; payload: SetUserRolesRequest }) =>
			authorizationApi.setUserRoles(userId, payload)
	});
}
