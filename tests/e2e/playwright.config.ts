/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-20
 * Description  : Playwright configuration for the end-to-end suite. Targets
 *                an already-running GeoResponse stack (./run.sh or
 *                docker compose up) at E2E_BASE_URL, default
 *                http://localhost:5173; it does not start the stack
 *                itself. Chromium only — the project validates against one
 *                evergreen browser by design.
 *
 * Changelog:
 * - 1.0.0 (2026-09-20): Initial creation.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: ".",
	testMatch: /.*\.spec\.ts/,
	timeout: 60_000,
	expect: { timeout: 10_000 },
	fullyParallel: false,
	workers: 1,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "off"
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
});
