/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Validates a resource form's attribute fields against
 *                resourceAttributeSchema.constants.ts for the current
 *                type, mirroring the backend's validation rules (UX-only).
 *                Shared by the create and update forms' own validation
 *                functions, since both render the same type-specific
 *                attribute fields.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { RESOURCE_ATTRIBUTE_SCHEMA } from "@constants/resourceAttributeSchema.constants";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { ResourceType } from "../types/resource.types";

/** Field key ("attributes.<key>") -> message, for every attributes.<key> that fails resourceAttributeSchema.constants.ts's rule for it. */
export function validateResourceAttributes(
	type: ResourceType,
	attributes: Record<string, string>
): Record<string, string> {
	const errors: Record<string, string> = {};

	for (const field of RESOURCE_ATTRIBUTE_SCHEMA[type]) {
		const raw = attributes[field.key] ?? "";
		if (field.kind === "text") {
			if (raw.trim().length === 0) {
				errors[`attributes.${field.key}`] = `${field.label} is required.`;
			}
			continue;
		}
		const numericValue = Number(raw);
		if (raw.trim().length === 0 || Number.isNaN(numericValue)) {
			errors[`attributes.${field.key}`] = `${field.label} is required.`;
		} else if (numericValue < 0) {
			errors[`attributes.${field.key}`] = `${field.label} must not be negative.`;
		}
	}

	return errors;
}
