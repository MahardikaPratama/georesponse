/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Request/response shapes for /api/v1/roles,
 *                /api/v1/permissions, and /api/v1/users/{id}/roles.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */

export interface Role {
	id: string;
	name: string;
	permissions: string[];
}

export interface Permission {
	id: string;
	code: string;
	name: string;
}

export interface SetRolePermissionsRequest {
	permissions: string[];
}

export interface SetUserRolesRequest {
	roles: string[];
}
