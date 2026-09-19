/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Field configuration utilities for input validation.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import { ErrorMessageGenerator } from "./errorMessageGenerator";
import { HelperTextGenerator } from "./helperTextGenerator";
import type {
	FieldConfig,
	FieldDefinition,
	ValidationConfig,
	ValidationResult
} from "./types";

/**
 * Field Configuration Utilities
 */
export class FieldConfigUtils {
	/**
	 * Create field definition from field configuration (from constants)
	 *
	 * @param fieldConfig - Field configuration from constants
	 * @returns Field definition for validation
	 */
	static createFieldDefinitionFromConfig(
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

		if (effectiveType === "hex") {
			return {
				type: "hex",
				name: fieldConfig.name,
				min:
					typeof fieldConfig.min === "string"
						? parseInt(fieldConfig.min, 16)
						: fieldConfig.min,
				max:
					typeof fieldConfig.max === "string"
						? parseInt(fieldConfig.max, 16)
						: fieldConfig.max
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

	/**
	 * Validate input with field configuration (from constants)
	 *
	 * @param input - The input value to validate
	 * @param fieldConfig - Field configuration from constants
	 * @param validateInput - The validation function to use
	 * @param additionalConfig - Additional validation configuration
	 * @returns Validation result with standardized messages
	 */
	static validateWithFieldConfig(
		input: string | null | undefined,
		fieldConfig: FieldConfig,
		validateInput: (
			input: string | null | undefined,
			config: ValidationConfig
		) => ValidationResult,
		additionalConfig: Omit<ValidationConfig, "fieldDefinition"> = {}
	): ValidationResult {
		const fieldDefinition = this.createFieldDefinitionFromConfig(fieldConfig);

		const config: ValidationConfig = {
			...additionalConfig,
			fieldDefinition,
			min: fieldDefinition.min,
			max: fieldDefinition.max
		};

		return validateInput(input, config);
	}

	/**
	 * Get helper text for a field configuration (from constants)
	 *
	 * @param fieldConfig - Field configuration from constants
	 * @returns Helper text string
	 */
	static getHelperTextForFieldConfig(fieldConfig: FieldConfig): string {
		return HelperTextGenerator.getHelperTextForFieldConfig(fieldConfig);
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
		return ErrorMessageGenerator.getErrorMessageForFieldConfig(
			fieldConfig,
			errorType
		);
	}
}
