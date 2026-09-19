/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Advanced input validation and formatting utilities with
 *                comprehensive algorithms.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import {
	createNumericPattern,
	getValidationStatus,
	isEmpty,
	validateEmptyValue,
	validateHexInput,
	validateHexRange,
	validateNumericInput,
	validateTextInput
} from "./inputValidation/basicValidators";
import { ErrorMessageGenerator } from "./inputValidation/errorMessageGenerator";
import { FieldConfigUtils } from "./inputValidation/fieldConfigUtils";
import { HelperTextGenerator } from "./inputValidation/helperTextGenerator";
import { getMessage } from "./inputValidation/messageUtils";
import { NumericValidator } from "./inputValidation/numericValidator";
import { RangeValidator } from "./inputValidation/rangeValidator";
import type {
	FieldConfig,
	FieldConstraints,
	FieldDefinition,
	RangeValidationConfig,
	ValidationConfig,
	ValidationPatternConfig,
	ValidationResult
} from "./inputValidation/types";

export type {
	FieldType,
	FieldDefinition,
	ValidationConfig,
	ValidationResult,
	RangeValidationConfig,
	FieldConfig,
	NumericValidationResult,
	RangeValidationResult,
	FieldConstraints,
	FieldConstraintsResult,
	ValidationPatternConfig
} from "./inputValidation/types";

export type { MessageOptions } from "./inputValidation/messageUtils";
export type { ValidationOptions } from "./inputValidation/basicValidators";

/**
 * Advanced Input Validation and Formatting Utilities
 *
 * Provides comprehensive algorithms for input validation, formatting,
 * and processing with extensive customization options.
 */
export class InputValidationUtils {
	/**
	 * Default validation configuration
	 */
	private static readonly DEFAULT_CONFIG: ValidationConfig = {
		maxDecimalDigits: 1,
		allowEmpty: true,
		formatThousands: false,
		trimWhitespace: true,
		errorMessages: {
			required: "Value should not be empty",
			min: "Value should be {min} ... {max} {unit}",
			max: "Value should be {min} ... {max} {unit}",
			pattern: "Invalid format",
			range: "End value must be greater than or equal to start value",
			decimal: "Too many decimal places"
		}
	};

	/**
	 * Comprehensive input validation with advanced algorithms
	 *
	 * @param input - The input value to validate
	 * @param config - Validation configuration
	 * @returns Detailed validation result
	 */
	static validateInput(
		input: string | null | undefined,
		config: ValidationConfig = {}
	): ValidationResult {
		const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };
		const errors: string[] = [];
		const appliedRules: string[] = [];
		const processedValue = input?.toString() ?? null;
		const hasBeenFormatted = false;

		// Handle null/undefined/empty cases
		if (!processedValue || processedValue.trim() === "") {
			return this.handleEmptyInput(
				input,
				mergedConfig,
				errors,
				appliedRules,
				hasBeenFormatted
			);
		}

		// Process non-empty input
		const processingResult = this.processNonEmptyInput(
			processedValue,
			mergedConfig,
			errors,
			appliedRules,
			hasBeenFormatted
		);

		const numericValue = NumericValidator.parseNumericValue(
			processingResult.processedValue
		);

		// Generate helper text and error messages
		const { helperText, finalErrorMessage } = this.generateValidationMessages(
			mergedConfig,
			processingResult.errors,
			processingResult.processedValue
		);

		return {
			isValid: processingResult.errors.length === 0,
			processedValue: processingResult.processedValue,
			errors: processingResult.errors,
			errorMessage: finalErrorMessage ?? processingResult.errors[0],
			helperText,
			metadata: {
				originalValue: input?.toString() ?? null,
				hasBeenFormatted: processingResult.hasBeenFormatted,
				numericValue: numericValue ?? undefined,
				appliedRules: processingResult.appliedRules
			}
		};
	}

	/**
	 * Handle empty input validation
	 *
	 * @param input - The input value to validate (can be string, null, or undefined)
	 * @param mergedConfig - The merged validation configuration
	 * @param errors - Array to collect error messages
	 * @param appliedRules - Array to collect applied validation rules
	 * @param hasBeenFormatted - Indicates if the value has been formatted
	 * @returns ValidationResult object for the empty input case
	 */
	private static handleEmptyInput(
		input: string | null | undefined,
		mergedConfig: ValidationConfig,
		errors: string[],
		appliedRules: string[],
		hasBeenFormatted: boolean
	): ValidationResult {
		let emptyFieldError: string | undefined;
		let helperText: string | undefined;

		if (!mergedConfig.allowEmpty) {
			if (mergedConfig.fieldDefinition) {
				emptyFieldError = ErrorMessageGenerator.generateErrorMessage(
					mergedConfig.fieldDefinition,
					"required"
				);
				helperText = HelperTextGenerator.generateHelperText(
					mergedConfig.fieldDefinition
				);
			} else {
				emptyFieldError = mergedConfig.errorMessages?.required ?? "Required";
			}
			errors.push(emptyFieldError);
			appliedRules.push("required");
		} else if (mergedConfig.fieldDefinition) {
			helperText = HelperTextGenerator.generateHelperText(
				mergedConfig.fieldDefinition
			);
		}

		return {
			isValid: errors.length === 0,
			processedValue: mergedConfig.allowEmpty
				? null
				: (input?.toString() ?? null),
			errors,
			errorMessage: emptyFieldError,
			helperText,
			metadata: {
				originalValue: input?.toString() ?? null,
				hasBeenFormatted,
				appliedRules
			}
		};
	}

	/**
	 * Process non-empty input
	 *
	 * @param processedValue - The input value after initial processing
	 * @param mergedConfig - The merged validation configuration
	 * @param errors - Array to collect error messages
	 * @param appliedRules - Array to collect applied validation rules
	 * @param hasBeenFormatted - Indicates if the value has been formatted
	 * @returns An object containing the processed value, errors, applied rules, and formatting status
	 */
	private static processNonEmptyInput(
		processedValue: string,
		mergedConfig: ValidationConfig,
		errors: string[],
		appliedRules: string[],
		hasBeenFormatted: boolean
	): {
		processedValue: string;
		errors: string[];
		appliedRules: string[];
		hasBeenFormatted: boolean;
	} {
		// Trim whitespace if enabled
		if (mergedConfig.trimWhitespace) {
			const trimmed = processedValue.trim();
			if (trimmed !== processedValue) {
				hasBeenFormatted = true;
				appliedRules.push("trim");
			}
			processedValue = trimmed;
		}

		// Custom pattern validation
		if (
			mergedConfig.customPattern &&
			!mergedConfig.customPattern.test(processedValue)
		) {
			errors.push(mergedConfig.errorMessages?.pattern ?? "Invalid format");
			appliedRules.push("pattern");
		}

		// Numeric validation if min/max are specified
		if (
			typeof mergedConfig.min === "number" ||
			typeof mergedConfig.max === "number"
		) {
			const numericResult = NumericValidator.validateNumericInput(
				processedValue,
				mergedConfig
			);
			errors.push(...numericResult.errors);
			appliedRules.push(...numericResult.appliedRules);

			if (numericResult.formattedValue !== processedValue) {
				hasBeenFormatted = true;
				processedValue = numericResult.formattedValue;
			}
		}

		return { processedValue, errors, appliedRules, hasBeenFormatted };
	}

	/**
	 * Generate validation messages
	 *
	 * @param mergedConfig - The merged validation configuration
	 * @param errors - Array of validation errors
	 * @param processedValue - The processed value to validate
	 * @returns An object containing helper text and the final error message
	 */
	private static generateValidationMessages(
		mergedConfig: ValidationConfig,
		errors: string[],
		processedValue: string
	): {
		helperText?: string;
		finalErrorMessage?: string;
	} {
		let helperText: string | undefined;
		let finalErrorMessage: string | undefined;

		if (mergedConfig.fieldDefinition) {
			helperText = HelperTextGenerator.generateHelperText(
				mergedConfig.fieldDefinition
			);

			if (errors.length > 0) {
				finalErrorMessage = ErrorMessageGenerator.generateStandardErrorMessage(
					mergedConfig.fieldDefinition,
					errors,
					processedValue
				);
			}
		}

		return { helperText, finalErrorMessage };
	}

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
	): {
		isValid: boolean;
		formattedValue: string;
		errors: string[];
		appliedRules: string[];
	} {
		return NumericValidator.validateNumericInput(input, config);
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
		return NumericValidator.ensureDecimalPrecision(
			input,
			decimalDigits,
			paddingStrategy
		);
	}

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
	): {
		isValid: boolean;
		errorMessage?: string;
		metadata: {
			fromNumeric?: number;
			toNumeric?: number;
			bothPresent: boolean;
		};
	} {
		return RangeValidator.validateRange(fromValue, toValue, config);
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
		return NumericValidator.processControlledInput(value, config);
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
		return NumericValidator.formatWithThousandsSeparator(input, separator);
	}

	/**
	 * Parse numeric value from string, handling thousands separators
	 *
	 * @param input - The input string
	 * @returns Parsed number or null if invalid
	 */
	static parseNumericValue(input: string | null): number | null {
		return NumericValidator.parseNumericValue(input);
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
	): {
		isValid: boolean;
		errors: string[];
		value: number | null;
	} {
		return NumericValidator.validateFieldConstraints(value, constraints);
	}

	/**
	 * Get validation regex pattern based on configuration
	 *
	 * @param config - Validation configuration
	 * @returns RegExp pattern for validation
	 */
	static getValidationPattern(config: ValidationPatternConfig): RegExp {
		return NumericValidator.getValidationPattern(config);
	}

	/**
	 * Generate helper text for active state (non-error)
	 *
	 * @param fieldDefinition - Field definition with constraints
	 * @returns Helper text string for active state
	 */
	static generateHelperText(fieldDefinition: FieldDefinition): string {
		return HelperTextGenerator.generateHelperText(fieldDefinition);
	}

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
		return ErrorMessageGenerator.generateErrorMessage(
			fieldDefinition,
			errorType
		);
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
		return ErrorMessageGenerator.generateStandardErrorMessage(
			fieldDefinition,
			validationErrors,
			value
		);
	}

	/**
	 * Create field definition from field configuration (from constants)
	 *
	 * @param fieldConfig - Field configuration from constants
	 * @returns Field definition for validation
	 */
	static createFieldDefinitionFromConfig(
		fieldConfig: FieldConfig
	): FieldDefinition {
		return FieldConfigUtils.createFieldDefinitionFromConfig(fieldConfig);
	}

	/**
	 * Validate input with field configuration (from constants)
	 *
	 * @param input - The input value to validate
	 * @param fieldConfig - Field configuration from constants
	 * @param additionalConfig - Additional validation configuration
	 * @returns Validation result with standardized messages
	 */
	static validateWithFieldConfig(
		input: string | null | undefined,
		fieldConfig: FieldConfig,
		additionalConfig: Omit<ValidationConfig, "fieldDefinition"> = {}
	): ValidationResult {
		return FieldConfigUtils.validateWithFieldConfig(
			input,
			fieldConfig,
			(inp: string | null | undefined, config: ValidationConfig) =>
				InputValidationUtils.validateInput(inp, config),
			additionalConfig
		);
	}

	/**
	 * Get helper text for a field configuration (from constants)
	 *
	 * @param fieldConfig - Field configuration from constants
	 * @returns Helper text string
	 */
	static getHelperTextForFieldConfig(fieldConfig: FieldConfig): string {
		return FieldConfigUtils.getHelperTextForFieldConfig(fieldConfig);
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
		return FieldConfigUtils.getErrorMessageForFieldConfig(
			fieldConfig,
			errorType
		);
	}

	// ===== Basic Validation Utilities =====

	/**
	 * Checks if a value is empty.
	 * @param value The string value to check.
	 * @returns True if the value is empty, undefined, or null; otherwise, false.
	 */
	public static readonly isEmpty = isEmpty;

	/**
	 * Validates empty values based on allowEmpty and hasBlurred flags.
	 * @param raw The raw string value to validate.
	 * @param allowEmpty Whether empty values are allowed.
	 * @param hasBlurred Whether the input has lost focus (blurred).
	 * @returns True if valid, false if invalid, or null to continue with other validations.
	 */
	public static readonly validateEmptyValue = validateEmptyValue;

	/**
	 * Validates hexadecimal input within a specified range.
	 * @param value The hexadecimal string to validate.
	 * @param min The minimum hexadecimal value as string.
	 * @param max The maximum hexadecimal value as string.
	 * @returns true if the value is within range, false otherwise.
	 */
	public static readonly validateHexRange = validateHexRange;

	/**
	 * Validates hexadecimal input.
	 * @param options An object containing raw value, validate function, pattern, hexMin, and hexMax.
	 * @returns True if the input is valid hexadecimal and within range, false otherwise.
	 */
	public static readonly validateHexInput = validateHexInput;

	/**
	 * Validates non-numeric (text) input.
	 * @param options An object containing raw value, validate function, pattern, min, max, and allowEmpty.
	 * @returns True if the input is valid text according to the rules, false otherwise.
	 */
	public static readonly validateTextInput = validateTextInput;

	/**
	 * Creates numeric pattern based on maxDecimal.
	 * @param maxDecimal The maximum number of decimal places allowed.
	 * @returns A RegExp object for validating numeric input.
	 */
	public static readonly createNumericPattern = createNumericPattern;

	/**
	 * Validates numeric input (extended version).
	 * @param options An object containing raw value, validate function, pattern, min, max, and maxDecimal.
	 * @returns True if the input is valid numeric according to the rules, false otherwise.
	 */
	public static readonly validateNumericInputExtended = validateNumericInput;

	/**
	 * Checks if a given string is valid according to the specified criteria.
	 * @param options Validation options object
	 * @returns true if the string is valid, false otherwise.
	 */
	public static readonly getValidationStatus = getValidationStatus;

	// ===== Message Utilities =====

	/**
	 * Returns an error or helper message based on the given parameters.
	 * @param options Message options object
	 * @returns The message to display.
	 */
	public static readonly getMessage = getMessage;
}
