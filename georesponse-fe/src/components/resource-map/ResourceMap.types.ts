/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Local types for ResourceMap.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { MapMarker } from "./map-adapter/MapAdapter.types";

export interface ResourceMapProps {
	markers?: MapMarker[];
	onResourceSelect?: (resourceId: string) => void;
}
