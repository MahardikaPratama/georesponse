/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : The only place in this codebase that calls fetch. Wraps
 *                the backend's REST API: builds request URLs against
 *                API_BASE_URL, sends/receives the HttpOnly auth cookie
 *                (credentials: "include"), unwraps the {data}/{data,meta}
 *                envelope, and translates a {"error": {...}} response into
 *                a thrown ApiError. No component or feature hook should
 *                call fetch directly — everything goes through this
 *                module, per FRONTEND_ARCHITECTURE.md's layering.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added putNoContent, for the 204-returning
 *                        role/user role assignment endpoints (Phase 6
 *                        section 9.10) — put() claims a DataEnvelope<T>
 *                        that a 204 response never actually has.
 */
import { logger } from "@utils/logger/logger";

import {
	ApiError,
	ApiErrorBody,
	DataEnvelope,
	ListEnvelope
} from "./httpClient.types";

const API_BASE_URL =
	process.env.API_BASE_URL ?? "http://localhost:8080/api/v1";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type QueryValue = string | number | boolean | undefined;

interface RequestOptions {
	method: HttpMethod;
	body?: unknown;
	query?: Record<string, QueryValue>;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
	const url = new URL(API_BASE_URL + path);
	if (query) {
		for (const [key, value] of Object.entries(query)) {
			if (value !== undefined && value !== "") {
				url.searchParams.set(key, String(value));
			}
		}
	}
	return url.toString();
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
	const url = buildUrl(path, options.query);

	let response: Response;
	try {
		response = await fetch(url, {
			method: options.method,
			headers:
				options.body !== undefined
					? { "Content-Type": "application/json" }
					: undefined,
			credentials: "include",
			body: options.body !== undefined ? JSON.stringify(options.body) : undefined
		});
	} catch (error) {
		logger.error("network request failed", "httpClient", error);
		throw new ApiError(0, {
			code: "NETWORK_ERROR",
			message: "Unable to reach the server. Check your connection and try again."
		});
	}

	if (response.status === 204) {
		return undefined as T;
	}

	let payload: unknown;
	try {
		payload = await response.json();
	} catch (error) {
		if (response.ok) {
			return undefined as T;
		}
		logger.error("failed to parse response body", "httpClient", error);
		throw new ApiError(response.status, {
			code: "PERSISTENCE_ERROR",
			message: "The server returned an unexpected response."
		});
	}

	if (!response.ok) {
		const errorBody =
			(payload as { error?: ApiErrorBody }).error ??
			({
				code: "PERSISTENCE_ERROR",
				message: "The operation could not be completed."
			} satisfies ApiErrorBody);
		logger.error(errorBody.message, "httpClient", errorBody);
		throw new ApiError(response.status, errorBody);
	}

	return payload as T;
}

/** The API client every hook in this codebase talks to the backend through. */
export const httpClient = {
	get<T>(
		path: string,
		query?: Record<string, QueryValue>
	): Promise<DataEnvelope<T>> {
		return request<DataEnvelope<T>>(path, { method: "GET", query });
	},

	getList<T>(
		path: string,
		query?: Record<string, QueryValue>
	): Promise<ListEnvelope<T>> {
		return request<ListEnvelope<T>>(path, { method: "GET", query });
	},

	post<T>(path: string, body?: unknown): Promise<DataEnvelope<T>> {
		return request<DataEnvelope<T>>(path, { method: "POST", body });
	},

	/** For a POST endpoint that succeeds with 204 No Content (e.g. logout). */
	postNoContent(path: string, body?: unknown): Promise<void> {
		return request<void>(path, { method: "POST", body });
	},

	put<T>(path: string, body?: unknown): Promise<DataEnvelope<T>> {
		return request<DataEnvelope<T>>(path, { method: "PUT", body });
	},

	/** For a PUT endpoint that succeeds with 204 No Content (e.g. role/user role assignment). */
	putNoContent(path: string, body?: unknown): Promise<void> {
		return request<void>(path, { method: "PUT", body });
	},

	patch<T>(path: string, body?: unknown): Promise<DataEnvelope<T>> {
		return request<DataEnvelope<T>>(path, { method: "PATCH", body });
	},

	delete(path: string): Promise<void> {
		return request<void>(path, { method: "DELETE" });
	}
};
