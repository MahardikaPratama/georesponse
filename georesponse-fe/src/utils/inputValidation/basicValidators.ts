/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Basic validation utilities for input validation.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */

/**
 * Validation options interface to reduce parameter count
 */
export interface ValidationOptions {
	raw: string;
	pattern: RegExp | null;
	min?: number;
	max?: number;
	validate?: (val: string | number) => boolean;
	maxDecimal?: number;
	allowEmpty?: boolean;
	isNumeric?: boolean;
	hasBlurred?: boolean;
	isHex?: boolean;
	hexMin?: string;
	hexMax?: string;
}

/**
 * Checks if a value is empty.
 * @param value The string value to check.
 * @returns True if the value is empty, undefined, or null; otherwise, false.
 */
export const isEmpty = (value: string): boolean => {
	return value === "" || value === undefined || value === null;
};

/**
 * Validates empty values based on allowEmpty and hasBlurred flags.
 * @param raw The raw string value to validate.
 * @param allowEmpty Whether empty values are allowed.
 * @param hasBlurred Whether the input has lost focus (blurred).
 * @returns True if valid, false if invalid, or null to continue with other validations.
 */
export const validateEmptyValue = (
	raw: string,
	allowEmpty?: boolean,
	hasBlurred?: boolean
): boolean | null => {
	if (isEmpty(raw)) {
		if (allowEmpty) {
			return true;
		}
		if (hasBlurred) {
			return false;
		}
	}
	return null; // Continue with other validations
};

/**
 * Validates hexadecimal input within a specified range.
 * @param value The hexadecimal string to validate.
 * @param min The minimum hexadecimal value as string.
 * @param max The maximum hexadecimal value as string.
 * @returns true if the value is within range, false otherwise.
 */
export const validateHexRange = (
	value: string,
	min?: string,
	max?: string
): boolean => {
	if (!value) return false;

	// Check if it's a valid hex string (only contains 0-9, A-F, a-f)
	if (!/^[0-9A-Fa-f]+$/.test(value)) return false;

	// Convert to uppercase for comparison
	const upperValue = value.toUpperCase();

	if (min && max) {
		const upperMin = min.toUpperCase();
		const upperMax = max.toUpperCase();

		// Pad with zeros to ensure same length comparison
		const maxLength = Math.max(
			upperValue.length,
			upperMin.length,
			upperMax.length
		);
		const paddedValue = upperValue.padStart(maxLength, "0");
		const paddedMin = upperMin.padStart(maxLength, "0");
		const paddedMax = upperMax.padStart(maxLength, "0");

		return paddedValue >= paddedMin && paddedValue <= paddedMax;
	}

	return true;
};

/**
 * Validates hexadecimal input.
 * @param options An object containing raw value, validate function, pattern, hexMin, and hexMax.
 * @returns True if the input is valid hexadecimal and within range, false otherwise.
 */
export const validateHexInput = (
	options: Pick<
		ValidationOptions,
		"raw" | "validate" | "pattern" | "hexMin" | "hexMax"
	>
): boolean => {
	const { raw, validate, pattern, hexMin, hexMax } = options;

	if (validate) return validate(raw);
	if (pattern && !pattern.test(raw)) return false;
	return validateHexRange(raw, hexMin, hexMax);
};

/**
 * Validates non-numeric (text) input.
 * @param options - An object containing raw value, validate function, pattern, min, max, and allowEmpty.
 * @returns True if the input is valid text according to the rules, false otherwise.
 */
export const validateTextInput = (
	options: Pick<
		ValidationOptions,
		"raw" | "validate" | "pattern" | "min" | "max" | "allowEmpty"
	>
): boolean => {
	const { raw, validate, pattern, min, max, allowEmpty } = options;

	if (validate) return validate(raw);
	if (pattern) return pattern.test(raw);
	if (max !== undefined && raw.length > max) return false;
	if (min !== undefined && raw.length < min) return false;
	return raw !== "" || !!allowEmpty;
};

/**
 * Creates numeric pattern based on maxDecimal.
 * @param maxDecimal The maximum number of decimal places allowed.
 * @returns A RegExp object for validating numeric input.
 */
export const createNumericPattern = (maxDecimal?: number): RegExp => {
	if (maxDecimal && maxDecimal > 0) {
		const source = `^-?\\d*(\\.\\d{0,${maxDecimal}})?$`;
		return new RegExp(source);
	}
	return /^-?\d+$/;
};

/**
 * Validates numeric input.
 * @param options - An object containing raw value, validate function, pattern, min, max, and maxDecimal.
 * @returns True if the input is valid numeric according to the rules, false otherwise.
 */
export const validateNumericInput = (
	options: Pick<
		ValidationOptions,
		"raw" | "validate" | "pattern" | "min" | "max" | "maxDecimal"
	>
): boolean => {
	const { raw, validate, pattern, min, max, maxDecimal } = options;

	const parsed = parseFloat(raw);

	if (validate) return validate(parsed);
	if (isNaN(parsed)) return false;

	if (pattern) {
		const numericPattern = createNumericPattern(maxDecimal);
		if (!numericPattern.test(raw)) return false;
	}

	if (min !== undefined && parsed < min) return false;
	if (max !== undefined && parsed > max) return false;

	return true;
};

/**
 * Validates if a given MID (Manufacturer ID) is valid.
 * @param mid The MID number to validate.
 * @returns true if the MID is valid, false otherwise.
 */
export const validateMID = (mid: number): boolean => {
	const validMID = [
		201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215,
		216, 218, 219, 220, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234,
		235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249,
		250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 261, 262, 263, 264, 265,
		266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 301,
		303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 314, 316, 319, 321, 323,
		325, 327, 329, 330, 331, 332, 334, 336, 338, 339, 341, 343, 345, 347, 348,
		350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 361, 362, 364, 366, 367,
		368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 401, 403, 405,
		408, 410, 412, 413, 414, 416, 417, 419, 422, 423, 425, 428, 431, 432, 434,
		436, 437, 438, 440, 441, 443, 445, 447, 450, 451, 453, 455, 457, 459, 461,
		463, 466, 468, 470, 471, 472, 473, 475, 477, 478, 501, 503, 506, 508, 510,
		511, 512, 514, 515, 516, 518, 520, 523, 525, 529, 531, 533, 536, 538, 540,
		542, 544, 546, 548, 550, 553, 555, 557, 559, 561, 563, 564, 565, 566, 567,
		570, 572, 574, 576, 577, 578, 601, 603, 605, 607, 608, 609, 610, 611, 612,
		613, 615, 616, 617, 618, 619, 620, 621, 622, 624, 625, 626, 627, 629, 630,
		631, 632, 633, 634, 635, 636, 637, 638, 642, 644, 645, 647, 649, 650, 654,
		655, 656, 657, 659, 660, 661, 662, 663, 664, 665, 666, 667, 668, 669, 670,
		671, 672, 674, 675, 676, 677, 678, 679, 701, 710, 720, 725, 730, 735, 740,
		745, 750, 755, 760, 765, 770, 775
	];

	return validMID.includes(mid);
};

/**
 * Validates if a given ICAO code is valid.
 * @param icao The ICAO code string to validate.
 * @returns true if the ICAO code is valid, false otherwise.
 */
export const validateICAOAddress = (icao: string): boolean => {
	const validICAOs = [
		{ from: "004000", to: "0043FF" },
		{ from: "006000", to: "006FFF" },
		{ from: "008000", to: "00FFFF" },
		{ from: "010000", to: "017FFF" },
		{ from: "018000", to: "01FFFF" },
		{ from: "020000", to: "027FFF" },
		{ from: "028000", to: "02FFFF" },
		{ from: "030000", to: "0303FF" },
		{ from: "032000", to: "032FFF" },
		{ from: "034000", to: "034FFF" },
		{ from: "035000", to: "0353FF" },
		{ from: "036000", to: "036FFF" },
		{ from: "038000", to: "038FFF" },
		{ from: "03E000", to: "03EFFF" },
		{ from: "040000", to: "040FFF" },
		{ from: "042000", to: "042FFF" },
		{ from: "044000", to: "044FFF" },
		{ from: "046000", to: "046FFF" },
		{ from: "048000", to: "0483FF" },
		{ from: "04A000", to: "04A3FF" },
		{ from: "04C000", to: "04CFFF" },
		{ from: "050000", to: "050FFF" },
		{ from: "054000", to: "054FFF" },
		{ from: "058000", to: "058FFF" },
		{ from: "05A000", to: "05A3FF" },
		{ from: "05C000", to: "05CFFF" },
		{ from: "05E000", to: "05E3FF" },
		{ from: "060000", to: "0603FF" },
		{ from: "062000", to: "062FFF" },
		{ from: "064000", to: "064FFF" },
		{ from: "068000", to: "068FFF" },
		{ from: "06A000", to: "06A3FF" },
		{ from: "06C000", to: "06CFFF" },
		{ from: "06E000", to: "06EFFF" },
		{ from: "070000", to: "070FFF" },
		{ from: "074000", to: "0743FF" },
		{ from: "076000", to: "0763FF" },
		{ from: "078000", to: "078FFF" },
		{ from: "07A000", to: "07A3FF" },
		{ from: "07C000", to: "07CFFF" },
		{ from: "080000", to: "080FFF" },
		{ from: "084000", to: "084FFF" },
		{ from: "088000", to: "088FFF" },
		{ from: "08A000", to: "08AFFF" },
		{ from: "08C000", to: "08CFFF" },
		{ from: "090000", to: "090FFF" },
		{ from: "094000", to: "0943FF" },
		{ from: "096000", to: "0963FF" },
		{ from: "098000", to: "0983FF" },
		{ from: "09A000", to: "09AFFF" },
		{ from: "09C000", to: "09CFFF" },
		{ from: "09E000", to: "09E3FF" },
		{ from: "0A0000", to: "0A7FFF" },
		{ from: "0A8000", to: "0A8FFF" },
		{ from: "0AA000", to: "0AA3FF" },
		{ from: "0AB000", to: "0AB3FF" },
		{ from: "0AC000", to: "0ACFFF" },
		{ from: "0AE000", to: "0AEFFF" },
		{ from: "0B0000", to: "0B0FFF" },
		{ from: "0B2000", to: "0B2FFF" },
		{ from: "0B4000", to: "0B4FFF" },
		{ from: "0B6000", to: "0B6FFF" },
		{ from: "0B8000", to: "0B8FFF" },
		{ from: "0BA000", to: "0BAFFF" },
		{ from: "0BC000", to: "0BC3FF" },
		{ from: "0BE000", to: "0BEFFF" },
		{ from: "0C0000", to: "0C0FFF" },
		{ from: "0C2000", to: "0C2FFF" },
		{ from: "0C4000", to: "0C4FFF" },
		{ from: "0C6000", to: "0C6FFF" },
		{ from: "0C8000", to: "0C8FFF" },
		{ from: "0CA000", to: "0CA3FF" },
		{ from: "0CC000", to: "0CC3FF" },
		{ from: "0D0000", to: "0D7FFF" },
		{ from: "0D8000", to: "0DFFFF" },
		{ from: "100000", to: "1FFFFF" },
		{ from: "201000", to: "2013FF" },
		{ from: "202000", to: "2023FF" },
		{ from: "300000", to: "33FFFF" },
		{ from: "340000", to: "37FFFF" },
		{ from: "380000", to: "3BFFFF" },
		{ from: "3C0000", to: "3FFFFF" },
		{ from: "400000", to: "43FFFF" },
		{ from: "440000", to: "447FFF" },
		{ from: "448000", to: "44FFFF" },
		{ from: "450000", to: "457FFF" },
		{ from: "458000", to: "45FFFF" },
		{ from: "460000", to: "467FFF" },
		{ from: "468000", to: "46FFFF" },
		{ from: "470000", to: "477FFF" },
		{ from: "478000", to: "47FFFF" },
		{ from: "480000", to: "487FFF" },
		{ from: "488000", to: "48FFFF" },
		{ from: "490000", to: "497FFF" },
		{ from: "498000", to: "49FFFF" },
		{ from: "4A0000", to: "4A7FFF" },
		{ from: "4A8000", to: "4AFFFF" },
		{ from: "4B0000", to: "4B7FFF" },
		{ from: "4B8000", to: "4BFFFF" },
		{ from: "4C0000", to: "4C7FFF" },
		{ from: "4C8000", to: "4C83FF" },
		{ from: "4CA000", to: "4CAFFF" },
		{ from: "4CC000", to: "4CCFFF" },
		{ from: "4D0000", to: "4D03FF" },
		{ from: "4D2000", to: "4D23FF" },
		{ from: "4D4000", to: "4D43FF" },
		{ from: "500000", to: "5004FF" },
		{ from: "501000", to: "5013FF" },
		{ from: "501C00", to: "501FFF" },
		{ from: "502C00", to: "502FFF" },
		{ from: "503C00", to: "503FFF" },
		{ from: "504C00", to: "504FFF" },
		{ from: "505C00", to: "505FFF" },
		{ from: "506C00", to: "506FFF" },
		{ from: "507C00", to: "507FFF" },
		{ from: "508000", to: "50FFFF" },
		{ from: "510000", to: "5103FF" },
		{ from: "511000", to: "5113FF" },
		{ from: "512000", to: "5123FF" },
		{ from: "513000", to: "5133FF" },
		{ from: "514000", to: "5143FF" },
		{ from: "515000", to: "5153FF" },
		{ from: "600000", to: "6003FF" },
		{ from: "600800", to: "600BFF" },
		{ from: "601000", to: "6013FF" },
		{ from: "601800", to: "601BFF" },
		{ from: "680000", to: "6803FF" },
		{ from: "681000", to: "6813FF" },
		{ from: "682000", to: "6823FF" },
		{ from: "683000", to: "6833FF" },
		{ from: "684000", to: "6843FF" },
		{ from: "700000", to: "700FFF" },
		{ from: "702000", to: "702FFF" },
		{ from: "704000", to: "704FFF" },
		{ from: "706000", to: "706FFF" },
		{ from: "708000", to: "708FFF" },
		{ from: "70A000", to: "70AFFF" },
		{ from: "70C000", to: "70C3FF" },
		{ from: "70E000", to: "70EFFF" },
		{ from: "710000", to: "717FFF" },
		{ from: "718000", to: "71FFFF" },
		{ from: "720000", to: "727FFF" },
		{ from: "728000", to: "72FFFF" },
		{ from: "730000", to: "737FFF" },
		{ from: "738000", to: "73FFFF" },
		{ from: "740000", to: "747FFF" },
		{ from: "748000", to: "74FFFF" },
		{ from: "750000", to: "757FFF" },
		{ from: "758000", to: "75FFFF" },
		{ from: "760000", to: "767FFF" },
		{ from: "768000", to: "76FFFF" },
		{ from: "770000", to: "777FFF" },
		{ from: "778000", to: "77FFFF" },
		{ from: "780000", to: "7BFFFF" },
		{ from: "7C0000", to: "7FFFFF" },
		{ from: "800000", to: "83FFFF" },
		{ from: "840000", to: "87FFFF" },
		{ from: "880000", to: "887FFF" },
		{ from: "888000", to: "88FFFF" },
		{ from: "890000", to: "890FFF" },
		{ from: "894000", to: "894FFF" },
		{ from: "895000", to: "8953FF" },
		{ from: "896000", to: "896FFF" },
		{ from: "897000", to: "8973FF" },
		{ from: "898000", to: "898FFF" },
		{ from: "899000", to: "8993FF" },
		{ from: "8A0000", to: "8A7FFF" },
		{ from: "900000", to: "9003FF" },
		{ from: "901000", to: "9013FF" },
		{ from: "902000", to: "9023FF" },
		{ from: "A00000", to: "AFFFFF" },
		{ from: "C00000", to: "C3FFFF" },
		{ from: "C80000", to: "C87FFF" },
		{ from: "C88000", to: "C88FFF" },
		{ from: "C8A000", to: "C8A3FF" },
		{ from: "C8C000", to: "C8C3FF" },
		{ from: "C8D000", to: "C8D3FF" },
		{ from: "C8E000", to: "C8E3FF" },
		{ from: "C90000", to: "C903FF" },
		{ from: "E00000", to: "E3FFFF" },
		{ from: "E40000", to: "E7FFFF" },
		{ from: "E80000", to: "E80FFF" },
		{ from: "E84000", to: "E84FFF" },
		{ from: "E88000", to: "E88FFF" },
		{ from: "E8C000", to: "E8CFFF" },
		{ from: "E90000", to: "E90FFF" },
		{ from: "E94000", to: "E94FFF" }
	];

	for (const range of validICAOs) {
		if (icao >= range.from && icao <= range.to) {
			return true;
		}
	}
	return false;
};

/**
 * Checks if a given string is valid according to the specified criteria.
 * @param options Validation options object
 * @returns true if the string is valid, false otherwise.
 */
export const getValidationStatus = (options: ValidationOptions): boolean => {
	const { raw, isHex, isNumeric, allowEmpty, hasBlurred } = options;

	// Check for empty value first
	const emptyValidation = validateEmptyValue(raw, allowEmpty, hasBlurred);
	if (emptyValidation !== null) {
		return emptyValidation;
	}

	// Handle hexadecimal validation
	if (isHex) {
		return validateHexInput(options);
	}

	// Handle non-numeric (text) validation
	if (!isNumeric) {
		return validateTextInput(options);
	}

	// Handle numeric validation
	return validateNumericInput(options);
};
