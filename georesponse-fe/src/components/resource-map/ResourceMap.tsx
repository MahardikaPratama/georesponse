/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : Renders resources on a map. Never imports maplibre-gl or
 *                calls a MapLibre API directly — everything map-related
 *                goes through map-adapter/MapAdapter.ts.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Feeds it real resource data via markers/
 *                        selectedResourceId (Phase 6 section 9.1); syncs
 *                        selectedResourceId to the adapter's selectMarker
 *                        so a list-driven selection highlights the marker.
 */
import React, { useEffect, useRef } from "react";

import { createMapLibreAdapter } from "./map-adapter/MapAdapter";
import { ResourceMapProps } from "./ResourceMap.types";

function ResourceMap({
	markers = [],
	selectedResourceId = null,
	onResourceSelect
}: ResourceMapProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const adapterRef = useRef(createMapLibreAdapter());

	// The map is only initialized once (see the effect below), so its click
	// handler closes over onResourceSelect as it was at that first render.
	// Routing every call through this ref, updated on every render, means a
	// parent passing a new onResourceSelect identity each render (e.g. an
	// inline arrow function) still reaches the current one, not a stale one.
	const onResourceSelectRef = useRef(onResourceSelect);
	onResourceSelectRef.current = onResourceSelect;

	useEffect(() => {
		if (!containerRef.current) return;

		const adapter = adapterRef.current;
		adapter.init({
			container: containerRef.current,
			tileUrl: process.env.MAP_TILE_URL ?? "",
			onMarkerClick: (resourceId) => onResourceSelectRef.current?.(resourceId)
		});

		return () => adapter.destroy();
	}, []);

	useEffect(() => {
		adapterRef.current.setMarkers(markers);
	}, [markers]);

	useEffect(() => {
		adapterRef.current.selectMarker(selectedResourceId);
	}, [selectedResourceId]);

	return (
		<div
			ref={containerRef}
			className="w-full h-full"
			data-testid="resource-map"
		/>
	);
}

export default ResourceMap;
