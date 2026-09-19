/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : PostCSS configuration wiring the Tailwind CSS v4 PostCSS
 *                plugin, consumed by rspack.config.js's postcss-loader rule.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
module.exports = {
	plugins: {
		"@tailwindcss/postcss": {}
	}
};
