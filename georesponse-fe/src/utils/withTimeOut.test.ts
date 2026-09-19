/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Unit tests for utility functions ensuring correct behavior.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */

import { withTimeout } from "./withTimeOut";

describe("withTimeout utility", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("enforces minimum delay when underlying resolves quickly", async () => {
		const p = new Promise<string>((resolve) =>
			setTimeout(() => resolve("ok"), 10)
		);

		const wrapped = withTimeout(p, 50);

		// advance to when underlying resolves
		vi.advanceTimersByTime(10);
		// flush microtasks
		await Promise.resolve();

		// still should not have resolved because minimum delay is 50
		let isSettled = false;
		wrapped.then(() => (isSettled = true));
		vi.advanceTimersByTime(39);
		await Promise.resolve();
		expect(isSettled).toBe(false);

		vi.advanceTimersByTime(1);
		await Promise.resolve();
		await expect(wrapped).resolves.toBe("ok");
	});

	it("rejects with Timeout when underlying does not settle", async () => {
		const p = new Promise<string>(() => {
			// never resolves
		});

		const wrapped = withTimeout(p, 30);
		vi.advanceTimersByTime(30);
		await Promise.resolve();
		await expect(wrapped).rejects.toThrow("Timeout");
	});

	it("normalizes non-Error rejection into Error", async () => {
		const p = Promise.reject("bad");
		const wrapped = withTimeout(p, 0);
		// allow promise microtasks to run
		await Promise.resolve();
		await expect(wrapped).rejects.toThrow("bad");
	});

	it("passes through Error rejections from underlying promise", async () => {
		const p = Promise.reject(new Error("boom"));
		const wrapped = withTimeout(p, 0);
		await Promise.resolve();
		await expect(wrapped).rejects.toThrow("boom");
	});

	it("zero timeout with immediate resolve goes through remaining <= 0 branch", async () => {
		const p = Promise.resolve("now");
		const wrapped = withTimeout(p, 0);
		await Promise.resolve();
		await expect(wrapped).resolves.toBe("now");
	});
});
