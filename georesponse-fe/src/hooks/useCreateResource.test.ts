/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests useCreateResource calls resourceApi.create and
 *                invalidates the resource list query on success, with
 *                resourceApi mocked so no real network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { resourceApi } from "@api/resources/resourceApi";
import { resourceKeys } from "@api/resources/resourceKeys";

import { useCreateResource } from "./useCreateResource";

vi.mock("@api/resources/resourceApi", () => ({
	resourceApi: { create: vi.fn() }
}));

describe("useCreateResource", () => {
	it("calls resourceApi.create and invalidates the resource list query on success", async () => {
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

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
		});
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		function wrapper({ children }: { children: React.ReactNode }) {
			return React.createElement(QueryClientProvider, { client: queryClient }, children);
		}

		const { result } = renderHook(() => useCreateResource(), { wrapper });

		const payload = {
			id: "res-001",
			name: "Ambulance 12",
			type: "VEHICLE" as const,
			status: "AVAILABLE" as const,
			attributes: { vehicleType: "Ambulance", capacity: 4 },
			location: { latitude: -6.2, longitude: 106.8166 }
		};
		result.current.mutate(payload);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(resourceApi.create).toHaveBeenCalledWith(payload);
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resourceKeys.lists() });
	});
});
