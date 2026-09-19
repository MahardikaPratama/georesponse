/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests useRelocateResource's optimistic update: the
 *                cached detail and list entries move to the new location
 *                as soon as the mutation starts (before the backend
 *                responds), roll back to their previous values on error,
 *                and the affected queries are invalidated once the
 *                mutation settles either way. resourceApi is mocked so no
 *                real network call is made.
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

import { useRelocateResource } from "./useRelocateResource";

vi.mock("@api/resources/resourceApi", () => ({
	resourceApi: { relocate: vi.fn() }
}));

const RESOURCE = {
	id: "res-001",
	name: "Ambulance 12",
	type: "VEHICLE" as const,
	status: "AVAILABLE" as const,
	attributes: {},
	location: { latitude: -6.2, longitude: 106.8166 }
};

function seedQueryClient() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
	});
	queryClient.setQueryData(resourceKeys.detail("res-001"), { data: RESOURCE });
	queryClient.setQueryData(resourceKeys.list({}), {
		data: [RESOURCE],
		meta: { page: 1, pageSize: 20, total: 1 }
	});
	return queryClient;
}

function wrapperFor(queryClient: QueryClient) {
	return function wrapper({ children }: { children: React.ReactNode }) {
		return React.createElement(QueryClientProvider, { client: queryClient }, children);
	};
}

describe("useRelocateResource", () => {
	it("optimistically moves the cached detail and list location before the backend responds", async () => {
		let resolveRelocate: (value: unknown) => void = () => {};
		vi.mocked(resourceApi.relocate).mockReturnValueOnce(
			new Promise((resolve) => {
				resolveRelocate = resolve;
			})
		);

		const queryClient = seedQueryClient();
		const { result } = renderHook(() => useRelocateResource("res-001"), {
			wrapper: wrapperFor(queryClient)
		});

		const newLocation = { latitude: -6.3, longitude: 106.9 };
		result.current.mutate(newLocation);

		await waitFor(() => {
			const detail = queryClient.getQueryData<{ data: typeof RESOURCE }>(
				resourceKeys.detail("res-001")
			);
			expect(detail?.data.location).toEqual(newLocation);
		});

		const list = queryClient.getQueryData<{ data: (typeof RESOURCE)[] }>(
			resourceKeys.list({})
		);
		expect(list?.data[0].location).toEqual(newLocation);

		resolveRelocate({ data: { ...RESOURCE, location: newLocation } });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
	});

	it("rolls back the optimistic update on error", async () => {
		vi.mocked(resourceApi.relocate).mockRejectedValueOnce(new Error("boom"));

		const queryClient = seedQueryClient();
		const { result } = renderHook(() => useRelocateResource("res-001"), {
			wrapper: wrapperFor(queryClient)
		});

		result.current.mutate({ latitude: -6.3, longitude: 106.9 });

		await waitFor(() => expect(result.current.isError).toBe(true));

		const detail = queryClient.getQueryData<{ data: typeof RESOURCE }>(
			resourceKeys.detail("res-001")
		);
		expect(detail?.data.location).toEqual(RESOURCE.location);

		const list = queryClient.getQueryData<{ data: (typeof RESOURCE)[] }>(
			resourceKeys.list({})
		);
		expect(list?.data[0].location).toEqual(RESOURCE.location);
	});

	it("invalidates the detail, list, and history queries once settled", async () => {
		vi.mocked(resourceApi.relocate).mockResolvedValueOnce({
			data: { ...RESOURCE, location: { latitude: -6.3, longitude: 106.9 } }
		});

		const queryClient = seedQueryClient();
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		const { result } = renderHook(() => useRelocateResource("res-001"), {
			wrapper: wrapperFor(queryClient)
		});

		result.current.mutate({ latitude: -6.3, longitude: 106.9 });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resourceKeys.detail("res-001") });
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resourceKeys.lists() });
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resourceKeys.history("res-001") });
	});
});
