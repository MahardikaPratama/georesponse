import { HelperTextGenerator } from "./helperTextGenerator";

vi.mock("@utils/formatNumber", () => ({
	formatNumberWithCommas: vi.fn((s: string) => `,${s},`)
}));

describe("HelperTextGenerator", () => {
	it("generates numeric range helper text with decimals and unit", () => {
		const def = {
			type: "numeric-range",
			min: 1,
			max: 2,
			unit: "m",
			decimalPlaces: 1
		} as any;
		const txt = HelperTextGenerator.generateHelperText(def);
		expect(txt).toBe("1.0 ... 2.0 m");
	});

	it("returns empty string for dropdown and datetime types", () => {
		expect(
			HelperTextGenerator.generateHelperText({ type: "dropdown" } as any)
		).toBe("");
		expect(
			HelperTextGenerator.generateHelperText({ type: "datetime" } as any)
		).toBe("");
	});

	it("generates hex helper text when hexMin/hexMax present", () => {
		const def = { type: "hex", hexMin: "AA", hexMax: "FF" } as any;
		expect(HelperTextGenerator.generateHelperText(def)).toBe("AA ... FF");
	});

	it("generates character limit helper text", () => {
		const def = {
			type: "character-limit",
			maxLength: 10,
			characterType: "letters"
		} as any;
		expect(HelperTextGenerator.generateHelperText(def)).toBe("10-letters max");
	});

	it("createFieldDefinitionFromConfig returns hex when min/max start with 0", () => {
		const cfg = { type: "number", name: "n", min: "00AA", max: "00FF" } as any;
		const fd = (HelperTextGenerator as any).createFieldDefinitionFromConfig(
			cfg
		);
		expect(fd.type).toBe("hex");
		expect(fd.hexMin).toBe("00AA");
	});
});
