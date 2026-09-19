/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : The MapAdapter boundary (FRONTEND_ARCHITECTURE.md's Map
 *                Adapter section): everything a map implementation must
 *                support, expressed without any MapLibre type. Only
 *                MapAdapter.ts (and other files in this directory) may
 *                import maplibre-gl; ResourceMap.tsx depends on this
 *                interface only.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added MapMarker.color, so a marker can be painted
 *                        per Resource.status (FRONTEND_UI_UX.md section 7)
 *                        without this file or MapAdapter.ts needing to know
 *                        the Resource domain type or its status enum — the
 *                        caller resolves the color, the adapter just paints
 *                        it.
 */

/** A resource's position on the map, in the domain's lat/lng order. */
export interface MapMarker {
	id: string;
	latitude: number;
	longitude: number;
	/** CSS color (e.g. a hex string) the marker is painted with. */
	color: string;
}

export interface MapAdapterOptions {
	/** The DOM element the map renders into. */
	container: HTMLElement;
	/** Raster tile URL template (e.g. "https://.../{z}/{x}/{y}.png"). */
	tileUrl: string;
	/** [longitude, latitude], per GeoJSON's coordinate order. */
	center?: [number, number];
	zoom?: number;
	/** Called when a marker is clicked, with that resource's id. */
	onMarkerClick?: (resourceId: string) => void;
}

/**
 * Everything a feature component needs from the map, independent of which
 * mapping library implements it.
 */
export interface MapAdapter {
	init(options: MapAdapterOptions): void;
	setMarkers(markers: MapMarker[]): void;
	/** Highlights one marker (or clears the highlight, for null). */
	selectMarker(id: string | null): void;
	destroy(): void;
}
