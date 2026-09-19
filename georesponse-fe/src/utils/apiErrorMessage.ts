/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Maps an ApiError's stable `code` (API_CONTRACT.md section
 *                13) to a human-facing message. Per FRONTEND_UI_UX.md
 *                section 8, the frontend never shows a raw, unmapped
 *                `error.message` as the primary text for a known code —
 *                this is the single place that mapping happens, reused by
 *                every query/mutation error state.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added HOTSPOT_UPSTREAM_UNAVAILABLE for the BMKG
 *                        GeoHotspot overlay's unavailable state.
 */
import { ApiError } from "@api/httpClient.types";

const MESSAGES_BY_CODE: Record<string, string> = {
	NETWORK_ERROR: "Unable to reach the server. Check your connection and try again.",
	VALIDATION_ERROR: "The request could not be processed as submitted.",
	INVALID_RESOURCE_TYPE: "The resource type is missing or not recognized.",
	INVALID_RESOURCE_STATUS: "The resource status is missing or not recognized.",
	INVALID_LOCATION: "The location is missing or out of range.",
	AUTHENTICATION_FAILED: "Your session has expired. Please sign in again.",
	AUTHORIZATION_DENIED: "You do not have permission to do that.",
	RESOURCE_NOT_FOUND: "That resource could not be found.",
	RESOURCE_ID_CONFLICT: "A resource with that ID already exists.",
	PERSISTENCE_ERROR: "The server could not complete the operation. Please try again.",
	HOTSPOT_UPSTREAM_UNAVAILABLE: "BMKG hotspot data is temporarily unavailable."
};

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

/** Returns a human-facing message for an error, deriving it from `error.code` when possible. */
export function getApiErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		return MESSAGES_BY_CODE[error.code] ?? GENERIC_MESSAGE;
	}
	return GENERIC_MESSAGE;
}
