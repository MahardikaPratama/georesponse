/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests UpdateResourceModal's loading/error states, that it
 *                pre-fills from the fetched resource with id shown
 *                read-only (BR-015), and its submit flow: a valid submit
 *                calls resourceApi.update and closes, an invalid submit is
 *                blocked with a field error. useResource and resourceApi
 *                are mocked so no real network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resourceApi } from "@api/resources/resourceApi";
import { useResource } from "@hooks/useResource";

import UpdateResourceModal from "./UpdateResourceModal";

vi.mock("@api/resources/resourceApi", () => ({
	resourceApi: { update: vi.fn() }
}));

vi.mock("@hooks/useResource", () => ({
	useResource: vi.fn()
}));

const mockedUseResource = vi.mocked(useResource);

const RESOURCE = {
	id: "res-001",
	name: "Ambulance 12",
	type: "VEHICLE" as const,
	status: "AVAILABLE" as const,
	attributes: { vehicleType: "Ambulance", capacity: 4 },
	location: { latitude: -6.2, longitude: 106.8166 }
};

function renderWithQueryClient(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
	});
	return render(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
	);
}

describe("UpdateResourceModal", () => {
	beforeEach(() => vi.mocked(resourceApi.update).mockClear());

	it("shows a loading state while the resource is being fetched", () => {
		mockedUseResource.mockReturnValue({
			status: "pending",
			data: undefined,
			error: null
		} as unknown as ReturnType<typeof useResource>);

		renderWithQueryClient(<UpdateResourceModal resourceId="res-001" onClose={vi.fn()} />);

		expect(screen.getByText(/loading/i)).toBeInTheDocument();
	});

	it("shows an error state when the resource fails to load", () => {
		mockedUseResource.mockReturnValue({
			status: "error",
			data: undefined,
			error: new Error("boom")
		} as unknown as ReturnType<typeof useResource>);

		renderWithQueryClient(<UpdateResourceModal resourceId="res-001" onClose={vi.fn()} />);

		expect(screen.getByRole("alert")).toBeInTheDocument();
	});

	it("pre-fills the form from the fetched resource, with id shown read-only", () => {
		mockedUseResource.mockReturnValue({
			status: "success",
			data: { data: RESOURCE },
			error: null
		} as unknown as ReturnType<typeof useResource>);

		renderWithQueryClient(<UpdateResourceModal resourceId="res-001" onClose={vi.fn()} />);

		expect(screen.getByText("res-001")).toBeInTheDocument();
		expect(screen.queryByDisplayValue("res-001")).not.toBeInTheDocument();
		expect(screen.getByDisplayValue("Ambulance 12")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Ambulance")).toBeInTheDocument();
		expect(screen.getByDisplayValue("4")).toBeInTheDocument();
	});

	it("updates the resource, preserving its id, and closes on a valid submit", async () => {
		const onClose = vi.fn();
		mockedUseResource.mockReturnValue({
			status: "success",
			data: { data: RESOURCE },
			error: null
		} as unknown as ReturnType<typeof useResource>);
		vi.mocked(resourceApi.update).mockResolvedValueOnce({
			data: { ...RESOURCE, name: "Ambulance 13" }
		});

		renderWithQueryClient(<UpdateResourceModal resourceId="res-001" onClose={onClose} />);

		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "Ambulance 13" }
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() =>
			expect(resourceApi.update).toHaveBeenCalledWith("res-001", {
				name: "Ambulance 13",
				type: "VEHICLE",
				attributes: { vehicleType: "Ambulance", capacity: 4 }
			})
		);
		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});

	it("blocks submission and shows a field error when the name is cleared", () => {
		mockedUseResource.mockReturnValue({
			status: "success",
			data: { data: RESOURCE },
			error: null
		} as unknown as ReturnType<typeof useResource>);

		renderWithQueryClient(<UpdateResourceModal resourceId="res-001" onClose={vi.fn()} />);

		fireEvent.change(screen.getByLabelText("Name"), { target: { value: "" } });
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(resourceApi.update).not.toHaveBeenCalled();
		expect(screen.getByText("Name is required.")).toBeInTheDocument();
	});
});
