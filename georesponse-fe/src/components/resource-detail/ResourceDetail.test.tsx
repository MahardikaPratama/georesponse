/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : Tests ResourceDetail's loading, "not found", generic
 *                error, and populated states, and the status-change
 *                control's interaction and error display, with
 *                useResource/useChangeResourceStatus mocked so no real
 *                network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added the status-change control's tests (Phase 6
 *                        section 9.6), with useChangeResourceStatus now
 *                        mocked too — ResourceDetail calls it
 *                        unconditionally, so every existing test needed a
 *                        default return value even where it isn't the
 *                        thing under test.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@api/httpClient.types";
import { useChangeResourceStatus } from "@hooks/useChangeResourceStatus";
import { useResource } from "@hooks/useResource";

import ResourceDetail from "./ResourceDetail";

vi.mock("@hooks/useResource", () => ({
	useResource: vi.fn()
}));

vi.mock("@hooks/useChangeResourceStatus", () => ({
	useChangeResourceStatus: vi.fn()
}));

const mockedUseResource = vi.mocked(useResource);
const mockedUseChangeResourceStatus = vi.mocked(useChangeResourceStatus);

describe("ResourceDetail", () => {
	beforeEach(() => {
		mockedUseChangeResourceStatus.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
			isError: false,
			error: null
		} as unknown as ReturnType<typeof useChangeResourceStatus>);
	});

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

	// jsdom doesn't implement scrollIntoView; Dropdown calls it when it
	// opens with a pre-selected option (the status control always has one).
	// Same workaround Dropdown.test.tsx/SearchableDropdown.test.tsx use.
	Element.prototype.scrollIntoView = vi.fn();

	it("changes the status via the status-change control", () => {
		const mutate = vi.fn();
		mockedUseChangeResourceStatus.mockReturnValue({
			mutate,
			isPending: false,
			isError: false,
			error: null
		} as unknown as ReturnType<typeof useChangeResourceStatus>);
		mockedUseResource.mockReturnValue({
			status: "success",
			data: {
				data: {
					id: "res-001",
					name: "Ambulance 12",
					type: "VEHICLE",
					status: "AVAILABLE",
					attributes: { vehicleType: "Ambulance", capacity: 4 },
					location: { latitude: -6.2, longitude: 106.8166 }
				}
			},
			error: null
		} as unknown as ReturnType<typeof useResource>);

		render(<ResourceDetail resourceId="res-001" />);

		fireEvent.click(screen.getByRole("button", { name: "Available" }));
		fireEvent.click(screen.getByRole("button", { name: "Maintenance" }));

		expect(mutate).toHaveBeenCalledWith({ status: "MAINTENANCE" });
	});

	it("shows an inline error when the status change fails", () => {
		mockedUseChangeResourceStatus.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
			isError: true,
			error: new ApiError(500, { code: "PERSISTENCE_ERROR", message: "boom" })
		} as unknown as ReturnType<typeof useChangeResourceStatus>);
		mockedUseResource.mockReturnValue({
			status: "success",
			data: {
				data: {
					id: "res-001",
					name: "Ambulance 12",
					type: "VEHICLE",
					status: "AVAILABLE",
					attributes: { vehicleType: "Ambulance", capacity: 4 },
					location: { latitude: -6.2, longitude: 106.8166 }
				}
			},
			error: null
		} as unknown as ReturnType<typeof useResource>);

		render(<ResourceDetail resourceId="res-001" />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"The server could not complete the operation. Please try again."
		);
	});
});
