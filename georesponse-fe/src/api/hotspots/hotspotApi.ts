/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Data-access functions for /api/v1/hotspots (BMKG
 *                GeoHotspot situational-awareness overlay). Called only
 *                from hooks — never directly from a component.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { httpClient } from "@api/httpClient";
import { ListEnvelope } from "@api/httpClient.types";
// See resourceApi.ts for why this is a relative import, not "@types/...".
import { Hotspot } from "../../types/hotspot.types";

import { HotspotFilters } from "./hotspotApi.types";

export const hotspotApi = {
	list(filters: HotspotFilters = {}): Promise<ListEnvelope<Hotspot>> {
		return httpClient.getList<Hotspot>("/hotspots", { ...filters });
	}
};
