/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests validateResourceUpdateForm requires a name and the
 *                current type's attributes, per API_CONTRACT.md section 12.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { describe, expect, it } from "vitest";

import { ResourceUpdateFormState } from "./ResourceUpdateForm.types";
import { validateResourceUpdateForm } from "./validateResourceUpdateForm";

function validState(): ResourceUpdateFormState {
	return {
		name: "Ambulance 12",
		type: "VEHICLE",
		attributes: { vehicleType: "Ambulance", capacity: "4" }
	};
}

describe("validateResourceUpdateForm", () => {
	it("returns no errors for a fully valid form", () => {
		expect(validateResourceUpdateForm(validState())).toEqual({});
	});

	it("requires a name", () => {
		const errors = validateResourceUpdateForm({ ...validState(), name: "  " });
		expect(errors.name).toBeDefined();
	});

	it("requires the current type's attributes", () => {
		const errors = validateResourceUpdateForm({ ...validState(), attributes: {} });
		expect(errors["attributes.vehicleType"]).toBeDefined();
		expect(errors["attributes.capacity"]).toBeDefined();
	});
});
