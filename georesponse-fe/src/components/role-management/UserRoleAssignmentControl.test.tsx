/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests UserRoleAssignmentControl submits the typed user id
 *                and the selected role ids, and blocks submission until a
 *                user id is entered. useSetUserRoles is mocked so no real
 *                network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useSetUserRoles } from "@hooks/useSetUserRoles";

import UserRoleAssignmentControl from "./UserRoleAssignmentControl";

vi.mock("@hooks/useSetUserRoles", () => ({
	useSetUserRoles: vi.fn()
}));

const mockedUseSetUserRoles = vi.mocked(useSetUserRoles);

const ROLES = [
	{ id: "role-admin", name: "Administrator", permissions: [] },
	{ id: "role-operator", name: "Operator", permissions: [] }
];

describe("UserRoleAssignmentControl", () => {
	it("disables submission until a user id is entered", () => {
		mockedUseSetUserRoles.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
			isSuccess: false,
			isError: false,
			error: null
		} as unknown as ReturnType<typeof useSetUserRoles>);

		render(<UserRoleAssignmentControl roles={ROLES} />);

		expect(screen.getByRole("button", { name: "Assign roles" })).toBeDisabled();
	});

	it("submits the typed user id and the selected role ids", () => {
		const mutate = vi.fn();
		mockedUseSetUserRoles.mockReturnValue({
			mutate,
			isPending: false,
			isSuccess: false,
			isError: false,
			error: null
		} as unknown as ReturnType<typeof useSetUserRoles>);

		render(<UserRoleAssignmentControl roles={ROLES} />);

		fireEvent.change(screen.getByLabelText("User ID"), { target: { value: "user-001" } });
		fireEvent.click(screen.getByRole("checkbox", { name: "Administrator" }));
		fireEvent.click(screen.getByRole("button", { name: "Assign roles" }));

		expect(mutate).toHaveBeenCalledWith({
			userId: "user-001",
			payload: { roles: ["role-admin"] }
		});
	});
});
