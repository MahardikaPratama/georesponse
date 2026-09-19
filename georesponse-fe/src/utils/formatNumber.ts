/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : A utility function to format numeric values to a string with a
 *                specified number of fraction digits. Supports both string and number
 *                inputs and ensures that invalid inputs return an empty string.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */

/**
 * Formats a numeric value to a string with a given number of fraction digits.
 *
 * @param {string | number} value - The value to be formatted. It can be a string or a number.
 * @param {number} fractionDigits - The number of fraction digits to include after the decimal point.
 * @returns {string} The formatted string representation of the value. If the input is not a valid number, an empty string is returned.
 */
export function formatNum(
	value: string | number,
	fractionDigits: number
): string {
	const num = typeof value === "number" ? value : parseFloat(value);
	return isNaN(num) ? "" : num.toFixed(fractionDigits);
}

/**
 * Formats a number to a string with commas for thousands separator and a specified number of fraction digits.
 *
 * @param {number | string} value - The value to be formatted. It can be a string or a number.
 * @param {number} [decimals=1] - The number of fraction digits to include after the decimal point.
 * @returns {string} The formatted string representation of the value. If the input is not a valid number, returns "-".
 */
export const formatNumberWithCommas = (
	value: number | string,
	decimals: number = 1
): string => {
	const num = typeof value === "number" ? value : parseFloat(value);
	if (isNaN(num)) return "-";
	return num.toLocaleString(undefined, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	});
};

/**
 * Counts the number of decimal places in a numeric value.
 *
 * @param {number | string} value - The value to be evaluated. It can be a string or a number.
 * @returns {number} The number of decimal places in the value. If the input is not a valid number, returns 0.
 */
export const countDecimalPlaces = (value: number | string): number => {
	const num = typeof value === "number" ? value : parseFloat(value);
	if (isNaN(num)) return 0;
	const valueString = num.toString();
	const decimalIndex = valueString.indexOf(".");
	return decimalIndex === -1 ? 0 : valueString.length - decimalIndex - 1;
};

/**
 * Format a given number or numeric string by adding commas as thousand separators,
 * while keeping any decimal part of the number.
 * @param value The number or numeric string to be formatted.
 * @returns A string with commas as thousand separators, or an empty string if the
 * input is empty or null.
 */
export const formatNumber = (value: string | number | undefined): string => {
	if (value === undefined || value === null || value === "") return "";
	const [intPart, decPart] = String(value).split(".");
	const num = Number(intPart.replace(/,/g, ""));
	const intFormatted = isNaN(num) ? intPart : num.toLocaleString("en-US");
	return decPart !== undefined ? `${intFormatted}.${decPart}` : intFormatted;
};

/**
 * Remove all commas from a numeric string.
 * @param value The string to unformat.
 * @returns The string without commas.
 */
export const unformatNumber = (value: string): string =>
	value.replace(/,/g, "");

/**
 * Clean a numeric input string by removing any non-numeric characters
 * and limiting the number of decimal places to the given maximum.
 * @param raw The string to clean.
 * @param maxDecimal The maximum number of decimal places to allow.
 * @returns The cleaned string.
 */
export const cleanNumericInput = (raw: string, maxDecimal: number): string => {
	const stripped = raw.replace(/[^\d.,-]/g, "").replace(/(?!^)-/g, "");
	const [intPart, decPart] = stripped.split(".");
	const sanitizedInt = intPart === "-" ? "-" : intPart.replace(/,/g, "");
	if (maxDecimal === 0) return sanitizedInt;
	if (decPart !== undefined) {
		return `${sanitizedInt}.${decPart.slice(0, maxDecimal)}`;
	}
	return sanitizedInt;
};
