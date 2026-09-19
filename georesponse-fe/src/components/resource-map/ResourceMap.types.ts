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
 *                        (FRONTEND_UI_UX.md section 3: list/map selection
 *                        is shared in both directions).
 */
import { MapMarker } from "./map-adapter/MapAdapter.types";

export interface ResourceMapProps {
	markers?: MapMarker[];
	selectedResourceId?: string | null;
	onResourceSelect?: (resourceId: string) => void;
}
