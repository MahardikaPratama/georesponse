/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests ResourceFilterBar debounces the search input before
 *                reporting it, while type/status selections report
 *                immediately, and that both are merged onto the existing
 *                filters rather than replacing them.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ResourceFilterBar from "./ResourceFilterBar";

describe("ResourceFilterBar", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("debounces the search input before calling onFiltersChange", () => {
		const onFiltersChange = vi.fn();
		render(<ResourceFilterBar filters={{}} onFiltersChange={onFiltersChange} />);

		fireEvent.change(screen.getByLabelText(/search resources/i), {
			target: { value: "ambulance" }
		});

		expect(onFiltersChange).not.toHaveBeenCalled();

		act(() => vi.advanceTimersByTime(300));

		expect(onFiltersChange).toHaveBeenCalledTimes(1);
		expect(onFiltersChange).toHaveBeenCalledWith({ search: "ambulance" });
	});

	it("reports a type selection immediately, merged onto the existing filters", () => {
		const onFiltersChange = vi.fn();
		render(
			<ResourceFilterBar filters={{ search: "amb" }} onFiltersChange={onFiltersChange} />
		);

		fireEvent.click(screen.getByRole("button", { name: /all types/i }));
		fireEvent.click(screen.getByRole("button", { name: "Vehicle" }));

		expect(onFiltersChange).toHaveBeenCalledWith({ search: "amb", type: "VEHICLE" });
	});

	it("clears the type filter when 'All types' is re-selected", () => {
		const onFiltersChange = vi.fn();
		render(
			<ResourceFilterBar
				filters={{ type: "VEHICLE" }}
				onFiltersChange={onFiltersChange}
			/>
		);

		fireEvent.click(screen.getByRole("button", { name: "Vehicle" }));
		fireEvent.click(screen.getByRole("button", { name: /all types/i }));

		expect(onFiltersChange).toHaveBeenCalledWith({ type: undefined });
	});
});
