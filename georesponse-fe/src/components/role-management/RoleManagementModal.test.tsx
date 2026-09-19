/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests RoleManagementModal's loading, blocked
 *                (AUTHORIZATION_DENIED), generic error, and populated
 *                states — the blocked case is the FR-032/BR-027
 *                "caller without permission is blocked rather than shown
 *                the management UI" requirement. useRoles/usePermissions/
 *                useSetRolePermissions/useSetUserRoles are mocked so no
 *                real network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@api/httpClient.types";
import { usePermissions } from "@hooks/usePermissions";
import { useRoles } from "@hooks/useRoles";
import { useSetRolePermissions } from "@hooks/useSetRolePermissions";
import { useSetUserRoles } from "@hooks/useSetUserRoles";

import RoleManagementModal from "./RoleManagementModal";

vi.mock("@hooks/useRoles", () => ({ useRoles: vi.fn() }));
vi.mock("@hooks/usePermissions", () => ({ usePermissions: vi.fn() }));
vi.mock("@hooks/useSetRolePermissions", () => ({ useSetRolePermissions: vi.fn() }));
vi.mock("@hooks/useSetUserRoles", () => ({ useSetUserRoles: vi.fn() }));

const mockedUseRoles = vi.mocked(useRoles);
const mockedUsePermissions = vi.mocked(usePermissions);
const mockedUseSetRolePermissions = vi.mocked(useSetRolePermissions);
const mockedUseSetUserRoles = vi.mocked(useSetUserRoles);

function pendingQuery() {
	return { status: "pending", data: undefined, error: null } as unknown;
}

describe("RoleManagementModal", () => {
	beforeEachSetup();

	function beforeEachSetup() {
		beforeEach(() => {
			mockedUseSetRolePermissions.mockReturnValue({
				mutate: vi.fn(),
				isPending: false
			} as unknown as ReturnType<typeof useSetRolePermissions>);
			mockedUseSetUserRoles.mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				isSuccess: false,
				isError: false,
				error: null
			} as unknown as ReturnType<typeof useSetUserRoles>);
		});
	}

	it("shows a loading state while roles/permissions are being fetched", () => {
		mockedUseRoles.mockReturnValue(pendingQuery() as ReturnType<typeof useRoles>);
		mockedUsePermissions.mockReturnValue(pendingQuery() as ReturnType<typeof usePermissions>);

		render(<RoleManagementModal onClose={vi.fn()} />);

		expect(screen.getByText(/loading/i)).toBeInTheDocument();
	});

	it("blocks the management UI when the caller lacks permission", () => {
		mockedUseRoles.mockReturnValue({
			status: "error",
			data: undefined,
			error: new ApiError(403, { code: "AUTHORIZATION_DENIED", message: "no" })
		} as unknown as ReturnType<typeof useRoles>);
		mockedUsePermissions.mockReturnValue({
			status: "error",
			data: undefined,
			error: new ApiError(403, { code: "AUTHORIZATION_DENIED", message: "no" })
		} as unknown as ReturnType<typeof usePermissions>);

		render(<RoleManagementModal onClose={vi.fn()} />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"You do not have permission to manage roles."
		);
		expect(screen.queryByText("Roles & Permissions")).not.toBeInTheDocument();
	});

	it("shows a generic error message for a non-permission failure", () => {
		mockedUseRoles.mockReturnValue({
			status: "error",
			data: undefined,
			error: new ApiError(500, { code: "PERSISTENCE_ERROR", message: "boom" })
		} as unknown as ReturnType<typeof useRoles>);
		mockedUsePermissions.mockReturnValue(pendingQuery() as ReturnType<typeof usePermissions>);

		render(<RoleManagementModal onClose={vi.fn()} />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"The server could not complete the operation. Please try again."
		);
	});

	it("renders the permission matrix and user-role assignment control for an authorized caller", () => {
		mockedUseRoles.mockReturnValue({
			status: "success",
			data: {
				data: [
					{ id: "role-admin", name: "Administrator", permissions: ["role.read", "role.manage"] },
					{ id: "role-operator", name: "Operator", permissions: [] }
				]
			},
			error: null
		} as unknown as ReturnType<typeof useRoles>);
		mockedUsePermissions.mockReturnValue({
			status: "success",
			data: {
				data: [
					{ id: "perm-1", code: "role.read", name: "Read Roles" },
					{ id: "perm-2", code: "role.manage", name: "Manage Roles" }
				]
			},
			error: null
		} as unknown as ReturnType<typeof usePermissions>);

		render(<RoleManagementModal onClose={vi.fn()} />);

		expect(screen.getByText("Administrator")).toBeInTheDocument();
		expect(screen.getByText("Operator")).toBeInTheDocument();
		expect(
			screen.getByRole("checkbox", { name: "Read Roles for Administrator" })
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Read Roles for Operator" })
		).not.toBeChecked();

		expect(screen.getByLabelText("User ID")).toBeInTheDocument();
	});

	it("toggling a role's permission calls useSetRolePermissions with the updated set", () => {
		const mutate = vi.fn();
		mockedUseSetRolePermissions.mockReturnValue({
			mutate,
			isPending: false
		} as unknown as ReturnType<typeof useSetRolePermissions>);
		mockedUseRoles.mockReturnValue({
			status: "success",
			data: {
				data: [{ id: "role-operator", name: "Operator", permissions: ["role.read"] }]
			},
			error: null
		} as unknown as ReturnType<typeof useRoles>);
		mockedUsePermissions.mockReturnValue({
			status: "success",
			data: {
				data: [
					{ id: "perm-1", code: "role.read", name: "Read Roles" },
					{ id: "perm-2", code: "role.manage", name: "Manage Roles" }
				]
			},
			error: null
		} as unknown as ReturnType<typeof usePermissions>);

		render(<RoleManagementModal onClose={vi.fn()} />);

		fireEvent.click(screen.getByRole("checkbox", { name: "Manage Roles for Operator" }));

		expect(mutate).toHaveBeenCalledWith({ permissions: ["role.read", "role.manage"] });
	});
});
