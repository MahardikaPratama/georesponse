/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Unit tests for utility functions ensuring correct behavior.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import colors from "./colors";
import { cn } from "./cn";
import {
	cleanNumericInput,
	countDecimalPlaces,
	formatNum,
	formatNumber,
	formatNumberWithCommas,
	unformatNumber
} from "./formatNumber";
import { InputValidationUtils } from "./inputValidation";
import { withTimeout } from "./withTimeOut";

vi.mock("clsx", () => ({
	__esModule: true,
	clsx: (...args: any[]) => args.flat().filter(Boolean).join(" "),
	default: (...args: any[]) => args.flat().filter(Boolean).join(" ")
}));
vi.mock("tailwind-merge", () => ({
	__esModule: true,
	twMerge: (s: string) => s,
	default: (s: string) => s
}));

vi.mock("./logger/logger", () => ({
	logger: {
		log: vi.fn(),
		error: vi.fn(),
		warn: vi.fn()
	}
}));

describe("cn util", () => {
	test("merges class names", () => {
		const out = cn("a", "b", undefined, "d");
		expect(out.split(/\s+/).filter(Boolean).join(" ")).toBe("a b d");
	});
});

describe("colors module", () => {
	test("exports a palette object", () => {
		expect(colors).toBeDefined();
		expect(colors.neutral["1"]).toBe("#FFFFFF");
		expect(colors.btn.primary).toBe("#4F9669");
	});
});

describe("formatNumber utils", () => {
	test("formatNum and formatNumberWithCommas and countDecimalPlaces", () => {
		expect(formatNum(1.2345, 2)).toBe("1.23");
		expect(formatNum("abc" as any, 2)).toBe("");
		expect(formatNumberWithCommas(1234.5, 1)).toMatch(/1.?234(\D)?5/);
		expect(formatNumberWithCommas("x" as any, 1)).toBe("-");
		expect(countDecimalPlaces(1.234)).toBeGreaterThanOrEqual(1);
	});

	test("formatNumber, unformatNumber and cleanNumericInput edge cases", () => {
		// formatNumber: undefined/null/empty handled earlier; cover intPart with commas and decimals
		expect(formatNumber(1234)).toBe("1,234");
		expect(formatNumber("1,234.50")).toBe("1,234.50");
		expect(formatNumber("notanumber")).toBe("notanumber");

		// unformatNumber removes commas
		expect(unformatNumber("1,234,567")).toBe("1234567");

		// cleanNumericInput: strip letters, handle negative, enforce decimal precision
		expect(cleanNumericInput("-1,234.567abc", 2)).toBe("-1234.56");
		expect(cleanNumericInput("123abc", 0)).toBe("123");

		// branch: no decimal part and maxDecimal !== 0 -> returns sanitized int
		expect(cleanNumericInput("1,234", 2)).toBe("1234");
	});
	test("countDecimalPlaces for integer and string inputs", () => {
		expect(countDecimalPlaces(100)).toBe(0);

		expect(countDecimalPlaces("100.500")).toBe(1);
	});
});

describe("withTimeout utility", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	test("resolves and enforces minimum timeout delay", async () => {
		const start = Date.now();
		vi.setSystemTime(start);

		const p = new Promise<string>((resolve) =>
			setTimeout(() => resolve("ok"), 10)
		);
		const wrapped = withTimeout(p, 50);

		vi.advanceTimersByTime(10);
		await Promise.resolve();

		vi.advanceTimersByTime(40);
		await Promise.resolve();

		await expect(wrapped).resolves.toBe("ok");
	});

	test("rejects with Timeout when underlying promise does not settle", async () => {
		const p = new Promise<string>(() => {
			/* never settles */
		});
		const wrapped = withTimeout(p, 20);
		vi.advanceTimersByTime(20);
		await expect(wrapped).rejects.toThrow("Timeout");
	});

	test("underlying promise rejects quickly and the wrapper rejects (error or timeout)", async () => {
		const start = Date.now();
		vi.setSystemTime(start);

		const p = new Promise((_res, rej) =>
			setTimeout(() => rej(new Error("boom")), 5)
		);
		const wrapped = withTimeout(p, 50);

		vi.advanceTimersByTime(5);
		await Promise.resolve();

		vi.advanceTimersByTime(45);
		await expect(wrapped).rejects.toBeInstanceOf(Error);
	});
});


describe("InputValidationUtils top-level wrapper", () => {
	test("validateInput empty & non-empty branches and helpers", () => {
		const fd = { type: "numeric-range", name: "r", min: 1, max: 2 } as any;
		const resEmpty = InputValidationUtils.validateInput("", {
			allowEmpty: false,
			fieldDefinition: fd
		});
		expect(resEmpty.isValid).toBe(false);
		expect(resEmpty.errorMessage).toBeDefined();

		const resProc = InputValidationUtils.validateInput("  abc  ", {
			customPattern: /^\d+$/,
			fieldDefinition: fd
		});
		expect(resProc.isValid).toBe(false);

		const resNum = InputValidationUtils.validateInput("5", { min: 10 });
		expect(resNum.isValid).toBe(false);

		expect(
			InputValidationUtils.validateNumericInput("1.2", { maxDecimalDigits: 1 })
				.isValid
		).toBe(true);
		expect(
			InputValidationUtils.ensureDecimalPrecision("1.23", 1)
		).toBeDefined();
		expect(InputValidationUtils.validateRange("1", "2").isValid).toBe(true);
		expect(InputValidationUtils.processControlledInput("12", {})).toBe("12");
		expect(InputValidationUtils.formatWithThousandsSeparator("1000")).toBe(
			"1,000"
		);
		expect(InputValidationUtils.parseNumericValue("1,234")).toBe(1234);
		expect(
			InputValidationUtils.validateFieldConstraints("5", { min: 1 })
		).toHaveProperty("isValid");
		expect(
			InputValidationUtils.getValidationPattern({ allowDecimals: true })
		).toBeInstanceOf(RegExp);
		expect(
			InputValidationUtils.generateHelperText({
				type: "numeric-range",
				name: "r",
				min: 1,
				max: 2
			} as any)
		).toBeDefined();
		expect(
			InputValidationUtils.generateErrorMessage(
				{ type: "numeric-range", name: "r", min: 1, max: 2 } as any,
				"range"
			)
		).toBeDefined();
		expect(
			InputValidationUtils.generateStandardErrorMessage(
				{ type: "character-limit", name: "t", maxLength: 3 } as any,
				["pattern"],
				"x"
			)
		).toBeDefined();
		expect(
			InputValidationUtils.createFieldDefinitionFromConfig({
				name: "n",
				type: "text",
				max: 3
			} as any)
		).toBeDefined();
		expect(
			InputValidationUtils.validateWithFieldConfig("1", {
				name: "n",
				type: "number",
				min: "0",
				max: "10"
			} as any)
		).toHaveProperty("isValid");
		expect(
			InputValidationUtils.getHelperTextForFieldConfig({
				name: "n",
				type: "text",
				max: 3
			} as any)
		).toBeDefined();
		expect(
			InputValidationUtils.getErrorMessageForFieldConfig(
				{ name: "n", type: "text", max: 3 } as any,
				"pattern"
			)
		).toBeDefined();

		expect(InputValidationUtils.isEmpty("")).toBe(true);
		expect(InputValidationUtils.validateEmptyValue("", true)).toBe(true);
		expect(InputValidationUtils.validateHexInput({ raw: "A" } as any)).toBe(
			true
		);
		expect(InputValidationUtils.validateTextInput({ raw: "a" } as any)).toBe(
			true
		);
		expect(InputValidationUtils.createNumericPattern(2)).toBeInstanceOf(RegExp);
		expect(
			InputValidationUtils.getValidationStatus({
				raw: "1",
				isNumeric: true
			} as any)
		).toBe(true);
	});
});

describe("withTimeout edge branches", () => {
	test("zero timeout with immediate resolve goes through remaining <= 0 branch", async () => {
		const p = Promise.resolve("fast");
		await expect(withTimeout(p, 0)).resolves.toBe("fast");
	});

	test("zero timeout with immediate reject gets normalized and rejected", async () => {
		const p = Promise.reject(new Error("now"));

		p.catch(() => {});
		await expect(withTimeout(p, 0)).rejects.toBeInstanceOf(Error);
	});
});
