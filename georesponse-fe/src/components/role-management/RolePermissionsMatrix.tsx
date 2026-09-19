/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : The roles/permissions management view (FR-030-033,
 *                UC-12): one row per role, one checkbox per permission,
 *                each toggle immediately calling useSetRolePermissions
 *                for that role (self-saving, same immediate-mutate
 *                pattern as ResourceDetail's status Dropdown — no
 *                separate "Save" step).
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";

import { Permission, Role } from "@api/authorization/authorizationApi.types";
import { useSetRolePermissions } from "@hooks/useSetRolePermissions";

function RoleRow({ role, permissions }: { role: Role; permissions: Permission[] }) {
	const setRolePermissions = useSetRolePermissions(role.id);

	function togglePermission(code: string) {
		const next = role.permissions.includes(code)
			? role.permissions.filter((existing) => existing !== code)
			: [...role.permissions, code];
		setRolePermissions.mutate({ permissions: next });
	}

	return (
		<tr>
			<td className="py-2 pr-4 align-top font-medium text-white">{role.name}</td>
			{permissions.map((permission) => (
				<td key={permission.id} className="px-2 py-2 text-center align-top">
					<input
						type="checkbox"
						aria-label={`${permission.name} for ${role.name}`}
						checked={role.permissions.includes(permission.code)}
						disabled={setRolePermissions.isPending}
						onChange={() => togglePermission(permission.code)}
					/>
				</td>
			))}
		</tr>
	);
}

interface RolePermissionsMatrixProps {
	roles: Role[];
	permissions: Permission[];
}

function RolePermissionsMatrix({ roles, permissions }: RolePermissionsMatrixProps) {
	return (
		<table className="w-full text-sm text-white">
			<thead>
				<tr>
					<th className="pr-4 text-left">Role</th>
					{permissions.map((permission) => (
						<th key={permission.id} className="px-2 py-1 text-xs font-normal text-neutral-3">
							{permission.name}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{roles.map((role) => (
					<RoleRow key={role.id} role={role} permissions={permissions} />
				))}
			</tbody>
		</table>
	);
}

export default RolePermissionsMatrix;
