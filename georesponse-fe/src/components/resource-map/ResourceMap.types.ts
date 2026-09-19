/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : Local types for ResourceMap.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added selectedResourceId, so a selection made in
 *                        ResourceList also highlights the matching marker
 *                        (list/map selection is shared in both
 *                        directions).
 * - 1.2.0 (2026-09-19): Added hotspots/hotspotLayerVisible for the BMKG
 *                        situational-awareness overlay.
 * - 1.3.0 (2026-09-19): Added onMapDoubleClick, passed through to the
 *                        adapter's onMapDoubleClick (map-click placement).
 */
import { HotspotMarker, MapMarker } from "./map-adapter/MapAdapter.types";

export interface ResourceMapProps {
	markers?: MapMarker[];
	selectedResourceId?: string | null;
	onResourceSelect?: (resourceId: string) => void;
	hotspots?: HotspotMarker[];
	hotspotLayerVisible?: boolean;
	onMapDoubleClick?: (location: { latitude: number; longitude: number }) => void;
}
