/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests useRoles calls authorizationApi.listRoles and
 *                returns the result, with authorizationApi mocked so no
 *                real network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { authorizationApi } from "@api/authorization/authorizationApi";

import { useRoles } from "./useRoles";

vi.mock("@api/authorization/authorizationApi", () => ({
	authorizationApi: { listRoles: vi.fn(), listPermissions: vi.fn() }
}));

function wrapper({ children }: { children: React.ReactNode }) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } }
	});
	return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useRoles", () => {
	it("calls authorizationApi.listRoles and returns the result", async () => {
		vi.mocked(authorizationApi.listRoles).mockResolvedValueOnce({
			data: [{ id: "role-admin", name: "Administrator", permissions: ["role.manage"] }]
		});

		const { result } = renderHook(() => useRoles(), { wrapper });

		await waitFor(() => expect(result.current.status).toBe("success"));

		expect(authorizationApi.listRoles).toHaveBeenCalled();
		expect(result.current.data?.data).toHaveLength(1);
	});
});
