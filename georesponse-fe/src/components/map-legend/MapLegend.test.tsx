/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-20
 * Description  : Tests MapLegend renders every resource status, the
 *                selected marker, and the hotspot entry only while the
 *                layer is visible.
 *
 * Changelog:
 * - 1.0.0 (2026-09-20): Initial creation.
 * - 1.1.0 (2026-09-20): Follow the descriptive labels.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MapLegend from "./MapLegend";

describe("MapLegend", () => {
	it("lists every resource status and the selected marker", () => {
		render(<MapLegend hotspotLayerVisible={false} />);

		for (const label of [
			"Available resource",
			"In Use resource",
			"Maintenance resource",
			"Unavailable resource",
			"Selected resource"
		]) {
			expect(screen.getByText(label)).toBeInTheDocument();
		}
		expect(screen.getByRole("complementary", { name: "Map legend" })).toBeInTheDocument();
	});

	it("omits the hotspot entry while the layer is hidden", () => {
		render(<MapLegend hotspotLayerVisible={false} hotspotAsOf="2026-09-01" />);
		expect(screen.queryByText(/Fire hotspot/)).not.toBeInTheDocument();
	});

	it("shows the hotspot entry with its observation date while visible", () => {
		render(<MapLegend hotspotLayerVisible={true} hotspotAsOf="2026-09-01" />);
		expect(
			screen.getByText("Fire hotspot (BMKG satellite detection, as of 2026-09-01)")
		).toBeInTheDocument();
	});

	it("shows the hotspot entry without a date when none is known", () => {
		render(<MapLegend hotspotLayerVisible={true} />);
		expect(screen.getByText("Fire hotspot (BMKG satellite detection)")).toBeInTheDocument();
	});
});
