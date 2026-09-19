/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Message utilities for input validation.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import {
	countDecimalPlaces,
	formatNumberWithCommas
} from "@utils/formatNumber";

/**
 * Message options interface to reduce parameter count
 */
export interface MessageOptions {
	showError: boolean;
	showHelper: boolean;
	errorText?: string;
	helperText?: string;
	min?: number;
	max?: number;
	unit?: string;
	isNumeric?: boolean;
	isHex?: boolean;
	hexMin?: string;
	hexMax?: string;
	comma?: boolean;
}

/**
 * Formats a range message for numeric values.
 * @param min Minimum value
 * @param max Maximum value
 * @param unit Optional unit string
 * @param comma Whether to format with commas
 * @returns Formatted range message
 */
const formatNumericRangeMessage = (
	min: number,
	max: number,
	unit?: string,
	comma?: boolean
): string => {
	const formattedMin = comma
		? formatNumberWithCommas(min, countDecimalPlaces(min))
		: min.toString();
	const formattedMax = comma
		? formatNumberWithCommas(max, countDecimalPlaces(max))
		: max.toString();

	const unitSuffix = unit ? ` ${unit}` : "";
	return `Value should be ${formattedMin} ... ${formattedMax}${unitSuffix}`;
};

/**
 * Returns an error or helper message based on the given parameters.
 * @param options Message options object
 * @returns The message to display.
 */
const getErrorMessage = (options: MessageOptions): string | undefined => {
	const { errorText, min, max, unit, isNumeric, isHex, hexMin, hexMax, comma } =
		options;

	// Return custom error text if provided
	if (errorText) return errorText;

	// Handle hex range validation
	if (isHex && hexMin && hexMax) {
		return `Value should be ${hexMin} ... ${hexMax}`;
	}

	// Handle non-numeric max length validation
	if (!isNumeric && max !== undefined) {
		return `Value should be ${max}-characters max`;
	}

	// Handle numeric range validation
	if (isNumeric && min !== undefined && max !== undefined) {
		return formatNumericRangeMessage(min, max, unit, comma);
	}

	return undefined;
};

/**
 * Returns the appropriate message (error or helper) based on the provided options.
 * @param options Message options object
 * @returns The message to display.
 */
export const getMessage = (options: MessageOptions): string => {
	const { showError, showHelper, helperText } = options;

	if (showError) {
		const errorMsg = getErrorMessage(options);
		return errorMsg ?? "";
	}
	if (showHelper) return helperText ?? "";
	return "";
};
