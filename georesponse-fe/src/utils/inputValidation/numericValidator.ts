/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Numeric validation and formatting utilities.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import type {
	FieldConstraints,
	FieldConstraintsResult,
	NumericValidationResult,
	ValidationConfig,
	ValidationPatternConfig
} from "./types";

/**
 * Numeric Validation and Formatting Utilities
 */
export class NumericValidator {
	/**
	 * Advanced numeric input validation with decimal precision control
	 *
	 * @param input - The input string to validate
	 * @param config - Validation configuration
	 * @returns Validation result with formatted numeric value
	 */
	static validateNumericInput(
		input: string,
		config: ValidationConfig = {}
	): NumericValidationResult {
		const mergedConfig = {
			maxDecimalDigits: 1,
			formatThousands: false,
			errorMessages: {},
			...config
		};
		const errors: string[] = [];
		const appliedRules: string[] = [];
		let formattedValue = input;

		// Remove thousands separators for processing
		const cleanInput = input.replace(/,/g, "");

		// Validate basic numeric format
		const maxDecimalDigits = mergedConfig.maxDecimalDigits ?? 1;
		const numericPattern =
			maxDecimalDigits > 0
				? new RegExp(`^-?\\d*(\\.\\d{0,${maxDecimalDigits}})?$`)
				: /^-?\d*$/;

		if (!numericPattern.test(cleanInput)) {
			// Check if it's a decimal precision issue
			const parts = cleanInput.split(".");
			if (parts.length === 2 && parts[1].length > maxDecimalDigits) {
				errors.push(
					mergedConfig.errorMessages?.decimal?.replace(
						"{maxDecimal}",
						maxDecimalDigits.toString()
					) ?? `Too many decimal places (max ${maxDecimalDigits})`
				);
				appliedRules.push("decimal-precision");
			} else {
				errors.push("Invalid numeric format");
				appliedRules.push("numeric-format");
			}
			return { isValid: false, formattedValue, errors, appliedRules };
		}

		const numericValue = parseFloat(cleanInput);

		// Range validation
		if (
			typeof mergedConfig.min === "number" &&
			numericValue < mergedConfig.min
		) {
			errors.push(
				mergedConfig.errorMessages?.min?.replace(
					"{min}",
					mergedConfig.min.toString()
				) ?? `Value must be at least ${mergedConfig.min}`
			);
			appliedRules.push("min-value");
		}

		if (
			typeof mergedConfig.max === "number" &&
			numericValue > mergedConfig.max
		) {
			errors.push(
				mergedConfig.errorMessages?.max?.replace(
					"{max}",
					mergedConfig.max.toString()
				) ?? `Value must be at most ${mergedConfig.max}`
			);
			appliedRules.push("max-value");
		}

		// Apply thousands formatting if enabled
		if (mergedConfig.formatThousands && !isNaN(numericValue)) {
			formattedValue = this.formatWithThousandsSeparator(cleanInput);
			if (formattedValue !== input) {
				appliedRules.push("thousands-format");
			}
		}

		return {
			isValid: errors.length === 0,
			formattedValue,
			errors,
			appliedRules
		};
	}

	/**
	 * Ensures precise decimal formatting with customizable precision
	 *
	 * @param input - The input string to format
	 * @param decimalDigits - Number of decimal places to enforce
	 * @param paddingStrategy - How to handle padding ('pad', 'truncate', 'round')
	 * @returns Formatted string or null if input is invalid
	 */
	static ensureDecimalPrecision(
		input: string | null,
		decimalDigits: number = 1,
		paddingStrategy: "pad" | "truncate" | "round" = "pad"
	): string | null {
		if (input === null || input === "") return input;

		const cleanInput = input.toString().replace(/,/g, "");

		// Validate numeric input
		if (!/^(-?\d+(\.\d*)?|-?\.\d+)$/.test(cleanInput)) return null;

		const numericValue = parseFloat(cleanInput);
		if (isNaN(numericValue)) return null;

		if (decimalDigits === 0) {
			// No decimals wanted
			return Math.round(numericValue).toString();
		}

		const parts = cleanInput.split(".");
		const integerPart = parts[0] ?? "0";
		const decimalPart = parts[1] ?? "";

		let finalDecimalPart: string;

		switch (paddingStrategy) {
			case "truncate":
				finalDecimalPart = decimalPart.slice(0, decimalDigits);
				break;
			case "round": {
				const rounded = parseFloat(cleanInput).toFixed(decimalDigits);
				return rounded;
			}
			case "pad":
			default:
				finalDecimalPart = decimalPart
					.slice(0, decimalDigits)
					.padEnd(decimalDigits, "0");
				break;
		}

		return `${integerPart}.${finalDecimalPart}`;
	}

	/**
	 * Advanced input processing for controlled components
	 *
	 * @param value - The input value
	 * @param config - Processing configuration
	 * @returns Processed value or null if invalid
	 */
	static processControlledInput(
		value: string,
		config: ValidationConfig & {
			/** Whether to allow partial input during typing */
			allowPartialInput?: boolean;
			/** Whether to immediately format on change */
			liveFormatting?: boolean;
		} = {}
	): string | null {
		const {
			maxDecimalDigits = 1,
			allowPartialInput = true,
			liveFormatting = false,
			formatThousands = false
		} = config;

		if (value === "") return "";

		const cleanInput = value.replace(/,/g, "");

		// Allow partial input (e.g., "123." while typing "123.45")
		if (allowPartialInput) {
			const partialPattern =
				maxDecimalDigits > 0
					? new RegExp(`^-?\\d*\\.?\\d{0,${maxDecimalDigits}}$`)
					: /^-?\d*$/;

			if (!partialPattern.test(cleanInput)) {
				return null; // Invalid input
			}
		} else {
			// Strict validation
			const strictPattern =
				maxDecimalDigits > 0
					? new RegExp(`^-?\\d+(\\.\\d{1,${maxDecimalDigits}})?$`)
					: /^-?\d+$/;

			if (!strictPattern.test(cleanInput)) {
				return null;
			}
		}

		// Apply live formatting if enabled
		if (liveFormatting && formatThousands && !cleanInput.includes(".")) {
			return this.formatWithThousandsSeparator(cleanInput);
		}

		return cleanInput;
	}

	/**
	 * Format number with thousands separator
	 *
	 * @param input - The numeric string to format
	 * @param separator - The thousands separator (default: ",")
	 * @returns Formatted string
	 */
	static formatWithThousandsSeparator(
		input: string,
		separator: string = ","
	): string {
		const cleanInput = input.replace(/,/g, "");
		const parts = cleanInput.split(".");

		// Format integer part
		const integer = parts[0];
		const sign = integer.startsWith("-") ? "-" : "";
		const digits = sign ? integer.slice(1) : integer;
		const reversed = digits.split("").reverse().join("");
		const grouped = reversed.replace(/(\d{3})(?=\d)/g, `$1${separator}`);
		const withSeparator = grouped.split("").reverse().join("");
		parts[0] = sign + withSeparator;

		return parts.join(".");
	}

	/**
	 * Parse numeric value from string, handling thousands separators
	 *
	 * @param input - The input string
	 * @returns Parsed number or null if invalid
	 */
	static parseNumericValue(input: string | null): number | null {
		if (!input || input === "") return null;

		const cleanInput = input.toString().replace(/,/g, "");
		const numericValue = parseFloat(cleanInput);

		return isNaN(numericValue) ? null : numericValue;
	}

	/**
	 * Validate field constraints with advanced error reporting
	 *
	 * @param value - The value to validate
	 * @param constraints - Field constraints
	 * @returns Validation result with detailed errors
	 */
	static validateFieldConstraints(
		value: string | null,
		constraints: FieldConstraints
	): FieldConstraintsResult {
		const errors: string[] = [];

		if (!value || value === "") {
			if (constraints.required) {
				errors.push("This field is required");
			}
			return { isValid: errors.length === 0, errors, value: null };
		}

		// Pattern validation
		if (constraints.pattern && !constraints.pattern.test(value)) {
			errors.push("Invalid format");
		}

		// Custom validation
		if (constraints.customValidator) {
			const customResult = constraints.customValidator(value);
			if (typeof customResult === "string") {
				errors.push(customResult);
			} else if (!customResult) {
				errors.push("Custom validation failed");
			}
		}

		const numericValue = this.parseNumericValue(value);

		if (numericValue === null) {
			errors.push("Invalid numeric value");
			return { isValid: false, errors, value: null };
		}

		// Range validation
		if (typeof constraints.min === "number" && numericValue < constraints.min) {
			errors.push(`Value must be at least ${constraints.min}`);
		}

		if (typeof constraints.max === "number" && numericValue > constraints.max) {
			errors.push(`Value must be at most ${constraints.max}`);
		}

		return {
			isValid: errors.length === 0,
			errors,
			value: numericValue
		};
	}

	/**
	 * Get validation regex pattern based on configuration
	 *
	 * @param config - Validation configuration
	 * @returns RegExp pattern for validation
	 */
	static getValidationPattern(config: ValidationPatternConfig): RegExp {
		const {
			allowDecimals = true,
			maxDecimalDigits = 1,
			allowNegative = false,
			allowPartial = true
		} = config;

		let pattern = allowNegative ? "-?" : "";
		pattern += "\\d*";

		if (allowDecimals) {
			if (allowPartial) {
				pattern += `\\.?\\d{0,${maxDecimalDigits}}`;
			} else {
				pattern += `(\\.\\d{1,${maxDecimalDigits}})?`;
			}
		}

		return new RegExp(`^${pattern}$`);
	}
}
