/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests AuditLogModal's blocked (AUTHORIZATION_DENIED,
 *                even while another aspect would otherwise still read as
 *                loading — the bug RoleManagementModal had), generic
 *                error, empty, and populated states, with useAuditLogs
 *                mocked so no real network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@api/httpClient.types";
import { useAuditLogs } from "@hooks/useAuditLogs";

import AuditLogModal from "./AuditLogModal";

vi.mock("@hooks/useAuditLogs", () => ({
	useAuditLogs: vi.fn()
}));

const mockedUseAuditLogs = vi.mocked(useAuditLogs);

describe("AuditLogModal", () => {
	it("blocks the view when the caller lacks permission", () => {
		mockedUseAuditLogs.mockReturnValue({
			status: "error",
			data: undefined,
			error: new ApiError(403, { code: "AUTHORIZATION_DENIED", message: "no" })
		} as unknown as ReturnType<typeof useAuditLogs>);

		render(<AuditLogModal onClose={vi.fn()} />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"You do not have permission to view the audit trail."
		);
		expect(screen.queryByText("Audit Trail")).not.toBeInTheDocument();
	});

	it("shows a generic error message for a non-permission failure", () => {
		mockedUseAuditLogs.mockReturnValue({
			status: "error",
			data: undefined,
			error: new ApiError(500, { code: "PERSISTENCE_ERROR", message: "boom" })
		} as unknown as ReturnType<typeof useAuditLogs>);

		render(<AuditLogModal onClose={vi.fn()} />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"The server could not complete the operation. Please try again."
		);
	});

	it("shows a loading state while pending", () => {
		mockedUseAuditLogs.mockReturnValue({
			status: "pending",
			data: undefined,
			error: null
		} as unknown as ReturnType<typeof useAuditLogs>);

		render(<AuditLogModal onClose={vi.fn()} />);

		expect(screen.getByText(/loading/i)).toBeInTheDocument();
	});

	it("shows an explicit empty state when there are no matching records", () => {
		mockedUseAuditLogs.mockReturnValue({
			status: "success",
			data: { data: [], meta: { page: 1, pageSize: 20, total: 0 } },
			error: null
		} as unknown as ReturnType<typeof useAuditLogs>);

		render(<AuditLogModal onClose={vi.fn()} />);

		expect(screen.getByText(/no audit records match/i)).toBeInTheDocument();
	});

	it("renders audit records with operation, user, and resource", () => {
		mockedUseAuditLogs.mockReturnValue({
			status: "success",
			data: {
				data: [
					{
						id: "audit-1",
						operation: "RESOURCE_CREATED",
						userId: "user-001",
						resourceId: "res-001",
						occurredAt: "2026-09-19T10:00:00Z",
						details: {}
					}
				],
				meta: { page: 1, pageSize: 20, total: 1 }
			},
			error: null
		} as unknown as ReturnType<typeof useAuditLogs>);

		render(<AuditLogModal onClose={vi.fn()} />);

		expect(screen.getByText("Resource Created")).toBeInTheDocument();
		expect(screen.getByText(/user-001/)).toBeInTheDocument();
		expect(screen.getByText(/res-001/)).toBeInTheDocument();
	});
});
