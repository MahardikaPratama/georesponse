/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests ResourceList's loading, error, empty, and populated
 *                states, with useResources mocked so no real network call
 *                is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@api/httpClient.types";
import { useResources } from "@hooks/useResources";

import ResourceList from "./ResourceList";

vi.mock("@hooks/useResources", () => ({
	useResources: vi.fn()
}));

const mockedUseResources = vi.mocked(useResources);

describe("ResourceList", () => {
	it("shows a skeleton while the query is pending", () => {
		mockedUseResources.mockReturnValue({
			status: "pending",
			data: undefined,
			error: null,
			refetch: vi.fn(),
			isFetching: true
		} as unknown as ReturnType<typeof useResources>);

		render(<ResourceList />);

		expect(screen.getByTestId("resource-list-skeleton").children.length).toBeGreaterThan(0);
	});

	it("shows a retryable error message derived from the error code", () => {
		const refetch = vi.fn();
		mockedUseResources.mockReturnValue({
			status: "error",
			data: undefined,
			error: new ApiError(500, { code: "PERSISTENCE_ERROR", message: "boom" }),
			refetch,
			isFetching: false
		} as unknown as ReturnType<typeof useResources>);

		render(<ResourceList />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"The server could not complete the operation. Please try again."
		);

		fireEvent.click(screen.getByRole("button", { name: /retry/i }));
		expect(refetch).toHaveBeenCalled();
	});

	it("shows an explicit empty state when the list is empty", () => {
		mockedUseResources.mockReturnValue({
			status: "success",
			data: { data: [], meta: { page: 1, pageSize: 20, total: 0 } },
			error: null,
			refetch: vi.fn(),
			isFetching: false
		} as unknown as ReturnType<typeof useResources>);

		render(<ResourceList />);

		expect(screen.getByText(/no resources match/i)).toBeInTheDocument();
	});

	it("renders identity, type, status, and location per row, and reports selection", () => {
		const onSelectResource = vi.fn();
		mockedUseResources.mockReturnValue({
			status: "success",
			data: {
				data: [
					{
						id: "res-001",
						name: "Ambulance 12",
						type: "VEHICLE",
						status: "AVAILABLE",
						attributes: {},
						location: { latitude: -6.2, longitude: 106.8166 }
					}
				],
				meta: { page: 1, pageSize: 20, total: 1 }
			},
			error: null,
			refetch: vi.fn(),
			isFetching: false
		} as unknown as ReturnType<typeof useResources>);

		render(<ResourceList onSelectResource={onSelectResource} />);

		expect(screen.getByText("Ambulance 12")).toBeInTheDocument();
		expect(screen.getByText("Vehicle")).toBeInTheDocument();
		expect(screen.getByText("Available")).toBeInTheDocument();
		expect(screen.getByText("-6.2000, 106.8166")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /Ambulance 12/i }));
		expect(onSelectResource).toHaveBeenCalledWith("res-001");
	});
});
