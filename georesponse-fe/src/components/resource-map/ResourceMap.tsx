/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Renders resources on a map. Never imports maplibre-gl or
 *                calls a MapLibre API directly — everything map-related
 *                goes through map-adapter/MapAdapter.ts. Feeding it real
 *                resource data (from useResources) is Phase 6 work; this
 *                component only proves the adapter boundary mounts,
 *                updates, and tears down correctly.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React, { useEffect, useRef } from "react";

import { createMapLibreAdapter } from "./map-adapter/MapAdapter";
import { ResourceMapProps } from "./ResourceMap.types";

function ResourceMap({ markers = [], onResourceSelect }: ResourceMapProps) {
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

	return (
		<div
			ref={containerRef}
			className="w-full h-full"
			data-testid="resource-map"
		/>
	);
}

export default ResourceMap;
