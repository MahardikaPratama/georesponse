/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Error message generation utilities for input validation.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import { formatNumberWithCommas } from "@utils/formatNumber";

import type { FieldConfig, FieldDefinition } from "./types";

/**
 * Error Message Generation Utilities
 */
export class ErrorMessageGenerator {
	/**
	 * Generate error message for error state
	 *
	 * @param fieldDefinition - Field definition with constraints
	 * @param errorType - Type of error ('required', 'range', 'min', 'max', 'length')
	 * @returns Error message string for error state
	 */
	static generateErrorMessage(
		fieldDefinition: FieldDefinition,
		errorType: "required" | "range" | "min" | "max" | "length" | "pattern"
	): string {
		switch (errorType) {
			case "required":
				return "Value should not be empty";

			case "range":
			case "min":
			case "max":
				return this.generateRangeErrorMessage(fieldDefinition);

			case "length":
				return this.generateLengthErrorMessage(fieldDefinition);

			case "pattern":
			default:
				return "Invalid format";
		}
	}

	/**
	 * Generate error message for range/min/max validation
	 *
	 * @param fieldDefinition - Field definition with constraints
	 * @returns Error message string for range validation
	 */
	private static generateRangeErrorMessage(
		fieldDefinition: FieldDefinition
	): string {
		if (fieldDefinition.type !== "numeric-range") {
			return "Invalid value";
		}

		if (
			fieldDefinition.min === undefined ||
			fieldDefinition.max === undefined
		) {
			return "Invalid value";
		}

		const unit = fieldDefinition.unit ? ` ${fieldDefinition.unit}` : "";
		const { minStr, maxStr } = this.formatMinMaxValues(
			fieldDefinition.min,
			fieldDefinition.max,
			fieldDefinition.decimalPlaces
		);

		const formattedMinStr = fieldDefinition.formatThousands
			? formatNumberWithCommas(minStr, fieldDefinition.decimalPlaces)
			: minStr;
		const formattedMaxStr = fieldDefinition.formatThousands
			? formatNumberWithCommas(maxStr, fieldDefinition.decimalPlaces)
			: maxStr;

		return `Value should be ${formattedMinStr} ... ${formattedMaxStr}${unit}`;
	}

	/**
	 * Generate error message for length validation
	 *
	 * @param fieldDefinition - Field definition with constraints
	 * @returns Error message string for length validation
	 */
	private static generateLengthErrorMessage(
		fieldDefinition: FieldDefinition
	): string {
		if (
			fieldDefinition.type === "character-limit" &&
			fieldDefinition.maxLength !== undefined
		) {
			const charType = fieldDefinition.characterType ?? "characters";
			return `Value should be ${fieldDefinition.maxLength} ... ${charType} max`;
		}
		return "Value too long";
	}

	/**
	 * Format min/max values based on decimal places
	 *
	 * @param min - The minimum value to format
	 * @param max - The maximum value to format
	 * @param decimalPlaces - Number of decimal places to show (optional)
	 * @returns An object containing formatted min and max strings
	 */
	private static formatMinMaxValues(
		min: number,
		max: number,
		decimalPlaces?: number
	): { minStr: string; maxStr: string } {
		if (typeof decimalPlaces === "number") {
			// Always show decimal places when specified, regardless of whether number is whole
			return {
				minStr: min.toFixed(decimalPlaces),
				maxStr: max.toFixed(decimalPlaces)
			};
		}

		// Default behavior: show decimals if they are not whole numbers
		return {
			minStr: min % 1 === 0 ? min.toString() : min.toFixed(1),
			maxStr: max % 1 === 0 ? max.toString() : max.toFixed(1)
		};
	}

	/**
	 * Generate standardized error message based on field definition and validation result
	 *
	 * @param fieldDefinition - Field definition with constraints
	 * @param validationErrors - Array of validation errors detected
	 * @param value - Current field value
	 * @returns Appropriate error message following the standard format
	 */
	static generateStandardErrorMessage(
		fieldDefinition: FieldDefinition,
		validationErrors: string[],
		value?: string | null
	): string {
		// Check for required field error
		if (!value || value.trim() === "") {
			return this.generateErrorMessage(fieldDefinition, "required");
		}

		// Check for range/constraint errors
		if (
			validationErrors.some(
				(error) => error.includes("should be") || error.includes("range")
			)
		) {
			return this.generateErrorMessage(fieldDefinition, "range");
		}

		// Check for length errors
		if (
			validationErrors.some(
				(error) => error.includes("length") || error.includes("characters")
			)
		) {
			return this.generateErrorMessage(fieldDefinition, "length");
		}

		// Check for pattern errors
		if (
			validationErrors.some(
				(error) => error.includes("format") || error.includes("pattern")
			)
		) {
			return this.generateErrorMessage(fieldDefinition, "pattern");
		}

		// Fallback to first error message
		return validationErrors[0] ?? "Invalid value";
	}

	/**
	 * Get error message for a field configuration (from constants)
	 *
	 * @param fieldConfig - Field configuration from constants
	 * @param errorType - Type of error
	 * @returns Error message string
	 */
	static getErrorMessageForFieldConfig(
		fieldConfig: FieldConfig,
		errorType: "required" | "range" | "min" | "max" | "length" | "pattern"
	): string {
		const fieldDefinition = this.createFieldDefinitionFromConfig(fieldConfig);
		return this.generateErrorMessage(fieldDefinition, errorType);
	}

	/**
	 * Create field definition from field configuration (from constants)
	 *
	 * @param fieldConfig - Field configuration from constants
	 * @returns Field definition for validation
	 */
	private static createFieldDefinitionFromConfig(
		fieldConfig: FieldConfig
	): FieldDefinition {
		const effectiveType: string =
			fieldConfig.validationType ?? fieldConfig.type;

		if (effectiveType === "text") {
			return {
				type: "character-limit",
				name: fieldConfig.name,
				maxLength:
					typeof fieldConfig.max === "number"
						? fieldConfig.max
						: parseInt(fieldConfig.max ?? "0"),
				characterType: "characters"
			};
		}

		if (
			effectiveType === "dropdown" ||
			effectiveType === "searchable-dropdown"
		) {
			return {
				type: "dropdown",
				name: fieldConfig.name
			};
		}

		if (effectiveType === "datetime") {
			return {
				type: "datetime",
				name: fieldConfig.name
			};
		}

		// Default to numeric-range
		const min =
			typeof fieldConfig.min === "string"
				? parseFloat(fieldConfig.min)
				: fieldConfig.min;
		const max =
			typeof fieldConfig.max === "string"
				? parseFloat(fieldConfig.max)
				: fieldConfig.max;

		return {
			type: "numeric-range",
			name: fieldConfig.name,
			min,
			max,
			unit: fieldConfig.unit,
			decimalPlaces: fieldConfig.precision ?? 0,
			formatThousands: fieldConfig.comma ?? false
		};
	}
}
