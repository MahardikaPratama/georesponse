/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests useResourceHistory calls resourceApi.history with
 *                the given id and returns the result, with resourceApi
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

import { useResourceHistory } from "./useResourceHistory";

vi.mock("@api/resources/resourceApi", () => ({
	resourceApi: { history: vi.fn() }
}));

function wrapper({ children }: { children: React.ReactNode }) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } }
	});
	return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useResourceHistory", () => {
	it("calls resourceApi.history with the given id and returns the result", async () => {
		vi.mocked(resourceApi.history).mockResolvedValueOnce({
			data: { statusHistory: [], locationHistory: [], changeHistory: [] }
		});

		const { result } = renderHook(() => useResourceHistory("res-001"), { wrapper });

		await waitFor(() => expect(result.current.status).toBe("success"));

		expect(resourceApi.history).toHaveBeenCalledWith("res-001");
		expect(result.current.data?.data.statusHistory).toEqual([]);
	});
});
