/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Reusable alert component with auto-dismiss and fade-out animation
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React, { memo, useEffect, useState } from "react";
import { IoCloseOutline } from "react-icons/io5";
import { PiCheckCircleBold, PiWarning } from "react-icons/pi";

import "./Alert.css";
import Card from "./utils/CardAlert";

export interface AlertProps {
	title?: string;
	message?: string;
	isOpen?: boolean;
	handleClose: () => void;
	isTextRed?: boolean;
	position?:
		| "top-center"
		| "left-center"
		| "bottom-left"
		| "bottom-right"
		| "top-right"
		| "top-left";
	variant?: "error" | "success";
}

/**
 * Maps a given alert position to corresponding Tailwind CSS classes for placement on the screen.
 *
 * @param {AlertProps["position"]} [position="top-center"] - The position of the alert (e.g., "top-center", "bottom-left").
 * @returns {string} The corresponding Tailwind CSS class string for positioning the alert.
 */
export const getPositionClass = (position: AlertProps["position"] = "top-center"): string => {
	switch (position) {
		case "top-center":
			return "top-32 left-1/2 transform -translate-x-1/2";
		case "left-center":
			return "top-1/2 left-12 transform -translate-y-1/2";
		case "bottom-left":
			return "bottom-4 left-4";
		case "bottom-right":
			return "bottom-4 right-4";
		case "top-right":
			return "top-4 right-4";
		case "top-left":
			return "top-4 left-4";
		default:
			return "top-32 left-1/2 transform -translate-x-1/2";
	}
};

/**
 * `Alert` is a reusable UI component for showing temporary alert messages with auto-dismiss behavior.
 * It supports various positions, custom messages, and visual states.
 *
 * @param {AlertProps} props - The props for the alert component.
 * @param {string} [props.title] - The title text shown in the alert header.
 * @param {string} [props.message] - The body message shown in the alert content.
 * @param {boolean} [props.isOpen] - Controls whether the alert is visible.
 * @param {() => void} props.handleClose - Callback to execute when the alert is closed.
 * @param {boolean} [props.isTextRed] - Whether the message text should appear in red.
 * @param {"top-center" | "bottom-left" | "bottom-right" | "top-right" | "top-left"} [props.position="top-center"] - The position of the alert on screen.
 * @returns {JSX.Element | null} The rendered alert component, or null if not open.
 */
const Alert: React.FC<AlertProps> = ({
	title = "",
	message = "",
	isOpen = false,
	handleClose,
	isTextRed = false,
	position = "top-center",
	variant = "error"
}) => {
	const [fadeOut, setFadeOut] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [timeRemaining, setTimeRemaining] = useState(5000);

	const color = variant === "success" ? "#156D55" : "#C13B3B";
	const Icon = variant === "success" ? PiCheckCircleBold : PiWarning;

	/**
	 * Updates the remaining time for the alert timer and handles fade-out and auto-close logic.
	 *
	 * @param {number} prev - The previous time remaining value.
	 * @returns {number} The new time remaining value.
	 */
	const handleTimeUpdate = (prev: number) => {
		const newTime = prev - 100;

		if (newTime <= 2000 && !fadeOut) {
			setFadeOut(true);
		}

		if (newTime <= 0) {
			setTimeout(() => handleClose(), 0);
			return 5000;
		}

		return newTime;
	};

	/**
	 * Starts the countdown timer that updates every 100ms.
	 *
	 * @returns {NodeJS.Timeout} The interval ID for the timer.
	 */
	const startTimer = () => {
		return setInterval(() => {
			setTimeRemaining(handleTimeUpdate);
		}, 100);
	};

	useEffect(() => {
		if (!isOpen) {
			setTimeRemaining(5000);
			setFadeOut(false);
			return;
		}

		let intervalId: ReturnType<typeof setInterval> | null = null;

		if (!isHovered && timeRemaining > 0) {
			intervalId = startTimer();
		}

		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	}, [isOpen, isHovered, timeRemaining, fadeOut, handleClose]);

	if (!isOpen) return null;

	return (
		<div
			className={`absolute z-50 ${getPositionClass(position)} ${
				fadeOut ? "fade-out" : ""
			}`}
			data-testid="alert-container"
			role="alert"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<Card
				className="!p-1 !rounded-[8px]"
				style={{
					width: "293px",
					height: "51px",
					padding: "4px",
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					backgroundColor: variant === "success" ? "#e6f4f1" : "#ffeded",
					border: "0.5px solid",
					borderColor: variant === "success" ? "#156D55" : "#C13B3B"
				}}
			>
				<Card.Header className="flex items-center justify-between ml-1 mr-3">
					<div className="flex items-center gap-2 mr-1.5 -mt-1">
						<Icon size={16} style={{ color }} />
						<p
							data-testid="title"
							className="text-base font-bold"
							style={{ color }}
						>
							{title}
						</p>
						<button
							data-testid="close"
							onClick={handleClose}
							aria-label="Close alert"
							className="absolute right-1 top-1 cursor-pointer text-[#6e6f6e] bg-transparent border-none p-0 flex items-center justify-center"
						>
							<IoCloseOutline size={20} />
						</button>
					</div>
				</Card.Header>
				<Card.Content className="flex items-center h-full pb-4 pl-7">
					<span
						data-testid="message"
						className={`text-xs font-montserrat font-medium ${
							isTextRed ? "text-red-500" : "text-[#6e6f6e]"
						}`}
					>
						{message}
					</span>
				</Card.Content>
			</Card>
		</div>
	);
};

export default memo(Alert);
