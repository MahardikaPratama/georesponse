/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : A component for input validation and formatting
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 * - 1.1.0 (2026-09-19): Removed the hardcoded "squawk"-field special case
 *                        from the auto-padding logic (see
 *                        fieldNames.constants.ts) — that field doesn't
 *                        exist in GeoResponse; the trim direction is now
 *                        derived generically from padDirection instead.
 */
import React, {
	memo,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState
} from "react";

import { cn } from "@utils/cn";
import { InputValidationUtils } from "@utils/inputValidation";
import { logger } from "@utils/logger/logger";
import {
	READONLY_KINEMATIC_FIELDS,
	UPPERCASE_FIELDS,
	AUTO_PADDING_FIELDS,
	FIELD_PADDING_CONFIG
} from "@constants/fieldNames.constants";

import {
	cleanNumericInput,
	formatNumber,
	unformatNumber
} from "@utils/formatNumber"

// Generic field validator interface
export interface FieldValidator {
	validateAsync?: (
		raw: string,
		status: boolean | undefined,
		objectId: number
	) => Promise<void>;
	validateSync?: (
		raw: string,
		status: boolean | undefined
	) => boolean;
	setError?: (hasError: boolean) => void;
	getAsyncValidationState?: () => boolean | undefined;
}

/**
 * Props for InputValidation component.
 */
interface CustomInputProps {
	name?: string;
	value: string | number;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>, value: string) => void;
	onEnterPressed?: (name: string) => void;
	onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
	onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
	onBlur?: (e: React.FocusEvent<HTMLInputElement>, hasError: boolean) => void;
	helperText?: string;
	errorText?: string;
	unit?: string;
	inputWidth?: string;
	inputHeight?: string;
	fontSize?: string;
	textAlign?: "left" | "right" | "center";
	min?: number;
	max?: number;
	showError?: boolean;
	validate?: (value: string | number) => boolean;
	placeholder?: string;
	disabled?: boolean;
	readOnly?: boolean;
	leftSlot?: React.ReactNode;
	inputPattern?: string;
	formatThousands?: boolean;
	onValidChange?: (isValid: boolean) => void;
	maxDecimal?: number;
	isNumeric?: boolean;
	resetFlag?: boolean;
	allowEmpty?: boolean;
	isHex?: boolean;
	hexMin?: string;
	hexMax?: string;
	allowLeadingZero?: boolean;
	// Generic field validator
	fieldValidator?: FieldValidator;
	// Object ID for async validation (e.g., selectedId)
	objectId?: number | null;
	// Generic custom error message (computed at parent level)
	customErrorMessage?: string;
}

/**
 * A customizable input component with validation and visual feedback.
 *
 * @param {CustomInputProps} props - The props for the InputValidation component.
 * @returns {JSX.Element} The rendered input component with validation.
 */
const InputValidation: React.FC<CustomInputProps> = ({
	name,
	value,
	onChange = () => {},
	onEnterPressed,
	onFocus,
	onClick,
	onBlur,
	helperText,
	errorText,
	unit,
	inputWidth = "w-full",
	inputHeight = "h-9",
	fontSize = "text-lg",
	textAlign = "left",
	min,
	max,
	showError = true,
	validate,
	placeholder,
	disabled = false,
	readOnly = false,
	leftSlot,
	inputPattern,
	formatThousands = true,
	onValidChange,
	maxDecimal = 0,
	isNumeric = true,
	resetFlag = false,
	allowEmpty = false,
	isHex = false,
	hexMin,
	hexMax,
	allowLeadingZero,
	fieldValidator,
	objectId,
	customErrorMessage,
	...props
}) => {
	const [focused, setFocused] = useState(false);
	const [hasBlurred, setHasBlurred] = useState(false);
	const [internalValue, setInternalValue] = useState(String(value ?? ""));
	const id = useId();
	const prevValidRef = useRef<boolean | null>(null);

	useEffect(() => {
		setInternalValue(String(value ?? ""));
	}, [value]);

	useEffect(() => {
		if (objectId === null || objectId === undefined) {
			setFocused(false);
		}
	}, [objectId]);

	useEffect(() => {
		setHasBlurred(false);
	}, [resetFlag]);

	const compiledPattern = useMemo(() => {
		if (isHex) {
			return /^[0-9A-Fa-f]*$/;
		}

		if (!inputPattern && isNumeric) {
			if (maxDecimal > 0) {
				const source = `^-?\\d*(\\.\\d{0,${maxDecimal}})?$`;
				return new RegExp(source);
			} else {
				return /^-?\d+$/;
			}
		}

		if (inputPattern) {
			try {
				return new RegExp(inputPattern);
			} catch (err) {
				logger.error("Invalid inputPattern:", inputPattern, err);
				return null;
			}
		}

		return null;
	}, [inputPattern, isNumeric, maxDecimal, isHex]);

	// Generic field validation effect
	useEffect(() => {
		if (!fieldValidator) return;

		const raw = unformatNumber(internalValue);
		const status = InputValidationUtils.getValidationStatus({
			raw,
			pattern: compiledPattern,
			min,
			max,
			validate,
			maxDecimal,
			allowEmpty,
			isNumeric,
			hasBlurred,
			isHex,
			hexMin,
			hexMax
		});

		const idValid = objectId !== undefined && objectId !== null;

		if (fieldValidator.validateAsync && idValid) {
			void fieldValidator.validateAsync(raw, status, objectId);
		}
	}, [
		internalValue,
		fieldValidator,
		compiledPattern,
		min,
		max,
		validate,
		maxDecimal,
		allowEmpty,
		isNumeric,
		hasBlurred,
		isHex,
		hexMin,
		hexMax,
		objectId
	]);

	const isValid = useMemo(() => {
		const raw = unformatNumber(internalValue);
		if (readOnly && name && READONLY_KINEMATIC_FIELDS.includes(name as typeof READONLY_KINEMATIC_FIELDS[number])) {
			return true;
		}

		if (!allowEmpty && (raw === "" || raw === undefined || raw === null)) {
			return false;
		}
		const status = InputValidationUtils.getValidationStatus({
			raw,
			pattern: compiledPattern,
			min,
			max,
			validate,
			maxDecimal,
			allowEmpty,
			isNumeric,
			hasBlurred,
			isHex,
			hexMin,
			hexMax
		});

		// Use generic field validator if provided
		if (fieldValidator?.validateSync) {
			return fieldValidator.validateSync(raw, status);
		}

		// Default validation for fields without custom validators
		return !!status;
	}, [
		compiledPattern,
		allowEmpty,
		hasBlurred,
		hexMax,
		hexMin,
		internalValue,
		isHex,
		isNumeric,
		max,
		maxDecimal,
		min,
		name,
		validate,
		fieldValidator,
		readOnly
	]);

	useEffect(() => {
		if (prevValidRef.current !== isValid) {
			prevValidRef.current = isValid;
			onValidChange?.(isValid);
		}
	}, [isValid, onValidChange]);

	const showErrorMessage = hasBlurred && showError && !isValid;
	const showHelper = focused && !showErrorMessage && !!helperText;
	
	// Use custom error message if provided, otherwise use provided errorText
	const finalErrorText = customErrorMessage ?? errorText;
	
	const message = InputValidationUtils.getMessage({
		showError: showErrorMessage,
		showHelper,
		errorText: finalErrorText,
		helperText,
		min,
		max,
		unit,
		isNumeric,
		isHex,
		hexMin,
		hexMax
	});

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			let raw = e.target.value;

			if (name && UPPERCASE_FIELDS.includes(name as typeof UPPERCASE_FIELDS[number])) {
				raw = raw.toUpperCase();
			}

			if (isHex) {
				const hexValue = raw.toUpperCase().replace(/[^0-9A-F]/g, "");
				if (hexValue === "" || compiledPattern?.test(hexValue)) {
					setInternalValue(hexValue);
					onChange(e, hexValue);
				}
				return;
			}

			if (!isNumeric) {
				setInternalValue(raw);
				onChange(e, raw);
				return;
			}

			let cleaned = cleanNumericInput(raw, maxDecimal);
		
			if (!allowLeadingZero && cleaned.length > 1 && cleaned.startsWith("0") && !cleaned.startsWith("0.")) {
				cleaned = cleaned.replace(/^0+/, "") || "0";
			}
			
			if (!allowLeadingZero && cleaned.startsWith("00")) {
				cleaned = "0";
			}

			if (cleaned === "" || compiledPattern?.test(cleaned)) {
				setInternalValue(cleaned);
				onChange(e, cleaned);
			}
		},
		[compiledPattern, isNumeric, maxDecimal, onChange, isHex, allowLeadingZero]
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") e.currentTarget.blur();
		},
		[]
	);

	const handleFocus = useCallback(() => {
		setFocused(true);
		setHasBlurred(false);
	}, []);

	const handleExternalFocus = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			handleFocus();
			onFocus?.(e);
		},
		[handleFocus, onFocus]
	);

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			setFocused(false);
			setHasBlurred(true);
			onEnterPressed?.(e.currentTarget.name);
		},
		[onEnterPressed]
	);

	const handleExternalBlur = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			handleBlur(e);
			let raw = unformatNumber(internalValue);
			
			// Auto-padding for specific fields using configuration
			if (name && raw && Object.values(AUTO_PADDING_FIELDS).includes(name)) {
				const paddingConfig = FIELD_PADDING_CONFIG[name];
				if (paddingConfig) {
					const padded = paddingConfig.padDirection === "start"
						? raw.padStart(paddingConfig.targetLength, paddingConfig.padChar)
						: raw.padEnd(paddingConfig.targetLength, paddingConfig.padChar);

					// Keep exactly targetLength characters, trimming from the
					// side opposite the padding direction (so padding never
					// makes the value longer than the configured length).
					const finalPadded = paddingConfig.padDirection === "start"
						? padded.slice(-paddingConfig.targetLength)
						: padded.slice(0, paddingConfig.targetLength);

					if (finalPadded !== internalValue) {
						setInternalValue(finalPadded);
						const syntheticEvent = {
							...e,
							target: { ...e.target, value: finalPadded }
						} as React.ChangeEvent<HTMLInputElement>;
						onChange(syntheticEvent, finalPadded);
						raw = finalPadded;
					}
				}
			}
			
			const hasError =
				!(raw === "" || raw === undefined || raw === null) && !isValid;
			onBlur?.(e, hasError);
		},
		[handleBlur, isValid, onBlur, internalValue, name, onChange]
	);

	const handleClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
		(e.target as HTMLInputElement).select();
	}, []);

	const handleExternalClick = useCallback(
		(e: React.MouseEvent<HTMLInputElement>) => {
			handleClick(e);
			onClick?.(e);
		},
		[handleClick, onClick]
	);

	const displayValue =
		formatThousands && internalValue !== "" && isNumeric && !isHex
			? formatNumber(internalValue)
			: internalValue;

	const inputClass = cn(
		"w-full font-medium",
		fontSize,
		disabled ? "text-white/50" : "text-white",
		textAlign === "right" ? "text-right" : "pl-2 text-left",
		"bg-transparent outline-none appearance-none",
		"[&::-webkit-inner-spin-button]:appearance-none",
		"[&::-webkit-outer-spin-button]:appearance-none",
		disabled || readOnly ? "cursor-not-allowed" : "cursor-pointer",
		unit ? "" : "pr-2"
	);

	const backgroundClass = disabled
		? "bg-background-100-2/50 text-white/50"
		: "bg-background-100-2 text-white";

	const readOnlyClass = readOnly ? "pointer-events-none opacity-50" : "";

	let borderClass = "border border-transparent";
	if (showErrorMessage) {
		borderClass = "border border-red-500";
	} else if (focused) {
		borderClass = "border border-blue-500";
	}

	const containerClass = cn(
		"flex relative items-center px-2",
		inputWidth,
		inputHeight,
		"rounded-md transition-colors duration-200",
		backgroundClass,
		readOnlyClass,
		borderClass
	);

	const unitClass = cn(
		"right-1 inset-y-0 flex items-center min-w-[80px] ps-2 font-medium",
		fontSize,
		disabled ? "text-white/50" : "text-white"
	);

	return (
		<div className="relative w-full" data-testid="custom-input-test">
			<div className={containerClass}>
				{leftSlot && <div className="mr-2">{leftSlot}</div>}

				<input
					id={name ?? id}
					name={name}
					value={displayValue}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					onFocus={handleExternalFocus}
					onBlur={handleExternalBlur}
					onClick={handleExternalClick}
					disabled={disabled}
					readOnly={readOnly}
					className={inputClass}
					placeholder={placeholder}
					data-testid={name}
					autoComplete="off"
					{...props}
				/>

				{unit && <span className={unitClass}>{unit}</span>}
			</div>

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
		</div>
	);
};

export default memo(InputValidation);
