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
 * - 1.2.0 (2026-09-19): Added HotspotMarker and the hotspot layer methods
 *                        (setHotspots/toggleHotspotLayer) for the BMKG
 *                        GeoHotspot overlay — a second, independent
 *                        source/layer pair alongside the resource one, not
 *                        a change to it, keeping hotspots separate from
 *                        application-managed resources as required.
 * - 1.3.0 (2026-09-19): Added onMapDoubleClick, the map-click placement
 *                        callback FRONTEND_UI_UX.md section 6 describes for
 *                        create ("Placing a resource by clicking the map
 *                        ... going through the map adapter's click
 *                        callback"), fired only when the double-click
 *                        didn't land on an existing marker/hotspot.
 */

/** A resource's position on the map, in the domain's lat/lng order. */
export interface MapMarker {
	id: string;
	latitude: number;
	longitude: number;
	/** CSS color (e.g. a hex string) the marker is painted with. */
	color: string;
}

/**
 * A BMKG hotspot's position and basic details, for the separate,
 * toggleable situational-awareness layer — never merged with MapMarker or
 * routed through onMarkerClick, since a hotspot is never an
 * application-managed resource.
 */
export interface HotspotMarker {
	id: string;
	latitude: number;
	longitude: number;
	province: string;
	regency: string;
	observedDate: string;
	observedTime: string;
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
	/**
	 * Called when the map is double-clicked somewhere that isn't an existing
	 * marker or hotspot, with the clicked position in the domain's lat/lng
	 * order. Double-click zoom is disabled so this doesn't fight the
	 * browser's default map interaction.
	 */
	onMapDoubleClick?: (location: { latitude: number; longitude: number }) => void;
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
	/** Replaces the BMKG hotspot layer's data. */
	setHotspots(hotspots: HotspotMarker[]): void;
	/** Shows or hides the hotspot layer without discarding its data. */
	toggleHotspotLayer(visible: boolean): void;
	destroy(): void;
}
