/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests mapValidationError maps a VALIDATION_ERROR's
 *                `details` array onto known form fields (falling back to a
 *                form-level message for anything unmatched), treats
 *                RESOURCE_ID_CONFLICT as an "id" field error, and falls
 *                back to the generic error-code message for anything else.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { describe, expect, it } from "vitest";

import { ApiError } from "@api/httpClient.types";

import { mapValidationError } from "./mapValidationError";

const KNOWN_FIELDS = ["id", "name", "location.latitude", "attributes.capacity"];

describe("mapValidationError", () => {
	it("maps RESOURCE_ID_CONFLICT to the id field", () => {
		const error = new ApiError(409, {
			code: "RESOURCE_ID_CONFLICT",
			message: "A resource with that ID already exists."
		});

		expect(mapValidationError(error, KNOWN_FIELDS)).toEqual({
			fieldErrors: { id: "A resource with that ID already exists." },
			formError: null
		});
	});

	it("maps each VALIDATION_ERROR detail whose field is known onto that field", () => {
		const error = new ApiError(400, {
			code: "VALIDATION_ERROR",
			message: "Request data does not satisfy validation rules",
			details: [
				{ field: "name", message: "Name is required." },
				{ field: "attributes.capacity", message: "Capacity must not be negative." }
			]
		});

		expect(mapValidationError(error, KNOWN_FIELDS)).toEqual({
			fieldErrors: {
				name: "Name is required.",
				"attributes.capacity": "Capacity must not be negative."
			},
			formError: null
		});
	});

	it("falls back unmatched or fieldless details to a form-level error", () => {
		const error = new ApiError(400, {
			code: "VALIDATION_ERROR",
			message: "Request data does not satisfy validation rules",
			details: [
				{ field: "", message: "request body is not valid JSON: unexpected EOF" },
				{ field: "notAKnownField", message: "Unrecognized field." }
			]
		});

		const result = mapValidationError(error, KNOWN_FIELDS);
		expect(result.fieldErrors).toEqual({});
		expect(result.formError).toContain("request body is not valid JSON");
		expect(result.formError).toContain("Unrecognized field.");
	});

	it("falls back to the generic error-code message for a VALIDATION_ERROR with no details", () => {
		const error = new ApiError(400, {
			code: "VALIDATION_ERROR",
			message: "Request data does not satisfy validation rules"
		});

		expect(mapValidationError(error, KNOWN_FIELDS)).toEqual({
			fieldErrors: {},
			formError: "The request could not be processed as submitted."
		});
	});

	it("falls back to the generic error-code message for any other error code", () => {
		const error = new ApiError(500, { code: "PERSISTENCE_ERROR", message: "boom" });

		expect(mapValidationError(error, KNOWN_FIELDS)).toEqual({
			fieldErrors: {},
			formError: "The server could not complete the operation. Please try again."
		});
	});

	it("falls back to a generic message for a non-ApiError", () => {
		expect(mapValidationError(new Error("network down"), KNOWN_FIELDS)).toEqual({
			fieldErrors: {},
			formError: "Something went wrong. Please try again."
		});
	});
});
