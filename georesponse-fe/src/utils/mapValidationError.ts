/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Maps an ApiError from a resource create/update mutation
 *                onto form field errors, per FR-043 and
 *                FRONTEND_UI_UX.md section 6 ("field-level errors are
 *                mapped from error.details back onto the corresponding
 *                form fields when the shape allows it; otherwise the
 *                message is shown as a form-level error"). Reused by every
 *                resource form (create now, update in a later Phase 6
 *                sub-phase), not just resource-create-form, hence its
 *                place in utils/ rather than that component's own folder.
 *
 *                Known gap, not something to silently work around: most of
 *                the backend's own resource validation failures
 *                (georesponse-be/internal/http/httpresponse/error.go) map
 *                domain errors like a missing attribute to VALIDATION_ERROR
 *                with `details: nil` — only a malformed JSON body and (via
 *                this function's own RESOURCE_ID_CONFLICT handling) an id
 *                conflict currently produce a usable field. This function
 *                still implements the details-array mapping in full, so it
 *                needs no changes once the backend starts attaching
 *                per-field details to domain validation errors too.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { ApiError, ValidationDetail } from "@api/httpClient.types";
import { getApiErrorMessage } from "@utils/apiErrorMessage";

export interface MappedFormError {
	fieldErrors: Record<string, string>;
	formError: string | null;
}

/**
 * @param error The error a create/update mutation rejected with.
 * @param knownFields The form's field keys (e.g. "id", "location.latitude",
 *   "attributes.capacity") that a `details` entry's `field` is matched
 *   against. An entry whose `field` isn't one of these — including the
 *   empty string a malformed-JSON error currently uses — falls back to
 *   `formError` instead of being silently dropped.
 */
export function mapValidationError(error: unknown, knownFields: string[]): MappedFormError {
	if (!(error instanceof ApiError)) {
		return { fieldErrors: {}, formError: getApiErrorMessage(error) };
	}

	if (error.code === "RESOURCE_ID_CONFLICT" && knownFields.includes("id")) {
		return { fieldErrors: { id: error.message }, formError: null };
	}

	if (error.code === "VALIDATION_ERROR" && Array.isArray(error.details)) {
		const fieldErrors: Record<string, string> = {};
		const unmatchedMessages: string[] = [];

		for (const detail of error.details as ValidationDetail[]) {
			if (detail.field && knownFields.includes(detail.field)) {
				fieldErrors[detail.field] = detail.message;
			} else {
				unmatchedMessages.push(detail.message);
			}
		}

		return {
			fieldErrors,
			formError: unmatchedMessages.length > 0 ? unmatchedMessages.join(" ") : null
		};
	}

	return { fieldErrors: {}, formError: getApiErrorMessage(error) };
}
