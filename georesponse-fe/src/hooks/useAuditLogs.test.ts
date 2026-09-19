/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests useAuditLogs calls auditApi.list with the given
 *                filters and returns the result, with auditApi mocked so
 *                no real network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { auditApi } from "@api/audit/auditApi";

import { useAuditLogs } from "./useAuditLogs";

vi.mock("@api/audit/auditApi", () => ({
	auditApi: { list: vi.fn() }
}));

function wrapper({ children }: { children: React.ReactNode }) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } }
	});
	return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useAuditLogs", () => {
	it("calls auditApi.list with the given filters and returns the result", async () => {
		vi.mocked(auditApi.list).mockResolvedValueOnce({
			data: [],
			meta: { page: 1, pageSize: 20, total: 0 }
		});

		const { result } = renderHook(() => useAuditLogs({ operation: "RESOURCE_CREATED" }), {
			wrapper
		});

		await waitFor(() => expect(result.current.status).toBe("success"));

		expect(auditApi.list).toHaveBeenCalledWith({ operation: "RESOURCE_CREATED" });
		expect(result.current.data?.data).toEqual([]);
	});
});
