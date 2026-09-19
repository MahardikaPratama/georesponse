/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : Wraps the role/permission management view and the
 *                user-role assignment control in the shared Modal
 *                component. Restricted to users with the required
 *                permission (FR-032, BR-027): GET /api/v1/roles and GET
 *                /api/v1/permissions are themselves permission-gated
 *                (role.read), so an AUTHORIZATION_DENIED response from
 *                either is how this component detects the caller lacks
 *                access and blocks the management UI, rather than
 *                rendering it and letting each mutation fail individually.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Fixed the state priority: blocked/error are now
 *                        checked before "loading" — previously, if one
 *                        query had already errored while the other was
 *                        still pending, isLoading stayed true forever and
 *                        the error never surfaced. What CI's run caught.
 */
import React from "react";

import { ApiError } from "@api/httpClient.types";
import Modal from "@common/modals/modal/Modal";
import { usePermissions } from "@hooks/usePermissions";
import { useRoles } from "@hooks/useRoles";
import { getApiErrorMessage } from "@utils/apiErrorMessage";

import RolePermissionsMatrix from "./RolePermissionsMatrix";
import UserRoleAssignmentControl from "./UserRoleAssignmentControl";

interface RoleManagementModalProps {
	onClose: () => void;
}

function isForbidden(error: unknown): boolean {
	return error instanceof ApiError && error.code === "AUTHORIZATION_DENIED";
}

function RoleManagementModal({ onClose }: RoleManagementModalProps) {
	const rolesQuery = useRoles();
	const permissionsQuery = usePermissions();

	const isBlocked = isForbidden(rolesQuery.error) || isForbidden(permissionsQuery.error);
	const isOtherError = rolesQuery.status === "error" || permissionsQuery.status === "error";
	const isLoading = rolesQuery.status === "pending" || permissionsQuery.status === "pending";

	// Checked in this order deliberately: an error on one query must
	// surface even while the other is still pending, not get stuck behind
	// an isLoading check that stays true until both settle.
	if (isBlocked) {
		return (
			<Modal handleClose={onClose} handleConfirm={onClose} label="Close">
				<p role="alert" className="px-6 text-sm text-white">
					You do not have permission to manage roles.
				</p>
			</Modal>
		);
	}

	if (isOtherError) {
		return (
			<Modal handleClose={onClose} handleConfirm={onClose} label="Close">
				<p role="alert" className="px-6 text-sm text-white">
					{getApiErrorMessage(rolesQuery.error ?? permissionsQuery.error)}
				</p>
			</Modal>
		);
	}

	if (isLoading) {
		return (
			<Modal handleClose={onClose} handleConfirm={onClose} label="Close" disabled>
				<p className="px-6 text-sm text-white">Loading…</p>
			</Modal>
		);
	}

	const roles = rolesQuery.data.data;
	const permissions = permissionsQuery.data.data;

	return (
		<Modal handleClose={onClose} handleConfirm={onClose} label="Close">
			<div className="flex flex-col w-full max-w-2xl gap-4 px-6 text-white">
				<h2 className="text-lg font-bold">Roles & Permissions</h2>
				<RolePermissionsMatrix roles={roles} permissions={permissions} />

				<h3 className="mt-2 text-sm font-bold">Assign Roles to a User</h3>
				<UserRoleAssignmentControl roles={roles} />
			</div>
		</Modal>
	);
}

export default RoleManagementModal;
