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
 *                        selectedResourceId; syncs selectedResourceId to
 *                        the adapter's selectMarker so a list-driven
 *                        selection highlights the marker.
 * - 1.2.0 (2026-09-19): Added hotspots/hotspotLayerVisible, synced to the
 *                        adapter's setHotspots/toggleHotspotLayer.
 * - 1.3.0 (2026-09-19): Wired onMapDoubleClick through to the adapter's
 *                        init option, same onXRef pattern as onResourceSelect
 *                        so a fresh inline handler each render still reaches
 *                        the adapter's one-time click listener.
 */
import React, { useEffect, useRef } from "react";

import { createMapLibreAdapter } from "./map-adapter/MapAdapter";
import { ResourceMapProps } from "./ResourceMap.types";

function ResourceMap({
	markers = [],
	selectedResourceId = null,
	onResourceSelect,
	hotspots = [],
	hotspotLayerVisible = true,
	onMapDoubleClick
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

	const onMapDoubleClickRef = useRef(onMapDoubleClick);
	onMapDoubleClickRef.current = onMapDoubleClick;

	useEffect(() => {
		if (!containerRef.current) return;

		const adapter = adapterRef.current;
		adapter.init({
			container: containerRef.current,
			tileUrl: process.env.MAP_TILE_URL ?? "",
			onMarkerClick: (resourceId) => onResourceSelectRef.current?.(resourceId),
			onMapDoubleClick: (location) => onMapDoubleClickRef.current?.(location)
		});

		return () => adapter.destroy();
	}, []);

	useEffect(() => {
		adapterRef.current.setMarkers(markers);
	}, [markers]);

	useEffect(() => {
		adapterRef.current.selectMarker(selectedResourceId);
	}, [selectedResourceId]);

	useEffect(() => {
		adapterRef.current.setHotspots(hotspots);
	}, [hotspots]);

	useEffect(() => {
		adapterRef.current.toggleHotspotLayer(hotspotLayerVisible);
	}, [hotspotLayerVisible]);

	return (
		<div
			ref={containerRef}
			className="w-full h-full"
			data-testid="resource-map"
		/>
	);
}

export default ResourceMap;
