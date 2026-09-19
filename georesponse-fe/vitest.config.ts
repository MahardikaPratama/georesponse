/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Vitest configuration for the GeoResponse frontend. Uses
 *                jsdom for component tests, mirrors the path aliases from
 *                tsconfig.json/rspack.config.js, and matches the colocated
 *                `*.test.ts(x)` convention used throughout the project.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Enabled `test.globals` so `describe`/`it`/`expect`/
 *                        `vi` are available without a per-file import —
 *                        several colocated tests adapted from a prior
 *                        project rely on that convention.
 */
import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@common": path.resolve(__dirname, "src/common"),
			"@components": path.resolve(__dirname, "src/components"),
			"@hooks": path.resolve(__dirname, "src/hooks"),
			"@store": path.resolve(__dirname, "src/store"),
			"@api": path.resolve(__dirname, "src/api"),
			"@types": path.resolve(__dirname, "src/types"),
			"@constants": path.resolve(__dirname, "src/constants"),
			"@utils": path.resolve(__dirname, "src/utils"),
			"@assets": path.resolve(__dirname, "src/assets")
		}
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./vitest.setup.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
		css: false
	}
});
