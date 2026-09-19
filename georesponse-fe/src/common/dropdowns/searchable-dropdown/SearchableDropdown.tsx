/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Reusable searchable dropdown component with disabled, enabled,
 *                hover, and pressed states. Built with Tailwind CSS. Suitable for
 *                consistent UI/UX design.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

type Option = {
	value: string;
	label: string;
};

type DropdownProps = {
	options: Option[];
	onSelect: (option: Option) => void;
	disabled?: boolean;
	dropdownWidth?: string;
	dropdownHeight?: string;
	align?: "left" | "right";
	selectedValue?: Option;
	fontSize?: string;
};

/**
 * A reusable searchable dropdown component with disabled, enabled, hover, and
 * pressed states. Built with Tailwind CSS. Suitable for consistent UI/UX design.
 * @param {DropdownProps} props - Component props.
 * @param {Option[]} props.options - A list of options to be displayed in the dropdown.
 * @param {(option: Option) => void} props.onSelect - The callback function to be called
 *                                                   when an option is selected.
 * @param {boolean} [props.disabled=false] - Whether the component is disabled or not.
 * @param {string} [props.dropdownWidth="w-[250px]"] - The width of the dropdown menu.
 * @param {string} [props.dropdownHeight] - The height of the dropdown menu.
 * @param {"left"|"right"} [props.align="left"] - The alignment of the dropdown menu.
 * @returns {ReactElement} The rendered component.
 */
const SearchableDropdown: React.FC<DropdownProps> = ({
	options,
	onSelect,
	disabled = false,
	dropdownWidth = "w-[250px]",
	dropdownHeight,
	align = "left",
	selectedValue,
	fontSize = "text-lg"
}) => {
	const [search, setSearch] = useState("");
	const [showDropdown, setShowDropdown] = useState(false);
	const [hasTyped, setHasTyped] = useState(false);
	const [isDropdownOpening, setIsDropdownOpening] = useState(false);
	const [isRestoringValue, setIsRestoringValue] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const [justClickedIcon, setJustClickedIcon] = useState(false);
	const selectedOptionRef = useRef<HTMLLIElement>(null);

	const filteredOptions = useMemo(() => {
		if (!hasTyped) return options;
		return options.filter((option) =>
			option.label.toLowerCase().includes(search.toLowerCase())
		);
	}, [options, search, hasTyped]);

	useEffect(() => {
		if (showDropdown && selectedOptionRef.current) {
			selectedOptionRef.current.scrollIntoView({ block: "nearest" });
		}
	}, [showDropdown, filteredOptions]);

	/**
	 * Restores the selected value without flickering
	 */
	const restoreSelectedValue = () => {
		if (selectedValue && !isRestoringValue) {
			setIsRestoringValue(true);
			setSearch(selectedValue.label);
			setHasTyped(false);
			setIsDropdownOpening(false);
			// Reset the restoring flag after a brief delay
			setTimeout(() => setIsRestoringValue(false), 10);
		}
	};

	/**
	 * Handles the selection of an option from the dropdown list. If the dropdown
	 * is disabled, it does nothing. Otherwise, it calls the onSelect callback
	 * function with the selected option as an argument, sets the search input
	 * value to the selected option's label, and closes the dropdown.
	 * @param {Option} option - The selected option.
	 */
	const handleSelect = (option: Option) => {
		if (disabled) return;
		onSelect(option);
		setSearch(option.label);
		setShowDropdown(false);
		setHasTyped(false);
		setIsDropdownOpening(false);
	};

	useEffect(() => {
		if (!(showDropdown || isDropdownOpening || isRestoringValue)) {
			setSearch(selectedValue?.label ?? "");
			setHasTyped(false);
		}
	}, [selectedValue, showDropdown, isDropdownOpening, isRestoringValue]);

	useEffect(() => {
		if (showDropdown && isDropdownOpening) {
			setIsDropdownOpening(false);
		}
	}, [showDropdown, isDropdownOpening]);

	useEffect(() => {
		/**
		 * Dispatches event to close other dropdowns when this one opens
		 */
		const handleGlobalClick = () => {
			if (showDropdown) {
				window.dispatchEvent(
					new CustomEvent("closeOtherDropdowns", {
						detail: { exclude: rootRef.current }
					})
				);
			}
		};

		if (showDropdown) {
			handleGlobalClick();
		}
	}, [showDropdown]);

	useEffect(() => {
		/**
		 * Handles closing this dropdown when another dropdown opens
		 * @param {CustomEvent} event - Custom event with exclude detail
		 */
		const handleCloseOthers = (
			event: CustomEvent<{ exclude: HTMLElement | null }>
		) => {
			if (event.detail?.exclude !== rootRef.current && showDropdown) {
				setShowDropdown(false);
				restoreSelectedValue();
			}
		};

		window.addEventListener(
			"closeOtherDropdowns",
			handleCloseOthers as EventListener
		);
		return () =>
			window.removeEventListener(
				"closeOtherDropdowns",
				handleCloseOthers as EventListener
			);
	}, [showDropdown, selectedValue]);

	/**
	 * Handles the focus event on the search input element. If the dropdown is not
	 * disabled, this function opens the dropdown and clears search for easier searching.
	 */
	const handleFocus = () => {
		if (!disabled && !showDropdown) {
			setIsDropdownOpening(true);
			setShowDropdown(true);
			setSearch("");
			setHasTyped(true);
		}
	};

	/**
	 * Handles input change event of the search input element.
	 * Sets the search state to the value of the input element. If the input
	 * element has just gained focus (i.e. the user has just started typing),
	 * it sets the hasTyped state to true. This is used to reset the filtered
	 * options list when the user clears the search input.
	 * @param {React.ChangeEvent<HTMLInputElement>} e - The change event of the input element.
	 */
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearch(e.target.value);
		if (!hasTyped) setHasTyped(true);
	};

	/**
	 * Handles the click event of the dropdown icon. If the dropdown is disabled,
	 * it does nothing. Otherwise, it sets the justClickedIcon state to true,
	 * focuses the search input element, and toggles the showDropdown state.
	 * The justClickedIcon state is used to prevent the dropdown from closing when
	 * the user clicks the icon and immediately starts typing.
	 */
	const handleIconClick = () => {
		if (disabled) return;
		setJustClickedIcon(true);
		if (!showDropdown) {
			setIsDropdownOpening(true);
			setSearch("");
			setHasTyped(true);
		} else {
			restoreSelectedValue();
		}
		inputRef.current?.focus();
		setShowDropdown((open) => !open);
	};

	useEffect(() => {
		/**
		 * Handles the click event outside the dropdown component. If the dropdown
		 * is disabled or the icon was just clicked, it does nothing. Otherwise, it
		 * checks if the target element is not a descendant of the root element (the
		 * dropdown component itself) and closes the dropdown if true.
		 * @param {MouseEvent} event - Click event.
		 */
		const handleClickOutside = (event: MouseEvent) => {
			if (justClickedIcon) {
				setJustClickedIcon(false);
				return;
			}
			if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
				setShowDropdown(false);
				restoreSelectedValue();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [justClickedIcon]);

	const alignClass =
		align === "right" ? "right-0 left-auto" : "left-0 right-auto";

	return (
		<div ref={rootRef} className={`relative ${dropdownWidth}`}>
			<div className="relative">
				<input
					ref={inputRef}
					type="text"
					value={search}
					disabled={disabled}
					onFocus={handleFocus}
					onChange={handleInputChange}
					className={
						fontSize +
						" " +
						(disabled
							? `w-full px-[16px] pr-10 rounded-md border-none focus:outline-none text-white bg-background-100-2 cursor-not-allowed font-medium opacity-60 ${dropdownHeight ?? "py-2"}`
							: `w-full px-[16px] pr-10 rounded-md border-none focus:outline-none text-white bg-background-100-2 font-medium ${dropdownHeight ?? "py-2"}`) +
						(showDropdown ? " ring-1 ring-blue-500" : "")
					}
					autoComplete="off"
				/>
				<button
					type="button"
					disabled={disabled}
					onMouseDown={(e) => {
						e.preventDefault();
						handleIconClick();
					}}
					onClick={handleIconClick}
					className={`
			absolute right-0 top-0 h-full w-10 flex items-center justify-center text-white border-none bg-transparent
			${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:text-primary-green-3"}
			transition-colors duration-200
		  `}
				>
					{showDropdown ? (
						<FiChevronUp size={22} />
					) : (
						<FiChevronDown size={22} />
					)}
				</button>
			</div>
			{showDropdown && filteredOptions.length > 0 && !disabled && (
				<ul
					className={`
            absolute ${alignClass} w-full mt-1 bg-background-100-2 border border-none rounded-b-lg shadow-lg z-10
            max-h-40 overflow-y-auto scrollbar
          `}
					style={{
						msOverflowStyle: "none"
					}}
				>
					{filteredOptions.map((option) => {
						const isSelected =
							selectedValue && option.value === selectedValue.value;
						return (
							<li
								aria-hidden
								key={option.value}
								ref={isSelected ? selectedOptionRef : undefined}
								onMouseDown={() => handleSelect(option)}
								className={`
      px-3 py-2 text-gray-100 hover:bg-accent-3 transition cursor-pointer
      select-none
      ${isSelected ? "bg-primary-green-3 font-bold" : ""}
    `}
							>
								{option.label}
							</li>
						);
					})}
				</ul>
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

export default SearchableDropdown;
