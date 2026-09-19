/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests resourceFormReducer's field updates and that
 *                changing the resource type resets attributes, since the
 *                previous type's attribute keys don't apply to the new
 *                type.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { describe, expect, it } from "vitest";

import { createInitialResourceFormState, resourceFormReducer } from "./resourceFormReducer";

describe("resourceFormReducer", () => {
	it("starts with sensible defaults", () => {
		const state = createInitialResourceFormState();
		expect(state).toEqual({
			id: "",
			name: "",
			type: "VEHICLE",
			status: "AVAILABLE",
			attributes: {},
			latitude: "",
			longitude: ""
		});
	});

	it("updates simple fields", () => {
		const state = createInitialResourceFormState();
		const next = resourceFormReducer(state, { type: "SET_ID", value: "res-001" });
		expect(next.id).toBe("res-001");
		expect(next).not.toBe(state);
	});

	it("resets attributes when the type changes", () => {
		let state = createInitialResourceFormState();
		state = resourceFormReducer(state, {
			type: "SET_ATTRIBUTE",
			key: "vehicleType",
			value: "Ambulance"
		});
		expect(state.attributes).toEqual({ vehicleType: "Ambulance" });

		state = resourceFormReducer(state, { type: "SET_TYPE", value: "IOT_DEVICE" });
		expect(state.type).toBe("IOT_DEVICE");
		expect(state.attributes).toEqual({});
	});

	it("merges attribute updates without clobbering other attributes", () => {
		let state = createInitialResourceFormState();
		state = resourceFormReducer(state, {
			type: "SET_ATTRIBUTE",
			key: "vehicleType",
			value: "Ambulance"
		});
		state = resourceFormReducer(state, {
			type: "SET_ATTRIBUTE",
			key: "capacity",
			value: "4"
		});
		expect(state.attributes).toEqual({ vehicleType: "Ambulance", capacity: "4" });
	});

	it("RESET returns to the initial state", () => {
		let state = createInitialResourceFormState();
		state = resourceFormReducer(state, { type: "SET_ID", value: "res-001" });
		state = resourceFormReducer(state, { type: "RESET" });
		expect(state).toEqual(createInitialResourceFormState());
	});
});
