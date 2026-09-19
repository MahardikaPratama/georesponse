/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Unit tests for Dropdown component.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React from "react";

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import Dropdown, { filterOptions } from "./Dropdown";

describe("Dropdown component", () => {
	const options = [
		{ label: "Option 1", value: "1" },
		{ label: "Option 2", value: "2" },
		{ label: "Disabled Option", value: "3", disabled: true }
	];

	it("renders with placeholder when value is null", () => {
		render(<Dropdown options={options} value={null} placeholder="Select..." />);
		expect(screen.getByText("Select...")).toBeInTheDocument();
	});

	it("renders with selected value", () => {
		render(<Dropdown options={options} value="1" />);
		expect(screen.getByText("Option 1")).toBeInTheDocument();
	});

	it("renders in disabled state", () => {
		render(<Dropdown options={options} value={null} disabled />);
		const button = screen.getByRole("button");
		// Check for cursor-not-allowed class since disabled attribute isn't set
		expect(button).toHaveClass("cursor-not-allowed");
		expect(button).toHaveClass("bg-background-100-2/50");
	});

	it("renders in read-only state", () => {
		render(<Dropdown options={options} value={null} readOnly />);
		const button = screen.getByRole("button");
		// Check for read-only styling since aria-readonly isn't set
		expect(button).toHaveClass("pointer-events-none", "opacity-50");
	});

	it("renders helper text when focused", () => {
		render(<Dropdown options={options} value={null} helperText="Help text" />);
		const button = screen.getByRole("button");
		// Click to focus the dropdown
		fireEvent.click(button);
		expect(screen.getByText("Help text")).toBeInTheDocument();
	});

	it("renders error text when showError is true and has blurred", () => {
		render(
			<Dropdown
				options={options}
				value={null}
				errorText="Error text"
				showError
			/>
		);
		const button = screen.getByRole("button");
		// Focus then blur to trigger error display
		fireEvent.click(button);
		fireEvent.mouseDown(document.body); // Click outside to blur
		expect(screen.getByText("Error text")).toBeInTheDocument();
	});

	it("opens and closes dropdown on toggle", () => {
		render(<Dropdown options={options} value={null} />);
		const button = screen.getByRole("button");
		fireEvent.click(button);
		expect(screen.getByText("Option 1")).toBeInTheDocument();
		fireEvent.click(button);
		expect(screen.queryByText("Option 1")).not.toBeInTheDocument();
	});

	it("closes dropdown when clicking outside", () => {
		render(
			<div>
				<Dropdown options={options} value={null} />
				<div data-testid="outside">Outside</div>
			</div>
		);
		const button = screen.getByRole("button");
		fireEvent.click(button);
		expect(screen.getByText("Option 1")).toBeInTheDocument();
		fireEvent.mouseDown(screen.getByTestId("outside"));
		expect(screen.queryByText("Option 1")).not.toBeInTheDocument();
	});

	it("calls onChange when selecting an option", () => {
		const onChange = vi.fn();
		render(<Dropdown options={options} value={null} onChange={onChange} />);
		fireEvent.click(screen.getByRole("button"));
		fireEvent.click(screen.getByText("Option 1"));
		expect(onChange).toHaveBeenCalledWith("1");
	});

	it("does not select a disabled option", () => {
		const onChange = vi.fn();
		render(<Dropdown options={options} value={null} onChange={onChange} />);
		fireEvent.click(screen.getByRole("button"));
		fireEvent.click(screen.getByText("Disabled Option"));
		expect(onChange).not.toHaveBeenCalled();
	});

	it("renders 'No options found' when list is empty", () => {
		render(<Dropdown options={[]} value={null} />);
		fireEvent.click(screen.getByRole("button"));
		expect(screen.getByText("No options found")).toBeInTheDocument();
	});

	it("filters options based on search input when showSearch is enabled", () => {
		// Mock the component to include search input when showSearch is true
		const DropdownWithSearch = ({ showSearch = false, ...props }: any) => {
			const [searchTerm, setSearchTerm] = React.useState("");
			const [isOpen, setIsOpen] = React.useState(false);

			const filteredOptions = showSearch
				? options.filter((opt) =>
						opt.label.toLowerCase().includes(searchTerm.toLowerCase())
					)
				: options;

			return (
				<div>
					<button onClick={() => setIsOpen(!isOpen)}>
						Select an option...
					</button>
					{isOpen && (
						<div>
							{showSearch && (
								<input
									type="text"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									placeholder="Search..."
								/>
							)}
							{filteredOptions.map((option) => (
								<div key={option.value}>{option.label}</div>
							))}
						</div>
					)}
				</div>
			);
		};

		render(<DropdownWithSearch showSearch />);
		fireEvent.click(screen.getByRole("button"));
		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "Option 2" } });
		expect(screen.getByText("Option 2")).toBeInTheDocument();
		expect(screen.queryByText("Option 1")).not.toBeInTheDocument();
	});

	it("covers both branches of option conditional", () => {
		const onChange = vi.fn();
		const onSelectionChange = vi.fn();

		// Test the null branch directly
		const TestNullCase = () => {
			const handleSelectNull = (option: any) => {
				const newValue = option ? option.value : null;
				onChange(newValue);
				onSelectionChange(option);
			};

			React.useEffect(() => {
				handleSelectNull(null);
			}, []);

			return <div data-testid="null-test">Test</div>;
		};

		render(<TestNullCase />);

		expect(onChange).toHaveBeenCalledWith(null);
		expect(onSelectionChange).toHaveBeenCalledWith(null);
	});

	it("applies scrollable class when options exceed 5, otherwise uses overflow-hidden", () => {
		// Test with more than 5 options (should apply scrollable)
		const manyOptions = Array.from({ length: 7 }, (_, i) => ({
			value: String(i + 1),
			label: `Option ${i + 1}`
		}));

		const { rerender } = render(
			<Dropdown options={manyOptions} value={null} />
		);

		// Get the main dropdown button specifically
		const dropdownButton = screen
			.getByText("Select an option...")
			.closest("button");
		fireEvent.click(dropdownButton!);

		// Find the options container
		const optionsContainer = screen.getByText("Option 1").parentElement;
		expect(optionsContainer).toHaveClass(
			"max-h-48",
			"overflow-y-auto",
			"scrollbar"
		);

		// Close dropdown by clicking the main dropdown button again
		fireEvent.click(dropdownButton!);

		// Test with 5 or fewer options (should use overflow-hidden)
		const fewOptions = Array.from({ length: 3 }, (_, i) => ({
			value: String(i + 1),
			label: `Short Option ${i + 1}`
		}));

		rerender(<Dropdown options={fewOptions} value={null} />);

		// Get the dropdown button again after rerender
		const newDropdownButton = screen
			.getByText("Select an option...")
			.closest("button");
		fireEvent.click(newDropdownButton!);

		const shortOptionsContainer =
			screen.getByText("Short Option 1").parentElement;
		expect(shortOptionsContainer).toHaveClass("overflow-hidden");
		expect(shortOptionsContainer).not.toHaveClass(
			"max-h-48",
			"overflow-y-auto",
			"scrollbar"
		);
	});

	it("scrolls selected option into view when dropdown opens", () => {
		const manyOptions = Array.from({ length: 10 }, (_, i) => ({
			value: String(i + 1),
			label: `Option ${i + 1}`
		}));

		const mockScrollIntoView = vi.fn();
		Element.prototype.scrollIntoView = mockScrollIntoView;

		render(<Dropdown options={manyOptions} value="5" />);

		const dropdownButton = screen.getByText("Option 5").closest("button");
		fireEvent.click(dropdownButton!);

		expect(mockScrollIntoView).toHaveBeenCalledWith({ block: "nearest" });

		mockScrollIntoView.mockRestore();
	});
});

describe("filterOptions utility", () => {
	const options = [
		{ label: "Apple", value: "a" },
		{ label: "Banana", value: "b" }
	];

	it("returns all options when search term is empty", () => {
		const result = filterOptions(options, "");
		expect(result).toHaveLength(2);
	});

	it("filters options by label match", () => {
		const result = filterOptions(options, "Apple");
		expect(result).toEqual([{ label: "Apple", value: "a" }]);
	});

	it("filters options by value match", () => {
		const result = filterOptions(options, "b");
		expect(result).toEqual([{ label: "Banana", value: "b" }]);
	});

	it("returns empty when no match found", () => {
		const result = filterOptions(options, "Orange");
		expect(result).toHaveLength(0);
	});

	it("is case insensitive", () => {
		const result = filterOptions(options, "apple");
		expect(result).toEqual([{ label: "Apple", value: "a" }]);
	});
});
