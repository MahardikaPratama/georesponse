/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests useDeleteResource calls resourceApi.remove with the
 *                given id and, on success, removes the resource-detail
 *                query and invalidates the list query, with resourceApi
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
import { resourceKeys } from "@api/resources/resourceKeys";

import { useDeleteResource } from "./useDeleteResource";

vi.mock("@api/resources/resourceApi", () => ({
	resourceApi: { remove: vi.fn() }
}));

describe("useDeleteResource", () => {
	it("calls resourceApi.remove and removes the detail query, invalidates the list query, on success", async () => {
		vi.mocked(resourceApi.remove).mockResolvedValueOnce(undefined);

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
		});
		queryClient.setQueryData(resourceKeys.detail("res-001"), {
			data: { id: "res-001", name: "Ambulance 12" }
		});
		const removeSpy = vi.spyOn(queryClient, "removeQueries");
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		function wrapper({ children }: { children: React.ReactNode }) {
			return React.createElement(QueryClientProvider, { client: queryClient }, children);
		}

		const { result } = renderHook(() => useDeleteResource("res-001"), { wrapper });

		result.current.mutate();

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(resourceApi.remove).toHaveBeenCalledWith("res-001");
		expect(removeSpy).toHaveBeenCalledWith({ queryKey: resourceKeys.detail("res-001") });
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resourceKeys.lists() });
	});
});
