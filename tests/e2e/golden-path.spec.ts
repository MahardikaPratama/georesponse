/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-20
 * Description  : The single end-to-end golden path, driven through the real
 *                browser UI against the full running stack:
 *
 *                  log in → view resources on the map/list → create a
 *                  resource → update it → relocate it → delete it
 *
 *                Each step asserts on what the UI shows next, and the
 *                final step confirms the resource is gone from the list.
 *                Uses the seeded local-development administrator account
 *                (database/seeds/0002_sample_auth.sql); override with
 *                E2E_ADMIN_ID / E2E_ADMIN_PASSWORD.
 *
 * Changelog:
 * - 1.0.0 (2026-09-20): Initial creation.
 */
import { expect, test, type Page } from "@playwright/test";

const ADMIN_ID = process.env.E2E_ADMIN_ID ?? "user-001";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "ChangeMe123!";

const RUN_ID = Date.now();
const RESOURCE_ID = `e2e-resource-${RUN_ID}`;
const RESOURCE_NAME = `E2E Ambulance ${RUN_ID}`;
const RENAMED_NAME = `${RESOURCE_NAME} (renamed)`;

async function login(page: Page): Promise<void> {
	await page.goto("/");
	await page.getByLabel("Identifier").fill(ADMIN_ID);
	await page.getByLabel("Password").fill(ADMIN_PASSWORD);
	await page.getByTestId("login-submit").click();
	// The app shell is only rendered once /auth/me confirms the session.
	await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}

/** The resource list is the sidebar's <ul aria-label="Resources">. */
function resourceList(page: Page) {
	return page.getByRole("list", { name: "Resources" });
}

/** The list entry (a button) whose visible text contains the name. */
function resourceEntry(page: Page, name: string) {
	return resourceList(page).getByRole("button", { name, exact: false });
}

test.describe("golden path", () => {
	test("view → create → update → relocate → delete a resource", async ({ page }) => {
		await login(page);

		// --- View: map and list are rendered with the seeded resources ------
		await expect(page.getByTestId("resource-map")).toBeVisible();
		await expect(resourceList(page)).toBeVisible();
		await expect(resourceList(page).getByRole("button").first()).toBeVisible();

		// --- Create ---------------------------------------------------------
		await page.getByRole("button", { name: "+ New Resource" }).click();
		await page.locator("#resource-id").fill(RESOURCE_ID);
		await page.locator("#resource-name").fill(RESOURCE_NAME);
		// Type defaults to Vehicle, status to Available; fill Vehicle's
		// type-specific attributes and a location in Jakarta.
		await page.locator("#resource-attribute-vehicleType").fill("Ambulance");
		await page.locator("#resource-attribute-capacity").fill("4");
		await page.locator("#resource-latitude").fill("-6.2088");
		await page.locator("#resource-longitude").fill("106.8456");
		await page.getByRole("button", { name: "Create", exact: true }).click();

		// The new resource appears in the list without a reload.
		await expect(resourceEntry(page, RESOURCE_NAME)).toBeVisible();

		// --- Select it: the detail card opens with its name ----------------
		await resourceEntry(page, RESOURCE_NAME).click();
		await expect(page.getByRole("heading", { name: RESOURCE_NAME })).toBeVisible();

		// --- Update ---------------------------------------------------------
		await page.getByRole("button", { name: "Edit", exact: true }).click();
		await expect(page.getByRole("heading", { name: "Edit Resource" })).toBeVisible();
		await page.locator("#resource-update-name").fill(RENAMED_NAME);
		await page.getByRole("button", { name: "Save", exact: true }).click();
		await expect(page.getByRole("heading", { name: RENAMED_NAME })).toBeVisible();
		await expect(resourceEntry(page, RENAMED_NAME)).toBeVisible();

		// --- Relocate -------------------------------------------------------
		await page.getByRole("button", { name: "Relocate", exact: true }).click();
		await page.locator("#relocate-latitude").fill("-6.9175");
		await page.locator("#relocate-longitude").fill("107.6191");
		await page.getByRole("button", { name: "Save", exact: true }).click();
		// The inline editor closes on success and the new coordinates are
		// shown in the detail card and the list entry.
		await expect(page.locator("#relocate-latitude")).toHaveCount(0);
		await expect(page.getByText("-6.9175").first()).toBeVisible();
		await expect(resourceEntry(page, RENAMED_NAME)).toContainText("-6.9175");

		// --- Delete ---------------------------------------------------------
		await page.getByRole("button", { name: "Delete", exact: true }).click();
		await expect(page.getByRole("heading", { name: "Delete resource?" })).toBeVisible();
		await page.getByRole("button", { name: "Delete", exact: true }).last().click();
		await expect(resourceEntry(page, RENAMED_NAME)).toHaveCount(0);
		await expect(page.getByRole("heading", { name: RENAMED_NAME })).toHaveCount(0);
	});
});
