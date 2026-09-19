/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : Reusable component to visually display status messages
 *                with color indicators. Used for Resource.status display
 *                (AVAILABLE, IN_USE, MAINTENANCE, UNAVAILABLE).
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 * - 1.1.0 (2026-09-19): Added the "info" color role for Resource.status
 *                        IN_USE (informational/blue).
 */
import React from "react";

interface StatusIndicatorProps {
	/** The message text to display (e.g., "Data sent") */
	message: string;
	/** The color of the indicator box (e.g., "active", "error", "warning") */
	color?: "active" | "error" | "warning" | "inactive" | "info";
	/** Optional additional className */
	className?: string;
	/** Custom margin-left for color box, e.g., 'ml-8' */
	mlClass?: string;
}

/**
 * A reusable dynamic status indicator with a colored square and label.
 *
 * @param {Object} props - The props object.
 * @param {string} props.message - The label text to display.
 * @param {"active" | "error" | "warning" | "inactive" | "info"} [props.color="active"] - The color of the status indicator.
 * @param {string} [props.className] - Optional additional class names for the container.
 * @param {string} [props.mlClass] - Optional additional class names for the container.
 * @returns {JSX.Element} The rendered status indicator component.
 */
const StatusIndicator: React.FC<StatusIndicatorProps> = ({
	message,
	color = "active",
	className = "",
	mlClass = "ml-8"
}) => {
	const colorMap: Record<string, string> = {
		active: "bg-indicator-active",
		error: "bg-indicator-error",
		warning: "bg-indicator-warning",
		inactive: "bg-indicator-inactive"
	};

	return (
		<div
			className={`flex items-center justify-between bg-transparent text-white rounded-md py-2 w-fit ${className}`}
		>
			<span className="text-[28px] font-medium flex-grow">{message}</span>
			<div
				data-testid="color-box"
				className={`${mlClass} w-10 h-10 rounded-sm ${colorMap[color]} shadow-triple-ring`}
			/>
		</div>
	);
};

export default StatusIndicator;
