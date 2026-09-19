/*
 * Author       : Mahardika Pratama
 * Version      : 1.2.0
 * Created Date : 2026-09-20
 * Description  : Floating legend for the resource map: one row per
 *                resource status (colour straight from
 *                RESOURCE_STATUS_CONFIG), the selected-resource ring, and,
 *                while the layer is shown, the BMKG hotspot dot with the
 *                observation date it is current to. Purely presentational;
 *                AppShell owns the hotspot visibility/date it receives.
 *
 * Changelog:
 * - 1.0.0 (2026-09-20): Initial creation.
 * - 1.1.0 (2026-09-20): Anchored top-left (the map's bottom edge can sit
 *                        below the viewport) with an inline background,
 *                        since the theme colour has no opacity variant.
 * - 1.2.0 (2026-09-20): SVG swatches that mirror the map's circle styles;
 *                        labels say what each icon is; nudged right.
 */
import React from "react";

import { HOTSPOT_MARKER_COLOR } from "@constants/hotspot.constants";
import { SELECTED_MARKER_COLOR } from "@constants/map.constants";
import { RESOURCE_STATUS_CONFIG } from "@constants/resourceStatus.constants";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { ResourceStatus } from "../../types/resource.types";

export interface MapLegendProps {
	/** Whether the BMKG hotspot layer is currently drawn on the map. */
	hotspotLayerVisible: boolean;
	/** BMKG observation date (YYYY-MM-DD) the hotspot layer is current to. */
	hotspotAsOf?: string;
}

interface LegendSwatchProps {
	color: string;
	label: string;
	/** Draw as the small translucent hotspot dot instead of a resource marker. */
	subtle?: boolean;
}

/**
 * The swatch mirrors the map's circle layers exactly (outlined marker vs.
 * small translucent dot), drawn as inline SVG with explicit dimensions so
 * it renders identically regardless of which utility classes the build
 * generated.
 */
function LegendSwatch({ color, label, subtle = false }: LegendSwatchProps) {
	return (
		<li className="flex items-center gap-2">
			<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
				{subtle ? (
					<circle cx="8" cy="8" r="4" fill={color} fillOpacity="0.7" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="0.5" />
				) : (
					<circle cx="8" cy="8" r="5.5" fill={color} stroke="#FFFFFF" strokeWidth="2" />
				)}
			</svg>
			<span>{label}</span>
		</li>
	);
}

function MapLegend({ hotspotLayerVisible, hotspotAsOf }: MapLegendProps) {
	const statuses = Object.keys(RESOURCE_STATUS_CONFIG) as ResourceStatus[];

	return (
		<aside
			aria-label="Map legend"
			className="absolute top-3 left-6 z-10 px-3 py-2 text-xs rounded-md border border-white/10 text-neutral-2 shadow-lg"
			style={{ backgroundColor: "rgba(17, 20, 25, 0.88)" }}
		>
			<p className="mb-1 font-semibold text-white">Legend</p>
			<p className="mb-1 text-neutral-3">Resources, by status</p>
			<ul className="space-y-1">
				{statuses.map((status) => (
					<LegendSwatch
						key={status}
						color={RESOURCE_STATUS_CONFIG[status].hex}
						label={`${RESOURCE_STATUS_CONFIG[status].label} resource`}
					/>
				))}
				<LegendSwatch color={SELECTED_MARKER_COLOR} label="Selected resource" />
			</ul>
			{hotspotLayerVisible && (
				<>
					<p className="mt-2 mb-1 text-neutral-3">Situational overlay</p>
					<ul className="space-y-1">
						<LegendSwatch
							subtle
							color={HOTSPOT_MARKER_COLOR}
							label={
								hotspotAsOf
									? `Fire hotspot (BMKG satellite detection, as of ${hotspotAsOf})`
									: "Fire hotspot (BMKG satellite detection)"
							}
						/>
					</ul>
				</>
			)}
		</aside>
	);
}

export default MapLegend;
