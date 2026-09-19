/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests useDebouncedValue delays updates until the value
 *                has settled for delayMs, and restarts the delay on every
 *                change.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("keeps the initial value until the delay elapses", () => {
		const { result } = renderHook(({ value }) => useDebouncedValue(value, 300), {
			initialProps: { value: "a" }
		});

		expect(result.current).toBe("a");
	});

	it("updates to the latest value once the delay elapses without further changes", () => {
		const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
			initialProps: { value: "a" }
		});

		rerender({ value: "ab" });
		act(() => vi.advanceTimersByTime(299));
		expect(result.current).toBe("a");

		act(() => vi.advanceTimersByTime(1));
		expect(result.current).toBe("ab");
	});

	it("restarts the delay on every change instead of updating mid-typing", () => {
		const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
			initialProps: { value: "a" }
		});

		rerender({ value: "ab" });
		act(() => vi.advanceTimersByTime(200));
		rerender({ value: "abc" });
		act(() => vi.advanceTimersByTime(200));
		expect(result.current).toBe("a");

		act(() => vi.advanceTimersByTime(100));
		expect(result.current).toBe("abc");
	});
});
