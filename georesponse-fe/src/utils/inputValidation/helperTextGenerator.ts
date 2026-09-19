/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Helper text generation utilities for input validation.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import { formatNumberWithCommas } from "@utils/formatNumber";

import type { FieldConfig, FieldDefinition } from "./types";

/**
 * Helper Text Generation Utilities
 */
export class HelperTextGenerator {
	/**
	 * Generate helper text for active state (non-error)
	 *
	 * @param fieldDefinition - Field definition with constraints
	 * @returns Helper text string for active state
	 */
	static generateHelperText(fieldDefinition: FieldDefinition): string {
		switch (fieldDefinition.type) {
			case "numeric-range":
				return this.generateNumericRangeHelperText(fieldDefinition);

			case "character-limit":
				return this.generateCharacterLimitHelperText(fieldDefinition);

			case "hex":
				return this.generateHexRangeHelperText(fieldDefinition);

			case "dropdown":
			case "datetime":
			default:
				// No helper text for dropdowns and date time pickers
				return "";
		}
	}

	/**
	 * Generate helper text for numeric range fields
	 *
	 * @param fieldDefinition - Field definition with constraints for numeric range
	 * @returns Helper text string for numeric range fields
	 */
	private static generateNumericRangeHelperText(
		fieldDefinition: FieldDefinition
	): string {
		if (
			fieldDefinition.min === undefined ||
			fieldDefinition.max === undefined
		) {
			return "";
		}

		const unit = fieldDefinition.unit ? ` ${fieldDefinition.unit}` : "";
		const { minStr, maxStr } = this.formatMinMaxValues(
			fieldDefinition.min,
			fieldDefinition.max,
			fieldDefinition.decimalPlaces
		);

		// Only format with commas if formatThousands is true
		const formattedMinStr = fieldDefinition.formatThousands
			? formatNumberWithCommas(minStr, fieldDefinition.decimalPlaces)
			: minStr;
		const formattedMaxStr = fieldDefinition.formatThousands
			? formatNumberWithCommas(maxStr, fieldDefinition.decimalPlaces)
			: maxStr;

		return `${formattedMinStr} ... ${formattedMaxStr}${unit}`;
	}

	/**
	 * Generate helper text for hex range fields
	 * @param fieldDefinition - Field definition with constraints for hex range
	 * @returns Helper text string for hex range fields
	 */
	private static generateHexRangeHelperText(
		fieldDefinition: FieldDefinition
	): string {
		if (!HelperTextGenerator.isHexFieldDefinition(fieldDefinition)) {
			return "";
		}
		const { hexMin, hexMax } = fieldDefinition;
		const minStr = hexMin ?? "";
		const maxStr = hexMax ?? "";
		return `${minStr} ... ${maxStr}`;
	}

	/**
	 * Type guard to check if a FieldDefinition is a hex field
	 *
	 * @param fieldDefinition - The field definition to check
	 * @returns True if the field definition is a hex field, otherwise false
	 */
	private static isHexFieldDefinition(
		fieldDefinition: FieldDefinition
	): fieldDefinition is FieldDefinition & { hexMin?: string; hexMax?: string } {
		return (
			fieldDefinition.type === "hex" &&
			("hexMin" in fieldDefinition || "hexMax" in fieldDefinition)
		);
	}

	/**
	 * Generate helper text for character limit fields
	 *
	 * @param fieldDefinition - Field definition with constraints for character limit
	 * @returns Helper text string for character limit fields
	 */
	private static generateCharacterLimitHelperText(
		fieldDefinition: FieldDefinition
	): string {
		if (fieldDefinition.maxLength === undefined) {
			return "";
		}

		const charType = fieldDefinition.characterType ?? "characters";
		return `${fieldDefinition.maxLength}-${charType} max`;
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
	 * Get helper text for a field configuration (from constants)
	 *
	 * @param fieldConfig - Field configuration from constants
	 * @returns Helper text string
	 */
	static getHelperTextForFieldConfig(fieldConfig: FieldConfig): string {
		const fieldDefinition = this.createFieldDefinitionFromConfig(fieldConfig);
		return this.generateHelperText(fieldDefinition);
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

		if (effectiveType === "hex") {
			return {
				type: "hex",
				name: fieldConfig.name,
				hexMin: fieldConfig.min
					? String(fieldConfig.min).toUpperCase().padStart(6, "0")
					: undefined,
				hexMax: fieldConfig.max
					? String(fieldConfig.max).toUpperCase().padStart(6, "0")
					: undefined
			};
		}

		if (
			effectiveType === "number" &&
			typeof fieldConfig.min === "string" &&
			typeof fieldConfig.max === "string" &&
			(fieldConfig.min.startsWith("0") || fieldConfig.max.startsWith("0"))
		) {
			return {
				type: "hex",
				name: fieldConfig.name,
				hexMin: fieldConfig.min,
				hexMax: fieldConfig.max
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
