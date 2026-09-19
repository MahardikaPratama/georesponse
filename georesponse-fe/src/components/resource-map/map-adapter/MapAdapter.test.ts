/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : Tests createMapLibreAdapter's hotspot layer at the
 *                boundary, with maplibre-gl mocked so the test doesn't
 *                need a real MapLibre instance, just the small surface
 *                the adapter uses (Map, addSource, addLayer, on,
 *                setLayoutProperty, remove, ...).
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added MockMap.doubleClickZoom/queryRenderedFeatures
 *                        stubs — init() now unconditionally calls
 *                        doubleClickZoom.disable() (the map-click-placement
 *                        double-click handler in MapAdapter.ts), which every
 *                        existing test's init() call would otherwise throw
 *                        on since the mock didn't have that property.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMapLibreAdapter } from "./MapAdapter";

interface MockLayer {
	id: string;
	[key: string]: unknown;
}

interface MockSource {
	data: GeoJSON.FeatureCollection;
}

const { MockMap, MockPopup, instances } = vi.hoisted(() => {
	class MockMap {
		static instances: MockMap[] = [];
		handlers: Record<string, ((payload?: unknown) => void)[]> = {};
		sources: Record<string, MockSource> = {};
		layers: Record<string, MockLayer> = {};
		layoutProps: Record<string, Record<string, string>> = {};

		constructor(public options: Record<string, unknown>) {
			MockMap.instances.push(this);
		}

		on(event: string, a: unknown, b?: unknown) {
			const isLayerScoped = typeof b === "function";
			const key = isLayerScoped ? `${event}:${a as string}` : event;
			const cb = (isLayerScoped ? b : a) as (payload?: unknown) => void;
			(this.handlers[key] ??= []).push(cb);
			if (event === "load") cb();
		}

		emit(key: string, payload?: unknown) {
			(this.handlers[key] ?? []).forEach((cb) => cb(payload));
		}

		addSource(id: string, source: MockSource) {
			this.sources[id] = { data: source.data };
		}

		getSource(id: string) {
			if (!this.sources[id]) return undefined;
			return {
				setData: (data: GeoJSON.FeatureCollection) => {
					this.sources[id].data = data;
				}
			};
		}

		addLayer(layer: MockLayer) {
			this.layers[layer.id] = layer;
		}

		getLayer(id: string) {
			return this.layers[id];
		}

		setFilter() {
			/* not exercised by these tests */
		}

		setLayoutProperty(id: string, prop: string, value: string) {
			(this.layoutProps[id] ??= {})[prop] = value;
		}

		getCanvas() {
			return { style: {} };
		}

		featuresAtPoint: unknown[] = [];

		queryRenderedFeatures() {
			return this.featuresAtPoint;
		}

		doubleClickZoom = { disable: vi.fn() };

		remove() {
			/* no-op */
		}
	}

	class MockPopup {
		lngLat: [number, number] | null = null;
		html = "";
		setLngLat(lngLat: [number, number]) {
			this.lngLat = lngLat;
			return this;
		}
		setHTML(html: string) {
			this.html = html;
			return this;
		}
		addTo() {
			return this;
		}
		remove() {
			/* no-op */
		}
	}

	return { MockMap, MockPopup, instances: MockMap.instances };
});

vi.mock("maplibre-gl", () => ({
	default: { Map: MockMap, Popup: MockPopup },
	Map: MockMap,
	Popup: MockPopup
}));
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

beforeEach(() => {
	instances.length = 0;
});

describe("createMapLibreAdapter — hotspot layer", () => {
	it("adds a hotspot source/layer on init, independent of the resource layer", () => {
		const adapter = createMapLibreAdapter();
		adapter.init({ container: document.createElement("div"), tileUrl: "" });

		const map = instances[0];
		expect(map.layers["hotspots-markers"]).toBeDefined();
		expect(map.layers["resources-markers"]).toBeDefined();
	});

	it("setHotspots builds a GeoJSON feature collection in [longitude, latitude] order", () => {
		const adapter = createMapLibreAdapter();
		adapter.init({ container: document.createElement("div"), tileUrl: "" });

		adapter.setHotspots([
			{
				id: "1",
				latitude: -6.2,
				longitude: 106.8,
				province: "DKI JAKARTA",
				regency: "JAKARTA PUSAT",
				observedDate: "2026-09-19",
				observedTime: "05:00"
			}
		]);

		const map = instances[0];
		const features = map.sources["hotspots"].data.features;
		expect(features).toHaveLength(1);
		expect(features[0].geometry).toEqual({
			type: "Point",
			coordinates: [106.8, -6.2]
		});
	});

	it("toggleHotspotLayer sets the layer's visibility layout property", () => {
		const adapter = createMapLibreAdapter();
		adapter.init({ container: document.createElement("div"), tileUrl: "" });

		adapter.toggleHotspotLayer(false);
		expect(instances[0].layoutProps["hotspots-markers"].visibility).toBe("none");

		adapter.toggleHotspotLayer(true);
		expect(instances[0].layoutProps["hotspots-markers"].visibility).toBe("visible");
	});

	it("does not route a hotspot click through onMarkerClick", () => {
		const onMarkerClick = vi.fn();
		const adapter = createMapLibreAdapter();
		adapter.init({
			container: document.createElement("div"),
			tileUrl: "",
			onMarkerClick
		});

		instances[0].emit("click:hotspots-markers", {
			features: [
				{
					geometry: { type: "Point", coordinates: [106.8, -6.2] },
					properties: {
						id: "1",
						province: "DKI JAKARTA",
						regency: "JAKARTA PUSAT",
						observedDate: "2026-09-19",
						observedTime: "05:00"
					}
				}
			]
		});

		expect(onMarkerClick).not.toHaveBeenCalled();
	});

	it("disables the default double-click-zoom interaction on init", () => {
		const adapter = createMapLibreAdapter();
		adapter.init({ container: document.createElement("div"), tileUrl: "" });

		expect(instances[0].doubleClickZoom.disable).toHaveBeenCalled();
	});

	it("fires onMapDoubleClick with the clicked lat/lng when nothing was hit", () => {
		const onMapDoubleClick = vi.fn();
		const adapter = createMapLibreAdapter();
		adapter.init({
			container: document.createElement("div"),
			tileUrl: "",
			onMapDoubleClick
		});

		instances[0].emit("dblclick", {
			point: { x: 10, y: 20 },
			lngLat: { lat: -6.2, lng: 106.8 }
		});

		expect(onMapDoubleClick).toHaveBeenCalledWith({ latitude: -6.2, longitude: 106.8 });
	});

	it("does not fire onMapDoubleClick when the double-click landed on a marker/hotspot", () => {
		const onMapDoubleClick = vi.fn();
		const adapter = createMapLibreAdapter();
		adapter.init({
			container: document.createElement("div"),
			tileUrl: "",
			onMapDoubleClick
		});

		instances[0].featuresAtPoint = [{ properties: { id: "res-001" } }];
		instances[0].emit("dblclick", {
			point: { x: 10, y: 20 },
			lngLat: { lat: -6.2, lng: 106.8 }
		});

		expect(onMapDoubleClick).not.toHaveBeenCalled();
	});
});
