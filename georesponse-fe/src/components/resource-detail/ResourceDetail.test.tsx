/*
 * Author       : Mahardika Pratama
 * Version      : 1.4.0
 * Created Date : 2026-09-19
 * Description  : Tests ResourceDetail's loading, "not found", generic
 *                error, and populated states, the status-change control's
 *                interaction and error display, the relocate control's
 *                interaction and validation, and the delete action, with
 *                useResource/useChangeResourceStatus/useRelocateResource
 *                mocked so no real network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added the status-change control's tests, with
 *                        useChangeResourceStatus now mocked too —
 *                        ResourceDetail calls it unconditionally, so every
 *                        existing test needed a default return value even
 *                        where it isn't the thing under test.
 * - 1.2.0 (2026-09-19): Added the relocate control's tests, with
 *                        useRelocateResource now mocked too —
 *                        RelocateResourceControl (rendered inside
 *                        ResourceDetail) calls it unconditionally.
 * - 1.3.0 (2026-09-19): Added an onDelete assertion for the new delete
 *                        action — the confirmation dialog itself is
 *                        DeleteResourceConfirmation.test.tsx.
 * - 1.4.0 (2026-09-19): Added a test for the history toggle, with
 *                        useResourceHistory now mocked too —
 *                        ResourceHistoryView (mounted once toggled open)
 *                        calls it; the view's own states are
 *                        ResourceHistoryView.test.tsx's job.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@api/httpClient.types";
import { useChangeResourceStatus } from "@hooks/useChangeResourceStatus";
import { useRelocateResource } from "@hooks/useRelocateResource";
import { useResource } from "@hooks/useResource";
import { useResourceHistory } from "@hooks/useResourceHistory";

import ResourceDetail from "./ResourceDetail";

vi.mock("@hooks/useResource", () => ({
	useResource: vi.fn()
}));

vi.mock("@hooks/useChangeResourceStatus", () => ({
	useChangeResourceStatus: vi.fn()
}));

vi.mock("@hooks/useRelocateResource", () => ({
	useRelocateResource: vi.fn()
}));

vi.mock("@hooks/useResourceHistory", () => ({
	useResourceHistory: vi.fn()
}));

const mockedUseResource = vi.mocked(useResource);
const mockedUseChangeResourceStatus = vi.mocked(useChangeResourceStatus);
const mockedUseRelocateResource = vi.mocked(useRelocateResource);
const mockedUseResourceHistory = vi.mocked(useResourceHistory);

describe("ResourceDetail", () => {
	beforeEach(() => {
		mockedUseChangeResourceStatus.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
			isError: false,
			error: null
		} as unknown as ReturnType<typeof useChangeResourceStatus>);
		mockedUseRelocateResource.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
			isError: false,
			error: null
		} as unknown as ReturnType<typeof useRelocateResource>);
		mockedUseResourceHistory.mockReturnValue({
			status: "success",
			data: { data: { statusHistory: [], locationHistory: [], changeHistory: [] } },
			error: null
		} as unknown as ReturnType<typeof useResourceHistory>);
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

	it("renders identity, type, status, location, and attributes, and calls onClose/onEdit/onDelete", () => {
		const onClose = vi.fn();
		const onEdit = vi.fn();
		const onDelete = vi.fn();
		const resource = {
			id: "res-001",
			name: "Ambulance 12",
			type: "VEHICLE",
			status: "IN_USE",
			attributes: { vehicleType: "Ambulance", capacity: 4 },
			location: { latitude: -6.2, longitude: 106.8166 }
		};
		mockedUseResource.mockReturnValue({
			status: "success",
			data: { data: resource },
			error: null
		} as unknown as ReturnType<typeof useResource>);

		render(
			<ResourceDetail
				resourceId="res-001"
				onClose={onClose}
				onEdit={onEdit}
				onDelete={onDelete}
			/>
		);

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

		fireEvent.click(screen.getByRole("button", { name: "Delete" }));
		expect(onDelete).toHaveBeenCalledWith(resource);

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

	it("relocates via the relocate control", () => {
		const mutate = vi.fn();
		mockedUseRelocateResource.mockReturnValue({
			mutate,
			isPending: false,
			isError: false,
			error: null
		} as unknown as ReturnType<typeof useRelocateResource>);
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

		fireEvent.click(screen.getByRole("button", { name: "Relocate" }));
		fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "-6.3" } });
		fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "106.9" } });
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(mutate).toHaveBeenCalledWith(
			{ latitude: -6.3, longitude: 106.9 },
			expect.objectContaining({ onSuccess: expect.any(Function) })
		);
	});

	it("blocks the relocate save and shows a field error for an out-of-range latitude", () => {
		const mutate = vi.fn();
		mockedUseRelocateResource.mockReturnValue({
			mutate,
			isPending: false,
			isError: false,
			error: null
		} as unknown as ReturnType<typeof useRelocateResource>);
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

		fireEvent.click(screen.getByRole("button", { name: "Relocate" }));
		fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "91" } });
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(mutate).not.toHaveBeenCalled();
		expect(screen.getByText("Latitude must be between -90 and 90.")).toBeInTheDocument();
	});

	it("toggles the history section open and closed", () => {
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

		expect(screen.queryByText("No status changes yet.")).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Show history" }));
		expect(useResourceHistory).toHaveBeenCalledWith("res-001");
		expect(screen.getByText("No status changes yet.")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Hide history" }));
		expect(screen.queryByText("No status changes yet.")).not.toBeInTheDocument();
	});
});
