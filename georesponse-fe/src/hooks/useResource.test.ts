/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests useResource calls resourceApi.get with the given id
 *                and exposes the result, and stays disabled while id is
 *                null, with resourceApi mocked so no real network call is
 *                made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { resourceApi } from "@api/resources/resourceApi";

import { useResource } from "./useResource";

vi.mock("@api/resources/resourceApi", () => ({
	resourceApi: { get: vi.fn() }
}));

function wrapper({ children }: { children: React.ReactNode }) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } }
	});
	return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useResource", () => {
	it("calls resourceApi.get with the given id and returns the resource", async () => {
		vi.mocked(resourceApi.get).mockResolvedValueOnce({
			data: {
				id: "res-001",
				name: "Ambulance 12",
				type: "VEHICLE",
				status: "AVAILABLE",
				attributes: {},
				location: { latitude: -6.2, longitude: 106.8166 }
			}
		});

		const { result } = renderHook(() => useResource("res-001"), { wrapper });

		await waitFor(() => expect(result.current.status).toBe("success"));

		expect(resourceApi.get).toHaveBeenCalledWith("res-001");
		expect(result.current.data?.data.name).toBe("Ambulance 12");
	});

	it("does not call resourceApi.get while id is null", () => {
		const { result } = renderHook(() => useResource(null), { wrapper });

		expect(result.current.status).toBe("pending");
		expect(result.current.fetchStatus).toBe("idle");
		expect(resourceApi.get).not.toHaveBeenCalled();
	});
});
