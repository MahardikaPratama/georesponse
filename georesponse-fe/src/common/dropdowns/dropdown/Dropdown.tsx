/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Comprehensive Dropdown component with all utilities and types
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React, { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

import { cn } from "@utils/cn";

// Types
export interface DropdownOption {
	value: string | number;
	label: string;
	disabled?: boolean;
}

export interface DropdownProps {
	value: DropdownOption["value"] | null;
	options: DropdownOption[];
	onChange?: (value: DropdownOption["value"] | null) => void;
	onSelectionChange?: (option: DropdownOption | null) => void;
	helperText?: string;
	errorText?: string;
	disabled?: boolean;
	readOnly?: boolean;
	placeholder?: string;
	className?: string;
	inputWidth?: string;
	inputHeight?: string;
	fontSize?: string;
	showSearch?: boolean;
	showError?: boolean;
}

// Utility functions
/**
 * Filters dropdown options based on search term
 * @param options - Array of dropdown options to filter
 * @param searchTerm - Search term to filter by
 * @returns Filtered array of dropdown options
 */
const filterOptions = (
	options: DropdownOption[],
	searchTerm: string
): DropdownOption[] => {
	if (!searchTerm) return options;

	return options.filter(
		(option) =>
			option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
			String(option.value).toLowerCase().includes(searchTerm.toLowerCase())
	);
};

export { filterOptions };

// Main Dropdown Component
/**
 *
 * @param root0 - The props object containing all dropdown configuration options
 * @param root0.value - The currently selected value (or null if none)
 * @param root0.options - Array of dropdown options to display
 * @param root0.onChange - Callback function when the selected value changes
 * @param root0.onSelectionChange - Callback function when the selected option changes
 * @param root0.helperText - Helper text to display below the dropdown
 * @param root0.errorText - Error message text to display
 * @param root0.disabled - Whether the dropdown is disabled
 * @param root0.readOnly - Whether the dropdown is read-only
 * @param root0.placeholder - Placeholder text when no option is selected
 * @param root0.className - Additional CSS classes for the dropdown container
 * @param root0.inputWidth - The width CSS class for the input container
 * @param root0.inputHeight - The height CSS class for the input container
 * @param root0.fontSize - The font size CSS class for the input text
 * @param root0.showSearch - Whether to show a search input for filtering options
 * @param root0.showError - Whether to show error styling
 * @returns The rendered Dropdown component
 */
const Dropdown: React.FC<DropdownProps> = ({
	value,
	options,
	onChange,
	onSelectionChange,
	helperText,
	errorText,
	disabled = false,
	readOnly = false,
	placeholder = "Select an option...",
	className,
	inputWidth = "w-full",
	inputHeight = "h-[52px]",
	fontSize = "text-lg",
	showSearch = false,
	showError = false
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [focused, setFocused] = useState(false);
	const [hasBlurred, setHasBlurred] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const filteredOptions = showSearch
		? filterOptions(options, searchTerm)
		: options;
	const selectedOption = options.find((opt) => opt.value === value);
	const selectedOptionRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		/**
		 * Handles clicks outside the dropdown component to close it
		 * @param event - The mouse event from clicking outside
		 */
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
				setSearchTerm("");
				setFocused(false);
				setHasBlurred(true);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	useEffect(() => {
		if (isOpen && selectedOptionRef.current) {
			selectedOptionRef.current.scrollIntoView({ block: "nearest" });
		}
	}, [isOpen]);

	/**
	 * Handles selection of a dropdown option
	 * @param option - The selected dropdown option or null for deselection
	 */
	const handleSelect = (option: DropdownOption | null) => {
		const newValue = option ? option.value : null;
		onChange?.(newValue);
		onSelectionChange?.(option);
		setIsOpen(false);
		setSearchTerm("");
		setFocused(false);
		setHasBlurred(true);
	};

	/**
	 * Toggles the dropdown open/closed state
	 */
	const handleToggle = () => {
		if (!disabled && !readOnly) {
			setIsOpen(!isOpen);
			setFocused(!isOpen);
			if (!isOpen) {
				setHasBlurred(false);
			}
		}
	};

	const backgroundClass = disabled
		? "bg-background-100-2/50 text-white/50"
		: "bg-background-100-2 text-white";

	const readOnlyClass = readOnly ? "pointer-events-none opacity-50" : "";

	const showErrorMessage = hasBlurred && showError && !value;
	const showHelper = focused && !showErrorMessage && !!helperText;

	let borderClass = "border border-transparent";
	if (showErrorMessage) {
		borderClass = "border border-red-500";
	} else if (focused || isOpen) {
		borderClass = "border border-blue-500";
	}

	const dropdownClasses = cn(
		"flex relative items-center px-2 font-medium",
		inputWidth,
		inputHeight,
		fontSize,
		"rounded-md transition-colors duration-200",
		backgroundClass,
		readOnlyClass,
		borderClass,
		"justify-between",
		disabled || readOnly ? "cursor-not-allowed" : "cursor-pointer",
		className
	);

	/**
	 * Determines the message to display below the dropdown (error or helper text)
	 * @returns The message string to display
	 */
	const getMessage = () => {
		if (showErrorMessage) return errorText ?? "Please select an option";
		if (showHelper) return helperText;
		return "";
	};

	const message = getMessage();

	return (
		<div className="relative w-full" ref={dropdownRef}>
			{/* Dropdown Input */}
			<button className={dropdownClasses} onClick={handleToggle}>
				<span
					className={cn(
						"truncate pl-2",
						!selectedOption && "text-white/50",
						disabled ? "text-white/50" : "text-white"
					)}
				>
					{selectedOption ? selectedOption.label : placeholder}
				</span>

				<div
					className={`
            absolute right-0 top-0 h-full w-10 flex items-center justify-center text-white
            ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:text-primary-green-3"}
            transition-colors duration-200
          `}
				>
					{isOpen ? <FiChevronUp size={22} /> : <FiChevronDown size={22} />}
				</div>
			</button>

			{/* Dropdown Menu */}
			{isOpen && (
				<div
					className={cn(
						"absolute z-50 w-full mt-1 shadow-lg",
						backgroundClass,
						"rounded-b-lg overflow-hidden"
					)}
				>
					{/* Options List */}
					<div
						className={cn(
							filteredOptions.length > 5
								? "max-h-48 overflow-y-auto scrollbar"
								: "overflow-hidden"
						)}
					>
						{/* Regular Options */}
						{filteredOptions.map((option) => {
							const isSelected = value === option.value && !option.disabled;
							return (
								<button
									type="button"
									key={option.value}
									ref={isSelected ? selectedOptionRef : undefined}
									className={cn(
										"w-full text-left m-0 px-3 py-2 cursor-pointer transition-colors",
										option.disabled
											? "text-white/30 cursor-not-allowed"
											: "text-white hover:bg-accent-3",
										isSelected ? "bg-primary-green-3 font-bold" : ""
									)}
									onClick={() => !option.disabled && handleSelect(option)}
								>
									{option.label}
								</button>
							);
						})}

						{/* No Options Found */}
						{filteredOptions.length === 0 && (
							<div className="px-3 py-2 text-white/50">No options found</div>
						)}
					</div>
				</div>
			)}

			{/* Helper/Error Message */}
			{message && (
				<div className="absolute mt-1 text-[16px] whitespace-nowrap">
					<span
						data-testid="feedback-message"
						className={cn(showErrorMessage ? "text-red-500" : "text-gray-400")}
					>
						{message}
					</span>
				</div>
			)}
			<style>{`
		.scrollbar::-webkit-scrollbar {
		  width: 6px;
		}
		.scrollbar {
		  scrollbar-width: thin;
		scrollbar-color: rgba(217, 217, 217, 1) transparent;
		}
      `}</style>
		</div>
	);
};

export default Dropdown;
