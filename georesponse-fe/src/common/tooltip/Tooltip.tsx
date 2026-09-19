/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tooltip component that follows mouse movement.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React, { memo, useId, useRef, useState } from "react";

import { cn } from "@utils/cn";

/**
 * A tooltip component that follows the mouse cursor when hovering over its children.
 *
 * @param {Object} props - Props for the Tooltip component.
 * @param {React.ReactNode} props.children - The element that will trigger the tooltip on hover.
 * @param {string} props.content - The text content to display in the tooltip.
 * @param {boolean} [props.disabled=false] - Whether the tooltip is disabled.
 * @param {string} [props.className] - Optional class name for additional styling on the tooltip.
 * @param {number} [props.offsetX=10] - Horizontal offset from mouse cursor.
 * @param {number} [props.offsetY=-35] - Vertical offset from mouse cursor.
 *
 * @returns {JSX.Element} The rendered tooltip component.
 */
function TooltipComponent({
	children,
	content,
	disabled = false,
	className,
	offsetX = 25,
	offsetY = 0
}: Readonly<{
	children: React.ReactNode;
	content: string;
	disabled?: boolean;
	className?: string;
	offsetX?: number;
	offsetY?: number;
}>) {
	const [isVisible, setIsVisible] = useState(false);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const containerRef = useRef<HTMLButtonElement>(null);
	const tooltipId = useId();

	/**
	 * Handles mouse movement to update tooltip position
	 * @param {React.MouseEvent} e - The mouse event object
	 */
	const handleMouseMove = (e: React.MouseEvent) => {
		if (disabled || !content) return;

		setPosition({
			x: e.clientX + offsetX,
			y: e.clientY + offsetY
		});
		setIsVisible(true);
	};

	/**
	 * Handles mouse enter to show tooltip
	 */
	const handleMouseEnter = () => {
		if (disabled || !content) return;

		// Only show tooltip, position will be updated by mouse move
		setIsVisible(true);
	};

	/**
	 * Handles mouse leave to hide tooltip
	 */
	const handleMouseLeave = () => {
		setIsVisible(false);
	};

	return (
		<>
			<button
				ref={containerRef}
				onMouseMove={handleMouseMove}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				className="inline-block"
				aria-describedby={isVisible && !disabled ? tooltipId : undefined}
				onClick={() => {}}
			>
				{children}
			</button>

			{/* Tooltip Portal */}
			{isVisible && content && !disabled && (
				<div
					id={tooltipId}
					role="tooltip"
					aria-live="polite"
					className={cn(
						"fixed z-[9999] px-2 py-1 text-xs font-semibold text-white bg-background-100-2 border-[1px] p-2 pointer-events-none whitespace-nowrap shadow-lg",
						"animate-in fade-in-0 duration-150",
						className
					)}
					style={{
						left: `${position.x}px`,
						top: `${position.y}px`
					}}
				>
					{content}
				</div>
			)}
		</>
	);
}

const Tooltip = memo(TooltipComponent);
export default Tooltip;
