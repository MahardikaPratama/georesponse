/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests ResourceDetail's loading, "not found", generic
 *                error, and populated states, with useResource mocked so
 *                no real network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@api/httpClient.types";
import { useResource } from "@hooks/useResource";

import ResourceDetail from "./ResourceDetail";

vi.mock("@hooks/useResource", () => ({
	useResource: vi.fn()
}));

const mockedUseResource = vi.mocked(useResource);

describe("ResourceDetail", () => {
	it("shows a loading placeholder while the query is pending", () => {
		mockedUseResource.mockReturnValue({
			status: "pending",
			data: undefined,
			error: null
		} as unknown as ReturnType<typeof useResource>);

		render(<ResourceDetail resourceId="res-001" />);

		expect(screen.getByTestId("resource-detail-skeleton")).toBeInTheDocument();
	});

	it("shows a distinct message for a resource that no longer exists", () => {
		mockedUseResource.mockReturnValue({
			status: "error",
			data: undefined,
			error: new ApiError(404, { code: "RESOURCE_NOT_FOUND", message: "Not found" })
		} as unknown as ReturnType<typeof useResource>);

		render(<ResourceDetail resourceId="res-001" />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"This resource could not be found. It may have been deleted."
		);
	});

	it("shows a generic error message derived from the error code for other failures", () => {
		mockedUseResource.mockReturnValue({
			status: "error",
			data: undefined,
			error: new ApiError(500, { code: "PERSISTENCE_ERROR", message: "boom" })
		} as unknown as ReturnType<typeof useResource>);

		render(<ResourceDetail resourceId="res-001" />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"The server could not complete the operation. Please try again."
		);
	});

	it("renders identity, type, status, location, and attributes, and calls onClose/onEdit", () => {
		const onClose = vi.fn();
		const onEdit = vi.fn();
		mockedUseResource.mockReturnValue({
			status: "success",
			data: {
				data: {
					id: "res-001",
					name: "Ambulance 12",
					type: "VEHICLE",
					status: "IN_USE",
					attributes: { vehicleType: "Ambulance", capacity: 4 },
					location: { latitude: -6.2, longitude: 106.8166 }
				}
			},
			error: null
		} as unknown as ReturnType<typeof useResource>);

		render(<ResourceDetail resourceId="res-001" onClose={onClose} onEdit={onEdit} />);

		expect(screen.getByText("Ambulance 12")).toBeInTheDocument();
		expect(screen.getByText("res-001")).toBeInTheDocument();
		expect(screen.getByText("Vehicle")).toBeInTheDocument();
		expect(screen.getByText("In Use")).toBeInTheDocument();
		expect(screen.getByText("-6.2000, 106.8166")).toBeInTheDocument();
		expect(screen.getByText("Vehicle Type")).toBeInTheDocument();
		expect(screen.getByText("Ambulance")).toBeInTheDocument();
		expect(screen.getByText("Capacity")).toBeInTheDocument();
		expect(screen.getByText("4")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Edit" }));
		expect(onEdit).toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: /close resource detail/i }));
		expect(onClose).toHaveBeenCalled();
	});
});
