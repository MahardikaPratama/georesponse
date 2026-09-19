/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests useChangeResourceStatus calls resourceApi.changeStatus
 *                with the given id/payload and invalidates the
 *                resource-detail, list, and history queries on success,
 *                with resourceApi mocked so no real network call is made.
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

import { useChangeResourceStatus } from "./useChangeResourceStatus";

vi.mock("@api/resources/resourceApi", () => ({
	resourceApi: { changeStatus: vi.fn() }
}));

describe("useChangeResourceStatus", () => {
	it("calls resourceApi.changeStatus and invalidates the detail, list, and history queries on success", async () => {
		vi.mocked(resourceApi.changeStatus).mockResolvedValueOnce({
			data: {
				id: "res-001",
				name: "Ambulance 12",
				type: "VEHICLE",
				status: "MAINTENANCE",
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

		const { result } = renderHook(() => useChangeResourceStatus("res-001"), { wrapper });

		result.current.mutate({ status: "MAINTENANCE" });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(resourceApi.changeStatus).toHaveBeenCalledWith("res-001", { status: "MAINTENANCE" });
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resourceKeys.detail("res-001") });
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resourceKeys.lists() });
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resourceKeys.history("res-001") });
	});
});
