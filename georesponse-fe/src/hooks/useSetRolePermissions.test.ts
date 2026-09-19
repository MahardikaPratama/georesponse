/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests useSetRolePermissions calls
 *                authorizationApi.setRolePermissions with the given role
 *                id/payload and invalidates the roles query on success,
 *                with authorizationApi mocked so no real network call is
 *                made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { authorizationApi } from "@api/authorization/authorizationApi";
import { authorizationKeys } from "@api/authorization/authorizationKeys";

import { useSetRolePermissions } from "./useSetRolePermissions";

vi.mock("@api/authorization/authorizationApi", () => ({
	authorizationApi: { setRolePermissions: vi.fn() }
}));

describe("useSetRolePermissions", () => {
	it("calls authorizationApi.setRolePermissions and invalidates the roles query on success", async () => {
		vi.mocked(authorizationApi.setRolePermissions).mockResolvedValueOnce(undefined);

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
		});
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		function wrapper({ children }: { children: React.ReactNode }) {
			return React.createElement(QueryClientProvider, { client: queryClient }, children);
		}

		const { result } = renderHook(() => useSetRolePermissions("role-admin"), { wrapper });

		result.current.mutate({ permissions: ["role.read", "role.manage"] });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(authorizationApi.setRolePermissions).toHaveBeenCalledWith("role-admin", {
			permissions: ["role.read", "role.manage"]
		});
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: authorizationKeys.roles });
	});
});
