/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests validateResourceAttributes flags a missing/
 *                negative attribute per the current type's schema and only
 *                checks that type's fields.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { describe, expect, it } from "vitest";

import { validateResourceAttributes } from "./validateResourceAttributes";

describe("validateResourceAttributes", () => {
	it("returns no errors when every field for the type is valid", () => {
		expect(
			validateResourceAttributes("VEHICLE", { vehicleType: "Ambulance", capacity: "4" })
		).toEqual({});
	});

	it("requires every field the current type's schema lists", () => {
		const errors = validateResourceAttributes("VEHICLE", {});
		expect(errors["attributes.vehicleType"]).toBeDefined();
		expect(errors["attributes.capacity"]).toBeDefined();
	});

	it("rejects a negative numeric attribute", () => {
		const errors = validateResourceAttributes("EQUIPMENT", {
			equipmentType: "Water Pump",
			quantity: "-1"
		});
		expect(errors["attributes.quantity"]).toMatch(/not be negative/);
	});

	it("ignores fields that aren't part of the current type's schema", () => {
		expect(
			validateResourceAttributes("IOT_DEVICE", { deviceType: "Flood Sensor" })
		).toEqual({});
	});
});
