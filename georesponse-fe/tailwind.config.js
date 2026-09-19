/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tailwind CSS v4 configuration. Referenced by src/index.css
 *                via the `@config` directive. Extends the theme's color
 *                palette from src/utils/colors.ts, which is carried over
 *                from a prior personal project (see that file's header).
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
const colors = require("./src/utils/colors");

/** @type {import("tailwindcss").Config} */
module.exports = {
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors,
			fontFamily: {
				montserrat: ["Montserrat", "sans-serif"]
			}
		}
	},
	plugins: []
};
