/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Shared types for the API layer: the response envelope
 *                shapes the backend API defines, and the typed error
 *                httpClient throws when the backend returns one.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added ValidationDetail, the `error.details` array
 *                        entry shape for VALIDATION_ERROR, so a form can
 *                        map a backend field error onto the right input
 *                        (FR-043).
 */

export interface DataEnvelope<T> {
	data: T;
}

/** One entry of a VALIDATION_ERROR's `details` array. */
export interface ValidationDetail {
	field: string;
	message: string;
}

export interface ListMeta {
	page: number;
	pageSize: number;
	total: number;
}

export interface ListEnvelope<T> {
	data: T[];
	meta: ListMeta;
}

export interface ApiErrorBody {
	code: string;
	message: string;
	details?: unknown;
}

/**
 * Thrown by httpClient whenever a request fails, whether the backend
 * responded with a structured `{"error": {...}}` envelope or the request
 * never reached it at all (status 0, code "NETWORK_ERROR").
 */
export class ApiError extends Error {
	code: string;
	status: number;
	details?: unknown;

	constructor(status: number, body: ApiErrorBody) {
		super(body.message);
		this.name = "ApiError";
		this.code = body.code;
		this.status = status;
		this.details = body.details;
	}
}
