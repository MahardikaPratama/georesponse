/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
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
 */

/** A resource's position on the map, in the domain's lat/lng order. */
export interface MapMarker {
	id: string;
	latitude: number;
	longitude: number;
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
