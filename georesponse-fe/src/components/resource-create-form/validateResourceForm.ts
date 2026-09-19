/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Client-side validation for the resource create form,
 *                mirroring API_CONTRACT.md section 12's rules (id/name
 *                required, latitude in [-90, 90], longitude in
 *                [-180, 180], attributes required per
 *                resourceAttributeSchema.constants.ts). UX-only — the
 *                backend remains authoritative (section 12, this doc's
 *                own wording).
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Extracted the attribute-field checks into
 *                        utils/validateResourceAttributes.ts, shared with
 *                        the update form's own validator (Phase 6 section
 *                        9.5), which needed the identical logic.
 * - 1.2.0 (2026-09-19): Extracted the latitude/longitude checks into
 *                        utils/validateLocation.ts, shared with the
 *                        relocate control's own validation (Phase 6
 *                        section 9.7), which needed the identical logic.
 */
import { validateLocation } from "@utils/validateLocation";
import { validateResourceAttributes } from "@utils/validateResourceAttributes";

import { ResourceFormErrors, ResourceFormState } from "./ResourceCreateForm.types";

function isBlank(value: string): boolean {
	return value.trim().length === 0;
}

export function validateResourceForm(state: ResourceFormState): ResourceFormErrors {
	const errors: ResourceFormErrors = {};

	if (isBlank(state.id)) errors.id = "ID is required.";
	if (isBlank(state.name)) errors.name = "Name is required.";

	return {
		...errors,
		...validateLocation(state.latitude, state.longitude),
		...validateResourceAttributes(state.type, state.attributes)
	};
}
