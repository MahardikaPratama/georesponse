/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : Color palette constants for the application theme system. Contains
 *                all color definitions used throughout the application including
 *                neutral colors, primary theme colors, status colors, and
 *                component-specific color schemes.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 * - 1.1.0 (2026-09-19): Added the "primary" scale — referenced by Button's
 *                        default color but missing from the adapted
 *                        palette, which would have rendered "primary"
 *                        buttons with no background at all.
 */

/**
 * Application color palette containing all theme colors.
 * Organized by color categories for consistent theming across components.
 */

const colors = {
	/** Neutral colors for backgrounds, text, and borders */
	neutral: {
		"1": "#FFFFFF",
		"2": "#E1EAF5",
		"3": "#6E6F6E",
		"4": "#494D49",
		"5": "#242A26",
		"6": "#BBC3CA"
	},
	/** Primary brand color (used by Button's default "primary" color) */
	primary: {
		"20": "#4F9669",
		"50": "#81AC91"
	},
	/** Primary green theme colors */
	"primary-green": {
		"1": "#294734",
		"2": "#6B9479",
		"3": "#4F9669",
		"4": "#81AC91"
	},
	/** Error and danger state colors */
	error: {
		"1": "#C13B3B",
		"2": "#872A2A",
		"3": "#5D1F1F",
		"4": "#501818"
	},
	warning: {
		"1": "#D7C525",
		"2": "#DECF49",
		"3": "#E4D86E",
		"4": "#EBE292",
		"5": "#F2ECB6"
	},
	amber: {
		"1": "#FFBF00",
		"2": "#FFCA2A",
		"3": "#FFD455",
		"4": "#FFDF80",
		"5": "#FFEAAA"
	},
	info: {
		light: "#3575F3",
		dark: "#2C4CBE"
	},
	success: {
		"1": "#156D55",
		"2": "#3C8571",
		"3": "#639E8E",
		"4": "#8AB6AA",
		"5": "#B1CEC6"
	},
	"background-50": {
		"1": "#1E201F",
		"2": "#202321",
		"3": "#1F221F"
	},
	"background-100": {
		"1": "#0A0F0C",
		"2": "#262D27",
		"3": "#121714"
	},
	"background-150": {
		"1": "#0A0C0B",
		"2": "#1B231C",
		"3": "#0A0F0C"
	},
	secondary: {
		"50": "#1D2422",
		"100": "#171E1A"
	},
	accent: {
		"1": "#6B9479",
		"2": "#242A26",
		"3": "#3F4640",
		"4": "#2C2A2A"
	},
	btn: {
		primary: "#4F9669",
		success: "#4F9669",
		error: "#C13B3B",
		click: "#294734",
		"success-hover": "#81AC91",
		"error-hover": "#872A2A",
		secondary: "#171E1A"
	},
	indicator: {
		active: "#00A000",
		error: "#C80000",
		warning: "#FFBF00",
		inactive: "#6E6F6E"
	},
};

module.exports = colors;
