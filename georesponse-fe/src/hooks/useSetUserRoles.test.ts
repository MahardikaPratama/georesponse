/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests useSetUserRoles calls authorizationApi.setUserRoles
 *                with the given user id/payload, with authorizationApi
 *                mocked so no real network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { authorizationApi } from "@api/authorization/authorizationApi";

import { useSetUserRoles } from "./useSetUserRoles";

vi.mock("@api/authorization/authorizationApi", () => ({
	authorizationApi: { setUserRoles: vi.fn() }
}));

function wrapper({ children }: { children: React.ReactNode }) {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false } }
	});
	return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useSetUserRoles", () => {
	it("calls authorizationApi.setUserRoles with the given user id and payload", async () => {
		vi.mocked(authorizationApi.setUserRoles).mockResolvedValueOnce(undefined);

		const { result } = renderHook(() => useSetUserRoles(), { wrapper });

		result.current.mutate({ userId: "user-001", payload: { roles: ["role-admin"] } });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(authorizationApi.setUserRoles).toHaveBeenCalledWith("user-001", {
			roles: ["role-admin"]
		});
	});
});
