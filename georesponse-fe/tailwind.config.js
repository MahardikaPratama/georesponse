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
 * - 1.1.0 (2026-09-19): colors.ts dropped its CommonJS `module.exports`
 *                        (invalid alongside `export default` once a
 *                        bundler treats it as an ES module); unwrap the
 *                        ESM interop shape here instead.
 */
const colorsModule = require("./src/utils/colors");
const colors = colorsModule.default ?? colorsModule;

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
