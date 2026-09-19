/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Types and interfaces for input validation utilities.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */

/**
 * Field type for helper text generation
 */
export type FieldType =
	| "numeric-range"
	| "character-limit"
	| "dropdown"
	| "datetime"
	| "hex";

/**
 * Field definition for helper text generation
 */
export interface FieldDefinition {
	/** Type of field */
	type: FieldType;
	/** Field name/label */
	name: string;
	/** Minimum value (for numeric fields) */
	min?: number;
	/** Maximum value (for numeric fields) */
	max?: number;
	/** Minimum value (for hex fields) */
	hexMin?: string;
	/** Maximum value (for hex fields) */
	hexMax?: string;
	/** Maximum character length (for text fields) */
	maxLength?: number;
	/** Unit for numeric fields (e.g., 'm', 'deg', 'kts') */
	unit?: string;
	/** Character type for text fields (e.g., 'characters', 'digits') */
	characterType?: string;
	/** Number of decimal places to show (for numeric fields) */
	decimalPlaces?: number;
	/** Whether to format numbers with thousands separators */
	formatThousands?: boolean;
}

/**
 * Configuration interface for input validation and formatting
 */
export interface ValidationConfig {
	/** Maximum number of decimal places allowed */
	maxDecimalDigits?: number;
	/** Minimum allowed value for numeric fields */
	min?: number;
	/** Maximum allowed value for numeric fields */
	max?: number;
	/** Whether to allow empty/null values */
	allowEmpty?: boolean;
	/** Whether to format numbers with thousands separators */
	formatThousands?: boolean;
	/** Custom validation pattern (regex) */
	customPattern?: RegExp;
	/** Whether to trim whitespace */
	trimWhitespace?: boolean;
	/** Field definition for helper text generation */
	fieldDefinition?: FieldDefinition;
	/** Custom error messages */
	errorMessages?: {
		required?: string;
		min?: string;
		max?: string;
		pattern?: string;
		range?: string;
		decimal?: string;
	};
}

/**
 * Advanced input validation result
 */
export interface ValidationResult {
	/** Whether the input is valid */
	isValid: boolean;
	/** Formatted/processed value */
	processedValue: string | null;
	/** Error message if validation failed */
	errorMessage?: string;
	/** Helper text for active state */
	helperText?: string;
	/** Array of all validation errors */
	errors: string[];
	/** Metadata about the validation */
	metadata: {
		originalValue: string | null;
		hasBeenFormatted: boolean;
		numericValue?: number;
		appliedRules: string[];
	};
}

/**
 * Range validation configuration
 */
export interface RangeValidationConfig {
	/** Whether both values must be present for validation */
	requireBothValues?: boolean;
	/** Custom comparison function */
	customComparator?: (from: number, to: number) => boolean;
	/** Whether to allow equal values */
	allowEqual?: boolean;
	/** Error message for range validation */
	errorMessage?: string;
}

/**
 * Field configuration for creating field definitions
 */
export interface FieldConfig {
	name: string;
	type: string;
	validationType?: string;
	min?: number | string;
	max?: number | string;
	unit?: string;
	helperText?: string;
	precision?: number;
	comma?: boolean;
}

/**
 * Numeric validation result
 */
export interface NumericValidationResult {
	isValid: boolean;
	formattedValue: string;
	errors: string[];
	appliedRules: string[];
}

/**
 * Range validation result
 */
export interface RangeValidationResult {
	isValid: boolean;
	errorMessage?: string;
	metadata: {
		fromNumeric?: number;
		toNumeric?: number;
		bothPresent: boolean;
	};
}

/**
 * Field constraints for validation
 */
export interface FieldConstraints {
	min?: number;
	max?: number;
	required?: boolean;
	pattern?: RegExp;
	customValidator?: (value: string) => boolean | string;
}

/**
 * Field constraints validation result
 */
export interface FieldConstraintsResult {
	isValid: boolean;
	errors: string[];
	value: number | null;
}

/**
 * Validation pattern configuration
 */
export interface ValidationPatternConfig {
	allowDecimals?: boolean;
	maxDecimalDigits?: number;
	allowNegative?: boolean;
	allowPartial?: boolean;
}
