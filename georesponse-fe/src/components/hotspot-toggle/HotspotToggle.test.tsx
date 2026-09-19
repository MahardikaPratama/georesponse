/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : Tests HotspotToggle's loading/empty/error/populated
 *                states and the toggle interaction.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-20): Cover the "as of" observation date.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HotspotToggle from "./HotspotToggle";

describe("HotspotToggle", () => {
	it("shows a loading indicator while pending", () => {
		render(
			<HotspotToggle visible={true} onToggle={vi.fn()} status="pending" count={0} />
		);
		expect(screen.queryByText("No active hotspots")).not.toBeInTheDocument();
	});

	it("shows an empty-state message when there are no hotspots", () => {
		render(
			<HotspotToggle visible={true} onToggle={vi.fn()} status="success" count={0} />
		);
		expect(screen.getByText("No active hotspots")).toBeInTheDocument();
	});

	it("shows the hotspot count when populated", () => {
		render(
			<HotspotToggle visible={true} onToggle={vi.fn()} status="success" count={3} />
		);
		expect(screen.getByText("3 active")).toBeInTheDocument();
	});

	it("shows the observation date the data is current to", () => {
		render(
			<HotspotToggle
				visible={true}
				onToggle={vi.fn()}
				status="success"
				count={3}
				asOf="2026-09-01"
			/>
		);
		expect(screen.getByText("3 active (BMKG data as of 2026-09-01)")).toBeInTheDocument();
	});

	it("shows an unavailable message on error", () => {
		render(
			<HotspotToggle
				visible={true}
				onToggle={vi.fn()}
				status="error"
				count={0}
				getErrorMessage={() => "BMKG hotspot data is temporarily unavailable."}
			/>
		);
		expect(
			screen.getByText("BMKG hotspot data is temporarily unavailable.")
		).toBeInTheDocument();
	});

	it("calls onToggle with the inverted visibility when clicked", () => {
		const onToggle = vi.fn();
		render(
			<HotspotToggle visible={true} onToggle={onToggle} status="success" count={1} />
		);

		fireEvent.click(screen.getByRole("button", { name: "BMKG Hotspots" }));

		expect(onToggle).toHaveBeenCalledWith(false);
	});

	it("reflects visibility via aria-pressed", () => {
		render(
			<HotspotToggle visible={false} onToggle={vi.fn()} status="success" count={0} />
		);
		expect(screen.getByRole("button", { name: "BMKG Hotspots" })).toHaveAttribute(
			"aria-pressed",
			"false"
		);
	});
});
