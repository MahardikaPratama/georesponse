/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Unit tests for getPositionClass utility function in Alert component.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import { getPositionClass } from "./Alert";

describe("getPositionClass utility", () => {
	it("returns correct class for top-center (default)", () => {
		expect(getPositionClass()).toContain(
			"top-32 left-1/2 transform -translate-x-1/2"
		);
	});

	it("returns correct class for left-center", () => {
		expect(getPositionClass("left-center")).toContain(
			"top-1/2 left-12 transform -translate-y-1/2"
		);
	});

	it("returns correct class for bottom-left", () => {
		expect(getPositionClass("bottom-left")).toContain("bottom-4 left-4");
	});

	it("returns default for invalid position", () => {
		expect(getPositionClass("invalid" as any)).toContain(
			"top-32 left-1/2 transform -translate-x-1/2"
		);
	});

	it("handles null/undefined/falsy values by returning default", () => {
		expect(getPositionClass(undefined as any)).toContain(
			"top-32 left-1/2 transform -translate-x-1/2"
		);
		expect(getPositionClass(null as any)).toContain(
			"top-32 left-1/2 transform -translate-x-1/2"
		);
		expect(getPositionClass("" as any)).toContain(
			"top-32 left-1/2 transform -translate-x-1/2"
		);
	});
});
