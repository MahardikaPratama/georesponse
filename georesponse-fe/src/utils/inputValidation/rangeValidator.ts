/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Range validation utilities for input validation.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import { NumericValidator } from "./numericValidator";
import type { RangeValidationConfig, RangeValidationResult } from "./types";

/**
 * Range Validation Utilities
 */
export class RangeValidator {
	/**
	 * Advanced range validation for paired inputs (from/to)
	 *
	 * @param fromValue - The start value
	 * @param toValue - The end value
	 * @param config - Range validation configuration
	 * @returns Validation result
	 */
	static validateRange(
		fromValue: string | null,
		toValue: string | null,
		config: RangeValidationConfig = {}
	): RangeValidationResult {
		const {
			requireBothValues = false,
			customComparator,
			allowEqual = true,
			errorMessage = "End value must be greater than or equal to start value"
		} = config;

		const bothPresent = Boolean(
			fromValue && toValue && fromValue !== "" && toValue !== ""
		);

		// If both values are required but not present
		if (requireBothValues && !bothPresent) {
			return {
				isValid: false,
				errorMessage: "Both start and end values are required",
				metadata: { bothPresent }
			};
		}

		// If either value is missing and not required, validation passes
		if (!bothPresent) {
			return {
				isValid: true,
				metadata: { bothPresent }
			};
		}

		const fromNumeric = NumericValidator.parseNumericValue(fromValue);
		const toNumeric = NumericValidator.parseNumericValue(toValue);

		if (fromNumeric === null || toNumeric === null) {
			return {
				isValid: false,
				errorMessage: "Invalid numeric values",
				metadata: {
					fromNumeric: fromNumeric ?? undefined,
					toNumeric: toNumeric ?? undefined,
					bothPresent
				}
			};
		}

		let isValid: boolean;

		if (customComparator) {
			isValid = customComparator(fromNumeric, toNumeric);
		} else {
			isValid = allowEqual ? toNumeric >= fromNumeric : toNumeric > fromNumeric;
		}

		return {
			isValid,
			errorMessage: isValid ? undefined : errorMessage,
			metadata: { fromNumeric, toNumeric, bothPresent }
		};
	}
}
