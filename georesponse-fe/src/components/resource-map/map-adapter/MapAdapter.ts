/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
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
 */
import maplibregl, { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { MapAdapter, MapAdapterOptions, MapMarker } from "./MapAdapter.types";

const SOURCE_ID = "resources";
const MARKER_LAYER_ID = "resources-markers";
const SELECTED_LAYER_ID = "resources-selected";

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
			properties: { id: marker.id }
		}))
	};
}

/** Constructs a MapAdapter backed by a real MapLibre GL JS map instance. */
export function createMapLibreAdapter(): MapAdapter {
	let map: MapLibreMap | null = null;
	let selectedId: string | null = null;
	let pendingMarkers: MapMarker[] = [];

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
					paint: { "circle-radius": 6, "circle-color": "#3b82f6" }
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

		destroy() {
			map?.remove();
			map = null;
		}
	};
}
