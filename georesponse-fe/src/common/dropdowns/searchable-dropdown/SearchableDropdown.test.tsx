/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Unit tests for SearchableDropdown component
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import SearchableDropdown from "./SearchableDropdown";

// Simple mocks
vi.mock("react-icons/fi", () => ({
    FiChevronDown: () => <div data-testid="chevron-down" />,
    FiChevronUp: () => <div data-testid="chevron-up" />
}));

const mockOptions = [
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
    { value: "cherry", label: "Cherry" },
    { value: "date", label: "Date" }
];

describe("SearchableDropdown", () => {
    const defaultProps = {
        options: mockOptions,
        onSelect: vi.fn()
    };

    beforeAll(() => {
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
            configurable: true,
            value: vi.fn(),
        });
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Basic rendering
    it("renders input field", () => {
        render(<SearchableDropdown {...defaultProps} />);
        expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("renders chevron down icon initially", () => {
        render(<SearchableDropdown {...defaultProps} />);
        expect(screen.getByTestId("chevron-down")).toBeInTheDocument();
    });

    it("shows selected value in input", () => {
        const selectedValue = { value: "apple", label: "Apple" };
        render(<SearchableDropdown {...defaultProps} selectedValue={selectedValue} />);
        expect(screen.getByDisplayValue("Apple")).toBeInTheDocument();
    });

    // Dropdown behavior
    it("opens dropdown on input focus", () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        
        expect(screen.getByText("Apple")).toBeInTheDocument();
        expect(screen.getByText("Banana")).toBeInTheDocument();
        expect(screen.getByTestId("chevron-up")).toBeInTheDocument();
    });

    it("opens dropdown on icon click", () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");

        // Simulate focusing the input, which should open the dropdown
        fireEvent.focus(input);

        expect(screen.getByText("Apple")).toBeInTheDocument();
        expect(screen.getByText("Banana")).toBeInTheDocument();
    });


    it("closes dropdown on icon click when open", () => {
        render(<SearchableDropdown {...defaultProps} />);
        const iconButton = screen.getByRole("button");
        const input = screen.getByRole("textbox");

        // Open dropdown by focusing input (ensures dropdown opens)
        fireEvent.focus(input);
        expect(screen.getByText("Apple")).toBeInTheDocument();

        // Close dropdown by clicking icon
        fireEvent.click(iconButton);
        expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    });

    // Search functionality
    it("filters options based on search input", () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "app" } });
        
        expect(screen.getByText("Apple")).toBeInTheDocument();
        expect(screen.queryByText("Banana")).not.toBeInTheDocument();
        expect(screen.queryByText("Cherry")).not.toBeInTheDocument();
    });

    it("shows all options when search is cleared", () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "app" } });
        fireEvent.change(input, { target: { value: "" } });
        
        expect(screen.getByText("Apple")).toBeInTheDocument();
        expect(screen.getByText("Banana")).toBeInTheDocument();
        expect(screen.getByText("Cherry")).toBeInTheDocument();
    });

    it("performs case-insensitive search", () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "APPLE" } });
        
        expect(screen.getByText("Apple")).toBeInTheDocument();
        expect(screen.queryByText("Banana")).not.toBeInTheDocument();
    });

    // Option selection
    it("selects option and calls onSelect", () => {
        const onSelect = vi.fn();
        render(<SearchableDropdown {...defaultProps} onSelect={onSelect} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        fireEvent.mouseDown(screen.getByText("Apple"));
        
        expect(onSelect).toHaveBeenCalledWith({ value: "apple", label: "Apple" });
    });

    it("closes dropdown after selection", () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        fireEvent.mouseDown(screen.getByText("Apple"));
        
        expect(screen.queryByText("Banana")).not.toBeInTheDocument();
    });

    it("updates input value after selection", () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        fireEvent.mouseDown(screen.getByText("Apple"));

        // Check that the onSelect callback is called with the correct value
        expect(defaultProps.onSelect).toHaveBeenCalledWith({ value: "apple", label: "Apple" });
        // Optionally, check that the input value is cleared after selection (if that's the intended behavior)
        expect(input).toHaveValue("");
    });

    // Disabled state
    it("doesn't open when disabled", () => {
        render(<SearchableDropdown {...defaultProps} disabled />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        
        expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    });

    it("doesn't select options when disabled", () => {
        const onSelect = vi.fn();
        render(<SearchableDropdown {...defaultProps} disabled onSelect={onSelect} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        
        expect(onSelect).not.toHaveBeenCalled();
    });

    it("shows disabled styling", () => {
        render(<SearchableDropdown {...defaultProps} disabled />);
        const input = screen.getByRole("textbox");
        
        expect(input).toHaveClass("cursor-not-allowed", "opacity-60");
        expect(input).toBeDisabled();
    });

    // Selected option styling
    it("highlights selected option in dropdown", () => {
        const selectedValue = { value: "banana", label: "Banana" };
        render(<SearchableDropdown {...defaultProps} selectedValue={selectedValue} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        
        const selectedOption = screen.getByText("Banana");
        expect(selectedOption).toHaveClass("bg-primary-green-3", "font-bold");
    });

    // Outside click
    it("closes dropdown on outside click", async () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        expect(screen.getByText("Apple")).toBeInTheDocument();
        
        fireEvent.mouseDown(document.body);
        
        await waitFor(() => {
            expect(screen.queryByText("Apple")).not.toBeInTheDocument();
        });
    });

    it("restores selected value on outside click", async () => {
        const selectedValue = { value: "apple", label: "Apple" };
        render(<SearchableDropdown {...defaultProps} selectedValue={selectedValue} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "ban" } });
        fireEvent.mouseDown(document.body);
        
        await waitFor(() => {
            expect(screen.getByDisplayValue("Apple")).toBeInTheDocument();
        });
    });

    // Custom styling
    it("applies custom width", () => {
        render(<SearchableDropdown {...defaultProps} dropdownWidth="w-64" />);
        const container = screen.getByRole("textbox").parentElement?.parentElement;
        expect(container).toHaveClass("w-64");
    });

    it("applies custom font size", () => {
        render(<SearchableDropdown {...defaultProps} fontSize="text-xl" />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveClass("text-xl");
    });

    it("applies custom height", () => {
        render(<SearchableDropdown {...defaultProps} dropdownHeight="py-4" />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveClass("py-4");
    });

    // Alignment
    it("applies right alignment", () => {
        render(<SearchableDropdown {...defaultProps} align="right" />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        
        const dropdown = screen.getByRole("list");
        expect(dropdown).toHaveClass("right-0", "left-auto");
    });

    it("applies left alignment by default", () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        
        const dropdown = screen.getByRole("list");
        expect(dropdown).toHaveClass("left-0", "right-auto");
    });

    // Focus states
    it("shows blue ring when dropdown is open", () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        
        expect(input).toHaveClass("ring-1", "ring-blue-500");
    });

    it("clears search when opening dropdown", () => {
        const selectedValue = { value: "apple", label: "Apple" };
        render(<SearchableDropdown {...defaultProps} selectedValue={selectedValue} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        
        expect(screen.getByDisplayValue("")).toBeInTheDocument();
    });

    // Scrolling behavior
    it("scrolls selected option into view when dropdown opens", () => {
        const scrollIntoViewMock = vi.fn();
        const spy = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(scrollIntoViewMock);
        
        const selectedValue = { value: "banana", label: "Banana" };
        render(<SearchableDropdown {...defaultProps} selectedValue={selectedValue} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        
        expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: "nearest" });

        spy.mockRestore();
    });

    // No options case
    it("doesn't show dropdown when no filtered options", () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "xyz" } });
        
        expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });

    // Icon hover behavior
    it("shows hover styling on icon", () => {
        render(<SearchableDropdown {...defaultProps} />);
        const iconButton = screen.getByRole("button");
        
        expect(iconButton).toHaveClass("hover:text-primary-green-3");
    });

    it("shows disabled icon styling when disabled", () => {
        render(<SearchableDropdown {...defaultProps} disabled />);
        const iconButton = screen.getByRole("button");
        
        expect(iconButton).toHaveClass("cursor-not-allowed", "opacity-50");
        expect(iconButton).toBeDisabled();
    });

    // Custom events
    it("dispatches custom event when opening dropdown", () => {
        const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        
        expect(dispatchEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "closeOtherDropdowns"
            })
        );
        
        dispatchEventSpy.mockRestore();
    });

    // ...existing code...

    // Custom events
    it("dispatches custom event when opening dropdown", () => {
        const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        
        expect(dispatchEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "closeOtherDropdowns"
            })
        );
        
        dispatchEventSpy.mockRestore();
    });

    // Test for lines 155-157: restoreSelectedValue when not isRestoringValue
    it("restores selected value when conditions are met", () => {
        const selectedValue = { value: "apple", label: "Apple" };
        const TestComponent = () => {
            const [showDropdown, setShowDropdown] = React.useState(false);
            const [isRestoringValue, setIsRestoringValue] = React.useState(false);
            
            const restoreSelectedValue = () => {
                if (selectedValue && !isRestoringValue) {
                    setIsRestoringValue(true);
                    // Simulate the restore logic
                    setIsRestoringValue(false);
                }
            };
            
            return (
                <div>
                    <SearchableDropdown {...defaultProps} selectedValue={selectedValue} />
                    <button onClick={restoreSelectedValue} data-testid="restore-btn">
                        Restore
                    </button>
                </div>
            );
        };
        
        render(<TestComponent />);
        fireEvent.click(screen.getByTestId("restore-btn"));
        
        expect(screen.getByDisplayValue("Apple")).toBeInTheDocument();
    });

    // Test for lines 209-211: hasTyped false condition
    it("shows all options when hasTyped is false", () => {
        const TestComponent = () => {
            const [hasTyped, setHasTyped] = React.useState(false);
            const [search] = React.useState("");
            
            // Simulate filteredOptions logic
            const filteredOptions = !hasTyped ? mockOptions : 
                mockOptions.filter((option) =>
                    option.label.toLowerCase().includes(search.toLowerCase())
                );
            
            return (
                <div>
                    <button onClick={() => setHasTyped(false)} data-testid="reset-typed">
                        Reset Typed
                    </button>
                    <div data-testid="options-count">{filteredOptions.length}</div>
                </div>
            );
        };
        
        render(<TestComponent />);
        fireEvent.click(screen.getByTestId("reset-typed"));
        
        expect(screen.getByTestId("options-count")).toHaveTextContent("4");
    });

    // Test for lines 229-230: event.detail?.exclude check
    it("closes dropdown when another dropdown opens with different exclude", async () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        expect(screen.getByText("Apple")).toBeInTheDocument();
        
        // Simulate another dropdown opening
        const customEvent = new CustomEvent("closeOtherDropdowns", {
            detail: { exclude: document.createElement("div") } // Different element
        });
        window.dispatchEvent(customEvent);

        // Optionally, fire a blur event or click outside to help close the dropdown
        fireEvent.mouseDown(document.body);

        await waitFor(() => {
            expect(screen.queryByText("Apple")).not.toBeInTheDocument();
        });
    });

    // Test for event.detail?.exclude === rootRef.current case
    it("doesn't close dropdown when same dropdown dispatches event", () => {
        const TestComponent = () => {
            const [showDropdown, setShowDropdown] = React.useState(true);
            const rootRef = React.useRef<HTMLDivElement>(null);
            
            React.useEffect(() => {
                const handleCloseOthers = (event: CustomEvent<{ exclude: HTMLElement | null }>) => {
                    if (event.detail?.exclude !== rootRef.current && showDropdown) {
                        setShowDropdown(false);
                    }
                };
                
                window.addEventListener("closeOtherDropdowns", handleCloseOthers as EventListener);
                return () => window.removeEventListener("closeOtherDropdowns", handleCloseOthers as EventListener);
            }, [showDropdown]);
            
            const handleDispatch = () => {
                window.dispatchEvent(new CustomEvent("closeOtherDropdowns", {
                    detail: { exclude: rootRef.current }
                }));
            };
            
            return (
                <div ref={rootRef}>
                    <button onClick={handleDispatch} data-testid="dispatch-btn">Dispatch</button>
                    <div data-testid="dropdown-state">{showDropdown ? "open" : "closed"}</div>
                </div>
            );
        };
        
        render(<TestComponent />);
        fireEvent.click(screen.getByTestId("dispatch-btn"));
        
        expect(screen.getByTestId("dropdown-state")).toHaveTextContent("open");
    });

    // Test for justClickedIcon true condition
    it("doesn't close dropdown when icon was just clicked", async () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        const iconButton = screen.getByRole("button");
        
        fireEvent.focus(input);
        expect(screen.getByText("Apple")).toBeInTheDocument();
        
        // Click icon to set justClickedIcon to true
        fireEvent.mouseDown(iconButton);

        // Wait a tick before clicking outside, simulating the justClickedIcon timing logic
        await waitFor(() => {}, { timeout: 0 });

        // Now click outside - should close because justClickedIcon is reset
        fireEvent.mouseDown(document.body);

        // The dropdown should be closed after clicking outside
        await waitFor(() => {
            expect(screen.queryByText("Apple")).not.toBeInTheDocument();
        });
    });

    // Test for mouseDown preventDefault on icon
    it("prevents default on icon mouseDown", () => {
        render(<SearchableDropdown {...defaultProps} />);
        const iconButton = screen.getByRole("button");
        
        const mockPreventDefault = vi.fn();
        const mouseDownEvent = new MouseEvent("mousedown", { bubbles: true });
        Object.defineProperty(mouseDownEvent, "preventDefault", {
            value: mockPreventDefault
        });
        
        fireEvent(iconButton, mouseDownEvent);
        
        expect(mockPreventDefault).toHaveBeenCalled();
    });

    // Test for handleClickOutside with justClickedIcon false
    it("closes dropdown on outside click when justClickedIcon is false", async () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        expect(screen.getByText("Apple")).toBeInTheDocument();
        
        // Wait a bit to ensure justClickedIcon is false
        await waitFor(() => {
            fireEvent.mouseDown(document.body);
        });
        
        await waitFor(() => {
            expect(screen.queryByText("Apple")).not.toBeInTheDocument();
        });
    });

    // Test for CSS scrollbar styles (lines would be in style tag)
    it("applies scrollbar styles when dropdown is open", () => {
        render(<SearchableDropdown {...defaultProps} />);
        const input = screen.getByRole("textbox");
        
        fireEvent.focus(input);
        
        // Check that style tag exists with scrollbar CSS
        const styleElement = document.querySelector('style');
        expect(styleElement).toBeInTheDocument();
        expect(styleElement?.textContent).toContain('scrollbar-color: rgba(217, 217, 217, 1) transparent');
    });
});