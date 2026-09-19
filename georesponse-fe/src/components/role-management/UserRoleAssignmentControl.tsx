/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : The user-role assignment control (FR-030, UC-12): pick a
 *                set of roles and assign them to a user, replacing that
 *                user's full role set (PUT /api/v1/users/{id}/roles).
 *
 *                The user is identified by typing their id, not picked
 *                from a list — there is no GET /api/v1/users (or
 *                equivalent) endpoint in API_CONTRACT.md section 10 or
 *                the backend to enumerate users, only
 *                PUT /api/v1/users/{id}/roles itself. A real user picker
 *                is blocked on that gap, not on this control.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React, { useState } from "react";

import { Role } from "@api/authorization/authorizationApi.types";
import { useSetUserRoles } from "@hooks/useSetUserRoles";
import { getApiErrorMessage } from "@utils/apiErrorMessage";

interface UserRoleAssignmentControlProps {
	roles: Role[];
}

function UserRoleAssignmentControl({ roles }: UserRoleAssignmentControlProps) {
	const [userId, setUserId] = useState("");
	const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
	const setUserRoles = useSetUserRoles();

	function toggleRole(roleId: string) {
		setSelectedRoleIds((current) =>
			current.includes(roleId)
				? current.filter((existing) => existing !== roleId)
				: [...current, roleId]
		);
	}

	function handleSubmit() {
		if (userId.trim().length === 0) return;
		setUserRoles.mutate({ userId: userId.trim(), payload: { roles: selectedRoleIds } });
	}

	return (
		<div className="flex flex-col gap-2">
			<label className="flex flex-col gap-1 text-sm text-white" htmlFor="user-role-assignment-user-id">
				User ID
				<input
					id="user-role-assignment-user-id"
					value={userId}
					onChange={(event) => setUserId(event.target.value)}
					disabled={setUserRoles.isPending}
					className="h-9 rounded-md border border-transparent bg-background-100-1 px-3 text-sm text-white outline-none focus:border-primary-20"
				/>
			</label>

			<div className="flex flex-wrap gap-3 text-sm text-white">
				{roles.map((role) => (
					<label key={role.id} className="flex items-center gap-1.5">
						<input
							type="checkbox"
							checked={selectedRoleIds.includes(role.id)}
							disabled={setUserRoles.isPending}
							onChange={() => toggleRole(role.id)}
						/>
						{role.name}
					</label>
				))}
			</div>

			<button
				type="button"
				onClick={handleSubmit}
				disabled={setUserRoles.isPending || userId.trim().length === 0}
				className="self-start px-3 py-1 text-sm rounded-md bg-primary-20 hover:bg-primary-50 disabled:opacity-50"
			>
				{setUserRoles.isPending ? "Assigning…" : "Assign roles"}
			</button>

			{setUserRoles.isSuccess && <p className="text-xs text-success-1">Roles assigned.</p>}
			{setUserRoles.isError && (
				<p role="alert" className="text-xs text-error-4">
					{getApiErrorMessage(setUserRoles.error)}
				</p>
			)}
		</div>
	);
}

export default UserRoleAssignmentControl;
