/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : DotLoading is used for display loading state.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React, { memo } from "react";

import "./dotloading.css";

interface DotLoadingProps {
	direction?: "left" | "right" | "up" | "down";
}

/**
 * A loading indicator component that renders animated dots in a given direction.
 *
 * @param {Object} props - The props for the DotLoading component.
 * @param {"left" | "right" | "up" | "down"} [props.direction="left"] - Direction of the dot animation layout.
 * @returns {JSX.Element} The rendered dot loading animation.
 */
const DotLoading: React.FC<DotLoadingProps> = ({ direction = "left" }) => {
	/**
	 * Determines the CSS flex-direction based on the provided direction.
	 *
	 * @returns {string} The corresponding CSS flex-direction value ("row", "row-reverse", "column", or "column-reverse").
	 */
	const getFlexDirection = () => {
		if (direction === "up") return "column-reverse";
		if (direction === "down") return "column";
		if (direction === "left") return "row-reverse";
		return "row";
	};

	return (
		<div
			className="dot-loading"
			data-testid="dot-loading"
			style={{
				display: "flex",
				flexDirection: getFlexDirection(),
				alignItems: "center",
				justifyContent: "center"
			}}
		>
			<span className="dot" />
			<span className="dot delay-1" />
			<span className="dot delay-2" />
			<span className="dot delay-3" />
		</div>
	);
};

export default memo(DotLoading);
