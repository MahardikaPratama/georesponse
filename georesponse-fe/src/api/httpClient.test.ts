/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests httpClient's envelope unwrapping, error
 *                translation, and credentials handling against a mocked
 *                global fetch.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "./httpClient";
import { ApiError } from "./httpClient.types";

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" }
	});
}

describe("httpClient", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("unwraps a single-value data envelope on success", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			jsonResponse(200, { data: { id: "resource-001", name: "Ambulance" } })
		);

		const result = await httpClient.get<{ id: string; name: string }>(
			"/resources/resource-001"
		);

		expect(result.data.id).toBe("resource-001");
	});

	it("unwraps a paginated collection envelope, including meta", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			jsonResponse(200, {
				data: [{ id: "resource-001" }],
				meta: { page: 1, pageSize: 20, total: 1 }
			})
		);

		const result = await httpClient.getList<{ id: string }>("/resources");

		expect(result.data).toHaveLength(1);
		expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
	});

	it("throws an ApiError with the backend's code/message/details on failure", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			jsonResponse(404, {
				error: { code: "RESOURCE_NOT_FOUND", message: "Not found" }
			})
		);

		await expect(httpClient.get("/resources/does-not-exist")).rejects.toMatchObject(
			{ code: "RESOURCE_NOT_FOUND", status: 404, message: "Not found" }
		);
	});

	it("throws an ApiError instance a caller can narrow with instanceof", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			jsonResponse(400, { error: { code: "VALIDATION_ERROR", message: "Bad" } })
		);

		try {
			await httpClient.get("/resources");
			expect.unreachable("expected httpClient.get to throw");
		} catch (error) {
			expect(error).toBeInstanceOf(ApiError);
		}
	});

	it("resolves to undefined for a 204 No Content response", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

		await expect(httpClient.delete("/resources/resource-001")).resolves.toBeUndefined();
	});

	it("throws a NETWORK_ERROR ApiError when fetch itself rejects", async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

		await expect(httpClient.get("/resources")).rejects.toMatchObject({
			code: "NETWORK_ERROR",
			status: 0
		});
	});

	it("always sends credentials so the auth cookie is included", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { data: {} }));

		await httpClient.get("/resources/resource-001");

		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ credentials: "include" })
		);
	});

	it("serializes the request body and sets the JSON content type for POST", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			jsonResponse(201, { data: { id: "resource-001" } })
		);

		await httpClient.post("/resources", { id: "resource-001" });

		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ id: "resource-001" }),
				headers: { "Content-Type": "application/json" }
			})
		);
	});

	it("includes non-empty query parameters in the request URL", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			jsonResponse(200, { data: [], meta: { page: 1, pageSize: 20, total: 0 } })
		);

		await httpClient.getList("/resources", { search: "ambulance", status: undefined });

		const calledUrl = vi.mocked(fetch).mock.calls[0]?.[0] as string;
		expect(calledUrl).toContain("search=ambulance");
		expect(calledUrl).not.toContain("status=");
	});
});
