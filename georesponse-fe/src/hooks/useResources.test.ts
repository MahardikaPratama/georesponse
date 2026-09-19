/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests useResources calls resourceApi.list with the given
 *                filters and exposes the resulting list, with resourceApi
 *                mocked so no real network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { resourceApi } from "@api/resources/resourceApi";

import { useResources } from "./useResources";

vi.mock("@api/resources/resourceApi", () => ({
	resourceApi: { list: vi.fn() }
}));

function wrapper({ children }: { children: React.ReactNode }) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } }
	});
	return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useResources", () => {
	it("calls resourceApi.list with the given filters and returns the list", async () => {
		vi.mocked(resourceApi.list).mockResolvedValueOnce({
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
		});

		const { result } = renderHook(() => useResources({ type: "VEHICLE" }), { wrapper });

		await waitFor(() => expect(result.current.status).toBe("success"));

		expect(resourceApi.list).toHaveBeenCalledWith({ type: "VEHICLE" });
		expect(result.current.data?.data).toHaveLength(1);
	});
});
