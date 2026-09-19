/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Unit tests for conversion utilities ensuring accurate conversions
 *                between units.
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
	validateICAOAddress,
	validateMID,
	validateNumericInput,
	validateTextInput
} from "./basicValidators";
import { ErrorMessageGenerator } from "./errorMessageGenerator";
import { FieldConfigUtils } from "./fieldConfigUtils";
import { HelperTextGenerator } from "./helperTextGenerator";
import { getMessage } from "./messageUtils";
import { NumericValidator } from "./numericValidator";
import { RangeValidator } from "./rangeValidator";

vi.mock("@utils/formatNumber", () => ({
	formatNumberWithCommas: (v: string | number) => String(v),
	countDecimalPlaces: (v: number) => {
		const s = String(v);
		return s.includes(".") ? s.split(".")[1].length : 0;
	}
}));

describe("basicValidators", () => {
	test("isEmpty returns true for empty string and false otherwise", () => {
		expect(isEmpty("")).toBe(true);
		expect(isEmpty("a")).toBe(false);
	});

	test("validateEmptyValue respects allowEmpty and hasBlurred", () => {
		expect(validateEmptyValue("", true, false)).toBe(true);
		expect(validateEmptyValue("", false, true)).toBe(false);
		expect(validateEmptyValue("", false, false)).toBeNull();
		expect(validateEmptyValue("x", false, false)).toBeNull();
	});

	test("validateHexRange basic behaviors", () => {
		expect(validateHexRange("", "00", "FF")).toBe(false);
		expect(validateHexRange("GG", "00", "FF")).toBe(false);
		expect(validateHexRange("A", undefined, undefined)).toBe(true);

		expect(validateHexRange("A", "01", "0F")).toBe(true);
		expect(validateHexRange("10", "20", "2F")).toBe(false);
	});

	test("validateHexInput allows custom validate and pattern", () => {
		expect(
			validateHexInput({
				raw: "ABC",
				validate: (v: string) => v === "ABC"
			} as any)
		).toBe(true);
		expect(
			validateHexInput({ raw: "ZZZ", pattern: /^[0-9A-F]+$/ } as any)
		).toBe(false);
		expect(
			validateHexInput({
				raw: "0a",
				pattern: null,
				hexMin: "00",
				hexMax: "FF"
			} as any)
		).toBe(true);
	});

	test("validateTextInput respects validate, pattern, min/max and allowEmpty", () => {
		expect(
			validateTextInput({
				raw: "abc",
				validate: (v: string) => v === "abc"
			} as any)
		).toBe(true);
		expect(validateTextInput({ raw: "abc", pattern: /^a/ } as any)).toBe(true);
		expect(validateTextInput({ raw: "abc", min: 4, max: 6 } as any)).toBe(
			false
		);
		expect(validateTextInput({ raw: "", allowEmpty: true } as any)).toBe(true);
	});

	test("createNumericPattern produces expected regex", () => {
		const p1 = createNumericPattern(2);
		expect(p1.test("123.45")).toBe(true);
		expect(p1.test("123.456")).toBe(false);
		const p2 = createNumericPattern(undefined);
		expect(p2.test("123")).toBe(true);
		expect(p2.test("123.4")).toBe(false);
	});

	test("validateNumericInput covers validate function, NaN, pattern and range", () => {
		expect(
			validateNumericInput({
				raw: "10",
				validate: (n: number) => n === 10
			} as any)
		).toBe(true);
		expect(validateNumericInput({ raw: "x" } as any)).toBe(false);

		expect(
			validateNumericInput({
				raw: "1.234",
				pattern: /.*/,
				maxDecimal: 1
			} as any)
		).toBe(false);
		expect(validateNumericInput({ raw: "5", min: 6 } as any)).toBe(false);
		expect(validateNumericInput({ raw: "10", max: 9 } as any)).toBe(false);
		expect(validateNumericInput({ raw: "3.5", maxDecimal: 1 } as any)).toBe(
			true
		);
	});

	test("validateMID and validateICAOAddress", () => {
		expect(validateMID(201)).toBe(true);
		expect(validateMID(999)).toBe(false);
		expect(validateICAOAddress("004001")).toBe(true);
		expect(validateICAOAddress("FFFFFF")).toBe(false);
	});

	test("getValidationStatus routes correctly", () => {
		expect(getValidationStatus({ raw: "", allowEmpty: true } as any)).toBe(
			true
		);

		expect(getValidationStatus({ raw: "AA", isHex: true } as any)).toBe(true);

		expect(getValidationStatus({ raw: "abc", isNumeric: false } as any)).toBe(
			true
		);

		expect(getValidationStatus({ raw: "12", isNumeric: true } as any)).toBe(
			true
		);
	});
});

describe("ErrorMessageGenerator & FieldConfigUtils & HelperTextGenerator", () => {
	test("ErrorMessageGenerator basic messages", () => {
		const fd = { type: "numeric-range", min: 1, max: 2 } as any;
		expect(ErrorMessageGenerator.generateErrorMessage(fd, "required")).toBe(
			"Value should not be empty"
		);

		expect(
			ErrorMessageGenerator.generateErrorMessage(
				{ type: "text" } as any,
				"range"
			)
		).toBe("Invalid value");
	});

	test("generateLengthErrorMessage and standard message flows", () => {
		const fdLen = { type: "character-limit", maxLength: 5 } as any;
		expect(
			(ErrorMessageGenerator as any).generateLengthErrorMessage(fdLen)
		).toContain("max");

		const fieldDef = { type: "numeric-range", min: 1, max: 3 } as any;
		expect(
			ErrorMessageGenerator.generateStandardErrorMessage(fieldDef, [], "")
		).toBe("Value should not be empty");

		expect(
			ErrorMessageGenerator.generateStandardErrorMessage(
				fieldDef,
				["Value should be 1 ... 3"],
				"x"
			)
		).toContain("Value should be");

		expect(
			ErrorMessageGenerator.generateStandardErrorMessage(fieldDef, ["foo"], "x")
		).toBe("foo");
	});

	test("FieldConfigUtils and helper text paths", () => {
		const cfgText = { name: "n", type: "text", max: 10 } as any;
		const fd = FieldConfigUtils.createFieldDefinitionFromConfig(cfgText as any);
		expect(fd.type).toBe("character-limit");

		const cfgHex = {
			name: "h",
			type: "hex",
			min: "000001",
			max: "0000FF"
		} as any;
		const fdHex = FieldConfigUtils.createFieldDefinitionFromConfig(cfgHex);
		expect((fdHex as any).type).toBe("hex");

		const helper = HelperTextGenerator.getHelperTextForFieldConfig({
			name: "r",
			type: "number",
			min: 1,
			max: 2
		} as any);
		expect(helper).toContain("1");
	});

	test("ErrorMessageGenerator range/length/pattern branches and FieldConfigUtils hex/number-zero-prefix", () => {
		expect(
			(ErrorMessageGenerator as any).generateErrorMessage(
				{ type: "character-limit", name: "x" },
				"range"
			)
		).toBe("Invalid value");

		expect(
			(ErrorMessageGenerator as any).generateErrorMessage(
				{ type: "numeric-range", name: "n" },
				"range"
			)
		).toBe("Invalid value");

		expect(
			(ErrorMessageGenerator as any).generateErrorMessage(
				{ type: "dropdown", name: "d" },
				"length"
			)
		).toBe("Value too long");

		const hexCfg = { name: "h", type: "hex", min: "a", max: "ff" } as any;
		const hexDef = FieldConfigUtils.createFieldDefinitionFromConfig(
			hexCfg as any
		);

		expect((hexDef as any).min).toBe(parseInt("a", 16));
		expect((hexDef as any).max).toBe(parseInt("ff", 16));

		const numAsHex = {
			name: "n",
			type: "number",
			min: "00aa",
			max: "00ff"
		} as any;
		const numAsHexDef =
			FieldConfigUtils.createFieldDefinitionFromConfig(numAsHex);

		expect((numAsHexDef as any).min).toBe(parseFloat("00aa"));
		expect((numAsHexDef as any).max).toBe(parseFloat("00ff"));

		const fakeValidate = vi.fn(() => ({ isValid: true }));
		const cfg = { name: "v", type: "number", min: "1", max: "2" } as any;
		const result = FieldConfigUtils.validateWithFieldConfig(
			"1.5",
			cfg,
			fakeValidate as any
		);
		expect(fakeValidate).toHaveBeenCalled();
		expect(result).toEqual({ isValid: true });
	});
});

describe("messageUtils", () => {
	test("getMessage custom error text and basic formatting", () => {
		expect(getMessage({ showError: true, errorText: "custom" } as any)).toBe(
			"custom"
		);
		expect(
			getMessage({
				showError: true,
				isHex: true,
				hexMin: "00",
				hexMax: "FF"
			} as any)
		).toBe("Value should be 00 ... FF");
		expect(getMessage({ showHelper: true, helperText: "help" } as any)).toBe(
			"help"
		);
		expect(getMessage({ showError: false, showHelper: false } as any)).toBe("");
	});

	test("numeric range formatting with different options", () => {
		const msg = getMessage({
			showError: true,
			isNumeric: true,
			min: 1000,
			max: 2000,
			unit: "m",
			comma: true
		} as any);
		expect(msg).toBe("Value should be 1000 ... 2000 m");

		const msgNoComma = getMessage({
			showError: true,
			isNumeric: true,
			min: 10,
			max: 20
		} as any);
		expect(msgNoComma).toBe("Value should be 10 ... 20");
	});
});

describe("NumericValidator", () => {
	test("ensureDecimalPrecision and formatWithThousandsSeparator and parse", () => {
		expect(NumericValidator.ensureDecimalPrecision(null as any, 2)).toBeNull();
		expect(NumericValidator.ensureDecimalPrecision("12.345", 0)).toBe("12");
		expect(NumericValidator.ensureDecimalPrecision("1.2", 3, "pad")).toBe(
			"1.200"
		);
		expect(
			NumericValidator.ensureDecimalPrecision("1.2345", 2, "truncate")
		).toBe("1.23");
		expect(NumericValidator.ensureDecimalPrecision("1.235", 2, "round")).toBe(
			"1.24"
		);

		expect(NumericValidator.formatWithThousandsSeparator("1000")).toBe("1,000");
		expect(NumericValidator.parseNumericValue("1,000")).toBe(1000);
		expect(NumericValidator.parseNumericValue("x")).toBeNull();
	});

	test("processControlledInput and validateNumericInput behaviors", () => {
		expect(
			NumericValidator.processControlledInput("12.", {
				allowPartialInput: true,
				maxDecimalDigits: 2
			} as any)
		).toBe("12.");

		expect(
			NumericValidator.processControlledInput("12.", {
				allowPartialInput: false,
				maxDecimalDigits: 2
			} as any)
		).toBeNull();

		const res = NumericValidator.validateNumericInput("1.234", {
			maxDecimalDigits: 1
		} as any);
		expect(res.isValid).toBe(false);
		expect(res.appliedRules).toContain("decimal-precision");

		const r2 = NumericValidator.validateNumericInput("2", { min: 3 } as any);
		expect(r2.isValid).toBe(false);
		const r3 = NumericValidator.validateNumericInput("10", { max: 5 } as any);
		expect(r3.isValid).toBe(false);
	});

	test("validateNumericInput decimal-precision vs numeric-format branches and thousands-format", () => {
		const dec = NumericValidator.validateNumericInput("1.234", {
			maxDecimalDigits: 1
		} as any);
		expect(dec.isValid).toBe(false);
		expect(dec.appliedRules).toContain("decimal-precision");

		const nf = NumericValidator.validateNumericInput("abc", {} as any);
		expect(nf.isValid).toBe(false);
		expect(nf.appliedRules).toContain("numeric-format");

		const th = NumericValidator.validateNumericInput("1000", {
			formatThousands: true
		} as any);
		expect(th.isValid).toBe(true);
		expect(th.appliedRules).toContain("thousands-format");
		expect(th.formattedValue).toBe("1,000");
	});

	test("processControlledInput liveFormatting path", () => {
		const out = NumericValidator.processControlledInput("1000", {
			liveFormatting: true,
			formatThousands: true,
			allowPartialInput: false,
			maxDecimalDigits: 0
		} as any);
		expect(out).toBe("1,000");
	});

	test("validateFieldConstraints pattern and custom validator behaviors", () => {
		const p = NumericValidator.validateFieldConstraints("abc", {
			pattern: /^\d+$/
		} as any);
		expect(p.isValid).toBe(false);
		const c1 = NumericValidator.validateFieldConstraints("5", {
			customValidator: (v: string) => v === "6"
		} as any);
		expect(c1.isValid).toBe(false);
		const c2 = NumericValidator.validateFieldConstraints("5", {
			customValidator: (v: string) => "bad"
		} as any);
		expect(c2.isValid).toBe(false);
		const req = NumericValidator.validateFieldConstraints("", {
			required: true
		} as any);
		expect(req.isValid).toBe(false);
	});

	test("validateFieldConstraints covers patterns, customValidator and numeric parsing", () => {
		const resReq = NumericValidator.validateFieldConstraints("", {
			required: true
		} as any);
		expect(resReq.isValid).toBe(false);

		const resPattern = NumericValidator.validateFieldConstraints("abc", {
			pattern: /^\d+$/
		} as any);
		expect(resPattern.isValid).toBe(false);

		const resCustom = NumericValidator.validateFieldConstraints("5", {
			customValidator: (v: string) => v === "6"
		} as any);
		expect(resCustom.isValid).toBe(false);

		const resNumeric = NumericValidator.validateFieldConstraints("10", {
			min: 5,
			max: 15
		} as any);
		expect(resNumeric.isValid).toBe(true);
	});

	test("getValidationPattern produces correct regex", () => {
		const p = NumericValidator.getValidationPattern({
			allowDecimals: true,
			maxDecimalDigits: 2,
			allowNegative: true,
			allowPartial: true
		});
		expect(p.test("-12.3")).toBe(true);
	});
});

describe("RangeValidator", () => {
	test("requireBothValues enforcement and early pass", () => {
		const r1 = RangeValidator.validateRange(null, "5", {
			requireBothValues: true
		} as any);
		expect(r1.isValid).toBe(false);
		const r2 = RangeValidator.validateRange(null, null, {} as any);
		expect(r2.isValid).toBe(true);
	});

	test("invalid numeric values and comparator behavior", () => {
		const r3 = RangeValidator.validateRange("x", "y", {} as any);
		expect(r3.isValid).toBe(false);

		const r4 = RangeValidator.validateRange("5", "4", {
			allowEqual: false
		} as any);
		expect(r4.isValid).toBe(false);

		const r5 = RangeValidator.validateRange("5", "6", {
			customComparator: (f: number, t: number) => t > f
		} as any);
		expect(r5.isValid).toBe(true);
	});
});

describe("additional inputValidation edge cases", () => {
	test("ErrorMessageGenerator formatMinMaxValues with decimalPlaces and formatThousands", () => {
		const fd = {
			type: "numeric-range",
			min: 1,
			max: 2,
			decimalPlaces: 2,
			unit: "m",
			formatThousands: true
		} as any;
		expect((ErrorMessageGenerator as any).generateRangeErrorMessage(fd)).toBe(
			"Value should be 1.00 ... 2.00 m"
		);
	});

	test("ErrorMessageGenerator.getErrorMessageForFieldConfig numeric range", () => {
		const cfg = {
			name: "r",
			type: "number",
			min: "1",
			max: "3",
			precision: 0,
			unit: "km",
			comma: false
		} as any;
		const msg = ErrorMessageGenerator.getErrorMessageForFieldConfig(
			cfg,
			"range"
		);
		expect(msg).toContain("Value should be");
	});

	test("HelperTextGenerator numeric/hex/character branches", () => {
		const nr = {
			type: "numeric-range",
			min: 10,
			max: 20,
			decimalPlaces: 0,
			formatThousands: false
		} as any;
		expect(
			(HelperTextGenerator as any).generateNumericRangeHelperText(nr)
		).toBe("10 ... 20");

		const hexDef = {
			type: "hex",
			name: "h",
			hexMin: "01",
			hexMax: "FF"
		} as any;
		expect(
			(HelperTextGenerator as any).generateHexRangeHelperText(hexDef)
		).toBe("01 ... FF");

		const charDef = {
			type: "character-limit",
			maxLength: 4,
			characterType: "chars"
		} as any;
		expect(
			(HelperTextGenerator as any).generateCharacterLimitHelperText(charDef)
		).toBe("4-chars max");
	});

	test("messageUtils non-numeric max length branch", () => {
		expect(
			getMessage({ showError: true, isNumeric: false, max: 5 } as any)
		).toBe("Value should be 5-characters max");
	});

	test("NumericValidator edge behaviors: empty input rounding, formatWithThousands negative and parse", () => {
		expect(NumericValidator.ensureDecimalPrecision("", 2)).toBe("");
		expect(NumericValidator.ensureDecimalPrecision("1.6", 0)).toBe("2");

		expect(NumericValidator.formatWithThousandsSeparator("-1234.5")).toBe(
			"-1,234.5"
		);
		expect(NumericValidator.parseNumericValue(null)).toBeNull();
		expect(NumericValidator.parseNumericValue("1,234.56")).toBe(1234.56);
	});

	test("ErrorMessageGenerator additional private helpers and standard message pattern/fallback", () => {
		const fm = (ErrorMessageGenerator as any).formatMinMaxValues(
			1.5,
			2.25,
			undefined
		);
		expect(fm.minStr).toBe("1.5");
		expect(fm.maxStr).toBe("2.3");

		const fd = { type: "character-limit", maxLength: 3 } as any;
		const msgPattern = ErrorMessageGenerator.generateStandardErrorMessage(
			fd,
			["pattern mismatch"],
			"x"
		);
		expect(msgPattern).toBe("Invalid format");

		const fallback = ErrorMessageGenerator.generateStandardErrorMessage(
			fd,
			[],
			"x"
		);
		expect(fallback).toBe("Invalid value");
	});

	test("HelperTextGenerator isHex false branch and numeric-range missing min/max", () => {
		const notHex = { type: "hex", name: "h" } as any;
		expect(
			(HelperTextGenerator as any).generateHexRangeHelperText(notHex)
		).toBe("");

		const nrEmpty = { type: "numeric-range" } as any;
		expect(
			(HelperTextGenerator as any).generateNumericRangeHelperText(nrEmpty)
		).toBe("");
	});

	test("FieldConfigUtils hex string padding and number-as-hex detection", () => {
		const cfgHex = { name: "hx", type: "hex", min: "a", max: "ff" } as any;
		const defHex = FieldConfigUtils.createFieldDefinitionFromConfig(cfgHex);

		if ((defHex as any).hexMin !== undefined) {
			expect((defHex as any).hexMin).toBe(
				String("a").toUpperCase().padStart(6, "0")
			);
			expect((defHex as any).hexMax).toBe(
				String("ff").toUpperCase().padStart(6, "0")
			);
		} else {
			expect((defHex as any).min).toBe(parseInt("a", 16));
			expect((defHex as any).max).toBe(parseInt("ff", 16));
		}

		const numZero = {
			name: "nz",
			type: "number",
			min: "00aa",
			max: "00ff"
		} as any;
		const defNumZero =
			FieldConfigUtils.createFieldDefinitionFromConfig(numZero);

		if ((defNumZero as any).hexMin !== undefined) {
			expect((defNumZero as any).type).toBe("hex");
			expect((defNumZero as any).hexMin).toBe("00aa");
			expect((defNumZero as any).hexMax).toBe("00ff");
		} else {
			expect((defNumZero as any).min).toBe(parseFloat("00aa"));
		}
	});

	test("messageUtils getMessage returns empty when showError true but no error message computed", () => {
		expect(getMessage({ showError: true, showHelper: false } as any)).toBe("");
	});

	test("NumericValidator errorMessages replacement for decimal/min/max", () => {
		const dec = NumericValidator.validateNumericInput("1.234", {
			maxDecimalDigits: 1,
			errorMessages: { decimal: "Too many decimals {maxDecimal}" }
		} as any);
		expect(dec.errors.some((e) => e.includes("Too many decimals"))).toBe(true);

		const minErr = NumericValidator.validateNumericInput("2", {
			min: 3,
			errorMessages: { min: "Min is {min}" }
		} as any);
		expect(minErr.errors.some((e) => e.includes("Min is"))).toBe(true);
	});

	test("ErrorMessageGenerator pattern and generateHelperText defaults", () => {
		const fd = { type: "text", name: "t" } as any;
		expect(ErrorMessageGenerator.generateErrorMessage(fd, "pattern")).toBe(
			"Invalid format"
		);

		expect(
			HelperTextGenerator.getHelperTextForFieldConfig({
				name: "d",
				type: "dropdown"
			} as any)
		).toBe("");
		expect(
			HelperTextGenerator.getHelperTextForFieldConfig({
				name: "dt",
				type: "datetime"
			} as any)
		).toBe("");
	});

	test("FieldConfigUtils dropdown and datetime createFieldDefinitionFromConfig", () => {
		const d = FieldConfigUtils.createFieldDefinitionFromConfig({
			name: "dd",
			type: "dropdown"
		} as any);
		expect(d.type).toBe("dropdown");
		const dt = FieldConfigUtils.createFieldDefinitionFromConfig({
			name: "dt",
			type: "datetime"
		} as any);
		expect(dt.type).toBe("datetime");
	});

	test("NumericValidator numericPattern with zero decimals and thousands grouping", () => {
		const r = NumericValidator.validateNumericInput("12.3", {
			maxDecimalDigits: 0
		} as any);
		expect(r.isValid).toBe(false);

		expect(NumericValidator.formatWithThousandsSeparator("1234567")).toBe(
			"1,234,567"
		);
	});
});
