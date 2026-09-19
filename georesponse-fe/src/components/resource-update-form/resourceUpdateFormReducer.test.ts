/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests createResourceUpdateFormState pre-fills from a
 *                fetched resource and resourceUpdateFormReducer's field
 *                updates, including that changing the type resets
 *                attributes.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { describe, expect, it } from "vitest";

import { Resource } from "../../types/resource.types";

import {
	createResourceUpdateFormState,
	resourceUpdateFormReducer
} from "./resourceUpdateFormReducer";

const RESOURCE: Resource = {
	id: "res-001",
	name: "Ambulance 12",
	type: "VEHICLE",
	status: "AVAILABLE",
	attributes: { vehicleType: "Ambulance", capacity: 4 },
	location: { latitude: -6.2, longitude: 106.8166 }
};

describe("createResourceUpdateFormState", () => {
	it("pre-fills name, type, and attributes (as strings) from the fetched resource", () => {
		expect(createResourceUpdateFormState(RESOURCE)).toEqual({
			name: "Ambulance 12",
			type: "VEHICLE",
			attributes: { vehicleType: "Ambulance", capacity: "4" }
		});
	});

	it("does not include id in the form state (BR-015: identity isn't editable here)", () => {
		expect(createResourceUpdateFormState(RESOURCE)).not.toHaveProperty("id");
	});
});

describe("resourceUpdateFormReducer", () => {
	it("updates simple fields", () => {
		const state = createResourceUpdateFormState(RESOURCE);
		const next = resourceUpdateFormReducer(state, { type: "SET_NAME", value: "Ambulance 13" });
		expect(next.name).toBe("Ambulance 13");
		expect(next).not.toBe(state);
	});

	it("resets attributes when the type changes", () => {
		const state = createResourceUpdateFormState(RESOURCE);
		const next = resourceUpdateFormReducer(state, { type: "SET_TYPE", value: "IOT_DEVICE" });
		expect(next.type).toBe("IOT_DEVICE");
		expect(next.attributes).toEqual({});
	});

	it("merges attribute updates without clobbering other attributes", () => {
		let state = createResourceUpdateFormState(RESOURCE);
		state = resourceUpdateFormReducer(state, {
			type: "SET_ATTRIBUTE",
			key: "capacity",
			value: "6"
		});
		expect(state.attributes).toEqual({ vehicleType: "Ambulance", capacity: "6" });
	});
});
