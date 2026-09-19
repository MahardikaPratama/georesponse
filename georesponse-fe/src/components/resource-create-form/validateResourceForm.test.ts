/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests validateResourceForm mirrors the backend's rules
 *                for a valid resource, and flags each rule's violation
 *                independently.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { describe, expect, it } from "vitest";

import { createInitialResourceFormState } from "./resourceFormReducer";
import { validateResourceForm } from "./validateResourceForm";

function validState() {
	return {
		...createInitialResourceFormState(),
		id: "res-001",
		name: "Ambulance 12",
		attributes: { vehicleType: "Ambulance", capacity: "4" },
		latitude: "-6.2",
		longitude: "106.8166"
	};
}

describe("validateResourceForm", () => {
	it("returns no errors for a fully valid VEHICLE form", () => {
		expect(validateResourceForm(validState())).toEqual({});
	});

	it("requires id and name", () => {
		const errors = validateResourceForm({ ...validState(), id: "  ", name: "" });
		expect(errors.id).toBeDefined();
		expect(errors.name).toBeDefined();
	});

	it("rejects latitude/longitude out of range", () => {
		const errors = validateResourceForm({
			...validState(),
			latitude: "91",
			longitude: "-181"
		});
		expect(errors.latitude).toMatch(/-90 and 90/);
		expect(errors.longitude).toMatch(/-180 and 180/);
	});

	it("requires latitude and longitude to be present and numeric", () => {
		const errors = validateResourceForm({
			...validState(),
			latitude: "",
			longitude: "not-a-number"
		});
		expect(errors.latitude).toBeDefined();
		expect(errors.longitude).toBeDefined();
	});

	it("requires the current type's attributes", () => {
		const errors = validateResourceForm({ ...validState(), attributes: {} });
		expect(errors["attributes.vehicleType"]).toBeDefined();
		expect(errors["attributes.capacity"]).toBeDefined();
	});

	it("rejects a negative numeric attribute", () => {
		const errors = validateResourceForm({
			...validState(),
			attributes: { vehicleType: "Ambulance", capacity: "-1" }
		});
		expect(errors["attributes.capacity"]).toMatch(/not be negative/);
	});

	it("only checks the current type's attribute schema", () => {
		const errors = validateResourceForm({
			...validState(),
			type: "IOT_DEVICE",
			attributes: { deviceType: "Flood Sensor" }
		});
		expect(errors).toEqual({});
	});
});
