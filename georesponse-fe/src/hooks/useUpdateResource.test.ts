/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests useUpdateResource calls resourceApi.update with the
 *                given id/payload and invalidates the resource-detail and
 *                list queries on success, with resourceApi mocked so no
 *                real network call is made.
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

import { useUpdateResource } from "./useUpdateResource";

vi.mock("@api/resources/resourceApi", () => ({
	resourceApi: { update: vi.fn() }
}));

describe("useUpdateResource", () => {
	it("calls resourceApi.update and invalidates the detail and list queries on success", async () => {
		vi.mocked(resourceApi.update).mockResolvedValueOnce({
			data: {
				id: "res-001",
				name: "Ambulance 13",
				type: "VEHICLE",
				status: "AVAILABLE",
				attributes: { vehicleType: "Ambulance", capacity: 6 },
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

		const { result } = renderHook(() => useUpdateResource("res-001"), { wrapper });

		const payload = {
			name: "Ambulance 13",
			type: "VEHICLE" as const,
			attributes: { vehicleType: "Ambulance", capacity: 6 }
		};
		result.current.mutate(payload);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(resourceApi.update).toHaveBeenCalledWith("res-001", payload);
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resourceKeys.detail("res-001") });
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resourceKeys.lists() });
	});
});
