/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests useHotspots calls hotspotApi.list with the given
 *                filters and exposes the resulting list, with hotspotApi
 *                mocked so no real network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { hotspotApi } from "@api/hotspots/hotspotApi";

import { useHotspots } from "./useHotspots";

vi.mock("@api/hotspots/hotspotApi", () => ({
	hotspotApi: { list: vi.fn() }
}));

function wrapper({ children }: { children: React.ReactNode }) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } }
	});
	return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useHotspots", () => {
	it("calls hotspotApi.list with the given filters and returns the list", async () => {
		vi.mocked(hotspotApi.list).mockResolvedValueOnce({
			data: [
				{
					id: "1",
					latitude: -6.9147,
					longitude: 107.6098,
					region: "JAWA",
					province: "JAWA BARAT",
					regency: "KAB. BANDUNG",
					district: "SOME DISTRICT",
					observedDate: "2026-09-19",
					observedTime: "05:50",
					updatedAt: "2026-09-19T05:50:00Z",
					originDate: "2026-09-19T00:00:00Z"
				}
			],
			meta: { page: 1, pageSize: 1, total: 1 }
		});

		const { result } = renderHook(() => useHotspots({ hours: 24 }), { wrapper });

		await waitFor(() => expect(result.current.status).toBe("success"));

		expect(hotspotApi.list).toHaveBeenCalledWith({ hours: 24 });
		expect(result.current.data?.data).toHaveLength(1);
	});
});
