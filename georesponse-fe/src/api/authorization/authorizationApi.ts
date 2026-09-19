/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Data-access functions for /api/v1/roles,
 *                /api/v1/permissions, and /api/v1/users/{id}/roles
 *                (API_CONTRACT.md section 10). Called only from hooks —
 *                never directly from a component.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { httpClient } from "@api/httpClient";
import { DataEnvelope } from "@api/httpClient.types";

import {
	Permission,
	Role,
	SetRolePermissionsRequest,
	SetUserRolesRequest
} from "./authorizationApi.types";

export const authorizationApi = {
	listRoles(): Promise<DataEnvelope<Role[]>> {
		return httpClient.get<Role[]>("/roles");
	},

	listPermissions(): Promise<DataEnvelope<Permission[]>> {
		return httpClient.get<Permission[]>("/permissions");
	},

	setRolePermissions(roleId: string, payload: SetRolePermissionsRequest): Promise<void> {
		return httpClient.putNoContent(`/roles/${roleId}/permissions`, payload);
	},

	setUserRoles(userId: string, payload: SetUserRolesRequest): Promise<void> {
		return httpClient.putNoContent(`/users/${userId}/roles`, payload);
	}
};
