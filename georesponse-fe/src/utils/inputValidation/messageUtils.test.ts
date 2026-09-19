import {
	countDecimalPlaces as realCountDecimalPlaces,
	formatNumberWithCommas as realFormatNumberWithCommas
} from "@utils/formatNumber";

import { getMessage, MessageOptions } from "./messageUtils";

vi.mock("@utils/formatNumber", () => ({
	countDecimalPlaces: vi.fn(() => 2),
	formatNumberWithCommas: vi.fn((n: number) => `,${n},`)
}));

const countDecimalPlaces = vi.mocked(realCountDecimalPlaces);
const formatNumberWithCommas = vi.mocked(realFormatNumberWithCommas);

describe("messageUtils - getMessage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns custom error text when provided", () => {
		const options: MessageOptions = {
			showError: true,
			showHelper: false,
			errorText: "Custom error message"
		};
		const msg = getMessage(options);
		expect(msg).toBe("Custom error message");
	});

	it("returns hex range message when isHex and hexMin/hexMax provided", () => {
		const options: MessageOptions = {
			showError: true,
			showHelper: false,
			isHex: true,
			hexMin: "00AA",
			hexMax: "00FF"
		};
		const msg = getMessage(options);
		expect(msg).toBe("Value should be 00AA ... 00FF");
	});

	it("returns character limit message for non-numeric with max", () => {
		const options: MessageOptions = {
			showError: true,
			showHelper: false,
			isNumeric: false,
			max: 5
		};
		const msg = getMessage(options);
		expect(msg).toBe("Value should be 5-characters max");
	});

	it("formats numeric range with commas when comma=true", () => {
		const options: MessageOptions = {
			showError: true,
			showHelper: false,
			isNumeric: true,
			min: 10,
			max: 20,
			comma: true
		};
		const msg = getMessage(options);
		expect(msg).toContain("Value should be");
		// our mocked formatter returns strings containing commas
		expect(msg).toContain(",10,");
		expect(msg).toContain(",20,");
	});

	it("formats numeric range without commas when comma=false", () => {
		const options: MessageOptions = {
			showError: true,
			showHelper: false,
			isNumeric: true,
			min: 10,
			max: 20,
			comma: false
		};
		const msg = getMessage(options);
		expect(msg).toBe("Value should be 10 ... 20");
	});

	it("includes unit in numeric range message when provided", () => {
		const options: MessageOptions = {
			showError: true,
			showHelper: false,
			isNumeric: true,
			min: 0,
			max: 100,
			unit: "km/h"
		};
		const msg = getMessage(options);
		expect(msg).toBe("Value should be 0 ... 100 km/h");
	});

	it("returns helper text when showHelper is true", () => {
		const options: MessageOptions = {
			showError: false,
			showHelper: true,
			helperText: "This is helper text"
		};
		const msg = getMessage(options);
		expect(msg).toBe("This is helper text");
	});

	it("returns empty string when showHelper is true but no helperText provided", () => {
		const options: MessageOptions = {
			showError: false,
			showHelper: true
		};
		const msg = getMessage(options);
		expect(msg).toBe("");
	});

	it("returns empty string when showError is true but no error conditions met", () => {
		const options: MessageOptions = {
			showError: true,
			showHelper: false,
			isNumeric: true,
			min: 10
			// No max provided, so no error message generated
		};
		const msg = getMessage(options);
		expect(msg).toBe("");
	});

	it("returns empty string when neither showError nor showHelper is true", () => {
		const options: MessageOptions = {
			showError: false,
			showHelper: false,
			errorText: "Some error",
			helperText: "Some helper"
		};
		const msg = getMessage(options);
		expect(msg).toBe("");
	});

	it("prioritizes errorText over other error conditions", () => {
		const options: MessageOptions = {
			showError: true,
			showHelper: false,
			errorText: "Priority error",
			isHex: true,
			hexMin: "00AA",
			hexMax: "00FF"
		};
		const msg = getMessage(options);
		expect(msg).toBe("Priority error");
	});

	it("handles numeric range with decimal formatting", () => {
		formatNumberWithCommas.mockImplementation((n: string | number, decimals?: number) =>
			Number(n).toFixed(decimals ?? 0)
		);
		countDecimalPlaces.mockReturnValue(2);

		const options: MessageOptions = {
			showError: true,
			showHelper: false,
			isNumeric: true,
			min: 10.5,
			max: 20.75,
			comma: true
		};
		const msg = getMessage(options);
		expect(msg).toBe("Value should be 10.50 ... 20.75");
		expect(formatNumberWithCommas).toHaveBeenCalledWith(10.5, 2);
		expect(formatNumberWithCommas).toHaveBeenCalledWith(20.75, 2);
	});
});
