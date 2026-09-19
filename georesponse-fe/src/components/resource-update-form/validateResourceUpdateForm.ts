/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Client-side validation for the resource update form,
 *                mirroring API_CONTRACT.md section 12's rules for the
 *                fields this form covers (name required, attributes
 *                required per resourceAttributeSchema.constants.ts).
 *                UX-only — the backend remains authoritative.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { validateResourceAttributes } from "@utils/validateResourceAttributes";

import {
	ResourceUpdateFormErrors,
	ResourceUpdateFormState
} from "./ResourceUpdateForm.types";

export function validateResourceUpdateForm(
	state: ResourceUpdateFormState
): ResourceUpdateFormErrors {
	const errors: ResourceUpdateFormErrors = {};

	if (state.name.trim().length === 0) errors.name = "Name is required.";

	return { ...errors, ...validateResourceAttributes(state.type, state.attributes) };
}
