/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : MapLibre GL JS implementation of the MapAdapter
 *                interface (MapAdapter.types.ts). The only file outside
 *                this directory allowed to know MapLibre exists is this
 *                one and MapAdapter.types.ts's doc comment explaining why
 *                — no other file in the codebase should import
 *                "maplibre-gl".
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Marker circles are now painted per-feature from
 *                        MapMarker.color (data-driven "circle-color"),
 *                        instead of one fixed color for every marker, so
 *                        status is visible on the map per
 *                        FRONTEND_UI_UX.md section 7.
 * - 1.2.0 (2026-09-19): Added the BMKG hotspot layer: a second, independent
 *                        GeoJSON source/layer pair (setHotspots/
 *                        toggleHotspotLayer), styled distinctly from
 *                        resource markers, with its own click -> Popup
 *                        (not routed through onMarkerClick/selection —
 *                        hotspots stay separate from application-managed
 *                        resources).
 */
import maplibregl, { GeoJSONSource, Map as MapLibreMap, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { HOTSPOT_MARKER_COLOR, HOTSPOT_MARKER_STROKE_COLOR } from "@constants/hotspot.constants";

import {
	HotspotMarker,
	MapAdapter,
	MapAdapterOptions,
	MapMarker
} from "./MapAdapter.types";

const SOURCE_ID = "resources";
const MARKER_LAYER_ID = "resources-markers";
const SELECTED_LAYER_ID = "resources-selected";

const HOTSPOT_SOURCE_ID = "hotspots";
const HOTSPOT_LAYER_ID = "hotspots-markers";

function toFeatureCollection(
	markers: MapMarker[]
): GeoJSON.FeatureCollection {
	return {
		type: "FeatureCollection",
		features: markers.map((marker) => ({
			type: "Feature",
			geometry: {
				type: "Point",
				// GeoJSON coordinate order is [longitude, latitude], the
				// reverse of the domain's Location{latitude, longitude}.
				coordinates: [marker.longitude, marker.latitude]
			},
			properties: { id: marker.id, color: marker.color }
		}))
	};
}

function toHotspotFeatureCollection(
	hotspots: HotspotMarker[]
): GeoJSON.FeatureCollection {
	return {
		type: "FeatureCollection",
		features: hotspots.map((hotspot) => ({
			type: "Feature",
			geometry: {
				type: "Point",
				coordinates: [hotspot.longitude, hotspot.latitude]
			},
			properties: {
				id: hotspot.id,
				province: hotspot.province,
				regency: hotspot.regency,
				observedDate: hotspot.observedDate,
				observedTime: hotspot.observedTime
			}
		}))
	};
}

/** Constructs a MapAdapter backed by a real MapLibre GL JS map instance. */
export function createMapLibreAdapter(): MapAdapter {
	let map: MapLibreMap | null = null;
	let selectedId: string | null = null;
	let pendingMarkers: MapMarker[] = [];
	let pendingHotspots: HotspotMarker[] = [];
	let hotspotPopup: Popup | null = null;

	function applySelection() {
		if (!map?.getLayer(SELECTED_LAYER_ID)) return;
		map.setFilter(SELECTED_LAYER_ID, [
			"==",
			["get", "id"],
			selectedId ?? ""
		]);
	}

	return {
		init(options: MapAdapterOptions) {
			map = new maplibregl.Map({
				container: options.container,
				style: {
					version: 8,
					sources: options.tileUrl
						? {
								"base-tiles": {
									type: "raster",
									tiles: [options.tileUrl],
									tileSize: 256
								}
							}
						: {},
					layers: options.tileUrl
						? [
								{
									id: "base-tiles-layer",
									type: "raster",
									source: "base-tiles"
								}
							]
						: []
				},
				center: options.center ?? [117, -2],
				zoom: options.zoom ?? 4
			});

			map.on("load", () => {
				if (!map) return;

				map.addSource(SOURCE_ID, {
					type: "geojson",
					data: toFeatureCollection(pendingMarkers)
				});
				map.addLayer({
					id: MARKER_LAYER_ID,
					type: "circle",
					source: SOURCE_ID,
					paint: { "circle-radius": 6, "circle-color": ["get", "color"] }
				});
				map.addLayer({
					id: SELECTED_LAYER_ID,
					type: "circle",
					source: SOURCE_ID,
					filter: ["==", ["get", "id"], ""],
					paint: { "circle-radius": 9, "circle-color": "#f97316" }
				});

				map.on("click", MARKER_LAYER_ID, (event) => {
					const id = event.features?.[0]?.properties?.id as
						| string
						| undefined;
					if (id) options.onMarkerClick?.(id);
				});
				map.on("mouseenter", MARKER_LAYER_ID, () => {
					if (map) map.getCanvas().style.cursor = "pointer";
				});
				map.on("mouseleave", MARKER_LAYER_ID, () => {
					if (map) map.getCanvas().style.cursor = "";
				});

				map.addSource(HOTSPOT_SOURCE_ID, {
					type: "geojson",
					data: toHotspotFeatureCollection(pendingHotspots)
				});
				map.addLayer({
					id: HOTSPOT_LAYER_ID,
					type: "circle",
					source: HOTSPOT_SOURCE_ID,
					paint: {
						"circle-radius": 5,
						"circle-color": HOTSPOT_MARKER_COLOR,
						"circle-stroke-width": 1.5,
						"circle-stroke-color": HOTSPOT_MARKER_STROKE_COLOR
					}
				});

				// Deliberately not wired through options.onMarkerClick/
				// selectMarker: a hotspot is never an application-managed
				// resource, so it gets its own self-contained popup instead
				// of joining the resource selection flow.
				map.on("click", HOTSPOT_LAYER_ID, (event) => {
					const feature = event.features?.[0];
					if (!map || !feature || feature.geometry.type !== "Point") return;

					const props = feature.properties ?? {};
					hotspotPopup?.remove();
					hotspotPopup = new maplibregl.Popup({ closeButton: true })
						.setLngLat(feature.geometry.coordinates as [number, number])
						.setHTML(
							`<strong>${props.province ?? "Unknown province"}</strong><br />` +
								`${props.regency ?? ""}<br />` +
								`${props.observedDate ?? ""} ${props.observedTime ?? ""}`
						)
						.addTo(map);
				});
				map.on("mouseenter", HOTSPOT_LAYER_ID, () => {
					if (map) map.getCanvas().style.cursor = "pointer";
				});
				map.on("mouseleave", HOTSPOT_LAYER_ID, () => {
					if (map) map.getCanvas().style.cursor = "";
				});
			});
		},

		setMarkers(markers: MapMarker[]) {
			pendingMarkers = markers;
			const source = map?.getSource(SOURCE_ID) as
				| GeoJSONSource
				| undefined;
			source?.setData(toFeatureCollection(markers));
		},

		selectMarker(id: string | null) {
			selectedId = id;
			applySelection();
		},

		setHotspots(hotspots: HotspotMarker[]) {
			pendingHotspots = hotspots;
			const source = map?.getSource(HOTSPOT_SOURCE_ID) as
				| GeoJSONSource
				| undefined;
			source?.setData(toHotspotFeatureCollection(hotspots));
		},

		toggleHotspotLayer(visible: boolean) {
			if (!map?.getLayer(HOTSPOT_LAYER_ID)) return;
			map.setLayoutProperty(
				HOTSPOT_LAYER_ID,
				"visibility",
				visible ? "visible" : "none"
			);
		},

		destroy() {
			hotspotPopup?.remove();
			hotspotPopup = null;
			map?.remove();
			map = null;
		}
	};
}
