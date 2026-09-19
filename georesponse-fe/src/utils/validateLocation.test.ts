/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests validateLocation flags a missing, non-numeric, or
 *                out-of-range latitude/longitude independently, and
 *                returns no errors for a valid pair.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { describe, expect, it } from "vitest";

import { validateLocation } from "./validateLocation";

describe("validateLocation", () => {
	it("returns no errors for a valid coordinate pair", () => {
		expect(validateLocation("-6.2", "106.8166")).toEqual({});
	});

	it("requires latitude and longitude to be present", () => {
		expect(validateLocation("", "")).toEqual({
			latitude: "Latitude is required.",
			longitude: "Longitude is required."
		});
	});

	it("requires latitude and longitude to be numeric", () => {
		expect(validateLocation("abc", "xyz")).toEqual({
			latitude: "Latitude is required.",
			longitude: "Longitude is required."
		});
	});

	it("rejects an out-of-range latitude independently of longitude", () => {
		expect(validateLocation("91", "106.8166")).toEqual({
			latitude: "Latitude must be between -90 and 90."
		});
	});

	it("rejects an out-of-range longitude independently of latitude", () => {
		expect(validateLocation("-6.2", "-181")).toEqual({
			longitude: "Longitude must be between -180 and 180."
		});
	});
});
