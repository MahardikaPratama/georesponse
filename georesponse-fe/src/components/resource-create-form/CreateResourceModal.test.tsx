/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : Tests CreateResourceModal's submit flow end to end:
 *                client-side validation blocks an invalid submit, a valid
 *                submit calls resourceApi.create and closes the modal, and
 *                a RESOURCE_ID_CONFLICT response is shown under the id
 *                field without closing. resourceApi is mocked so no real
 *                network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added a test for initialLocation pre-filling
 *                        latitude/longitude (the map-click-placement flow
 *                        AppShell wires up on a map double-click).
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { resourceApi } from "@api/resources/resourceApi";
import { ApiError } from "@api/httpClient.types";

import CreateResourceModal from "./CreateResourceModal";

vi.mock("@api/resources/resourceApi", () => ({
	resourceApi: { create: vi.fn() }
}));

function renderWithQueryClient(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
	});
	return render(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
	);
}

function fillValidForm() {
	fireEvent.change(screen.getByLabelText("ID"), { target: { value: "res-001" } });
	fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ambulance 12" } });
	fireEvent.change(screen.getByLabelText("Vehicle Type"), {
		target: { value: "Ambulance" }
	});
	fireEvent.change(screen.getByLabelText("Capacity"), { target: { value: "4" } });
	fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "-6.2" } });
	fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "106.8166" } });
}

describe("CreateResourceModal", () => {
	it("blocks submission and shows field errors when the form is invalid", () => {
		const onClose = vi.fn();
		renderWithQueryClient(<CreateResourceModal onClose={onClose} />);

		fireEvent.click(screen.getByRole("button", { name: "Create" }));

		expect(resourceApi.create).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
		expect(screen.getByText("ID is required.")).toBeInTheDocument();
	});

	it("creates the resource and closes on a valid submit", async () => {
		const onClose = vi.fn();
		vi.mocked(resourceApi.create).mockResolvedValueOnce({
			data: {
				id: "res-001",
				name: "Ambulance 12",
				type: "VEHICLE",
				status: "AVAILABLE",
				attributes: { vehicleType: "Ambulance", capacity: 4 },
				location: { latitude: -6.2, longitude: 106.8166 }
			}
		});

		renderWithQueryClient(<CreateResourceModal onClose={onClose} />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Create" }));

		await waitFor(() =>
			expect(resourceApi.create).toHaveBeenCalledWith({
				id: "res-001",
				name: "Ambulance 12",
				type: "VEHICLE",
				status: "AVAILABLE",
				attributes: { vehicleType: "Ambulance", capacity: 4 },
				location: { latitude: -6.2, longitude: 106.8166 }
			})
		);
		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});

	it("shows a RESOURCE_ID_CONFLICT response under the id field without closing", async () => {
		const onClose = vi.fn();
		vi.mocked(resourceApi.create).mockRejectedValueOnce(
			new ApiError(409, {
				code: "RESOURCE_ID_CONFLICT",
				message: "A resource with that ID already exists."
			})
		);

		renderWithQueryClient(<CreateResourceModal onClose={onClose} />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Create" }));

		expect(
			await screen.findByText("A resource with that ID already exists.")
		).toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("pre-fills latitude/longitude from initialLocation and shows the map-click hint", () => {
		const onClose = vi.fn();
		renderWithQueryClient(
			<CreateResourceModal
				onClose={onClose}
				initialLocation={{ latitude: -6.2, longitude: 106.8166 }}
			/>
		);

		expect(screen.getByLabelText("Latitude")).toHaveValue("-6.2");
		expect(screen.getByLabelText("Longitude")).toHaveValue("106.8166");
		expect(
			screen.getByText("Filled in from where you double-clicked the map.")
		).toBeInTheDocument();
	});
});
