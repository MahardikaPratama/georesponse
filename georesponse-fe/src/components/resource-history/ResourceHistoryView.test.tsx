/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests ResourceHistoryView's loading/error states, tab
 *                switching between status/location/change history, and
 *                each tab's empty state, with useResourceHistory mocked
 *                so no real network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useResourceHistory } from "@hooks/useResourceHistory";

import ResourceHistoryView from "./ResourceHistoryView";

vi.mock("@hooks/useResourceHistory", () => ({
	useResourceHistory: vi.fn()
}));

const mockedUseResourceHistory = vi.mocked(useResourceHistory);

describe("ResourceHistoryView", () => {
	it("shows empty states for every category when there is no history", () => {
		mockedUseResourceHistory.mockReturnValue({
			status: "success",
			data: { data: { statusHistory: [], locationHistory: [], changeHistory: [] } },
			error: null
		} as unknown as ReturnType<typeof useResourceHistory>);

		render(<ResourceHistoryView resourceId="res-001" />);

		expect(screen.getByText("No status changes yet.")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Location" }));
		expect(screen.getByText("No relocations yet.")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Changes" }));
		expect(screen.getByText("No other changes yet.")).toBeInTheDocument();
	});

	it("renders status, location, and change entries under their own tab", () => {
		mockedUseResourceHistory.mockReturnValue({
			status: "success",
			data: {
				data: {
					statusHistory: [
						{
							id: "sh-1",
							resourceId: "res-001",
							previousStatus: "AVAILABLE",
							newStatus: "MAINTENANCE",
							changedAt: "2026-09-19T10:00:00Z",
							changedBy: "operator-1"
						}
					],
					locationHistory: [
						{
							id: "lh-1",
							resourceId: "res-001",
							previousLocation: { latitude: -6.2, longitude: 106.8166 },
							newLocation: { latitude: -6.3, longitude: 106.9 },
							changedAt: "2026-09-19T11:00:00Z"
						}
					],
					changeHistory: [
						{
							id: "ch-1",
							resourceId: "res-001",
							changes: [{ field: "name", before: "Old", after: "New" }],
							changedAt: "2026-09-19T12:00:00Z"
						}
					]
				}
			},
			error: null
		} as unknown as ReturnType<typeof useResourceHistory>);

		render(<ResourceHistoryView resourceId="res-001" />);

		expect(screen.getByText("Available → Maintenance")).toBeInTheDocument();
		expect(screen.getByText(/operator-1/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Location" }));
		expect(
			screen.getByText("-6.2000, 106.8166 → -6.3000, 106.9000")
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Changes" }));
		expect(screen.getByText("name: Old → New")).toBeInTheDocument();
	});

	it("shows an error message when the history query fails", () => {
		mockedUseResourceHistory.mockReturnValue({
			status: "error",
			data: undefined,
			error: new Error("boom")
		} as unknown as ReturnType<typeof useResourceHistory>);

		render(<ResourceHistoryView resourceId="res-001" />);

		expect(screen.getByRole("alert")).toBeInTheDocument();
	});
});
