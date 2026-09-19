/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : The Resource.status -> label/color mapping shared by every
 *                view that displays status (list row, map marker, detail
 *                panel), per FRONTEND_UI_UX.md section 7 — "the same color
 *                mapping is used in three places... so a status never means
 *                one color in one view and a different color elsewhere."
 *                `indicatorColor` drives StatusIndicator; `hex` is for
 *                contexts that need a raw color value (map marker paint).
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import colors from "@utils/colors";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { ResourceStatus, ResourceType } from "../types/resource.types";

export interface ResourceStatusConfig {
	label: string;
	indicatorColor: "active" | "info" | "warning" | "error";
	hex: string;
}

export const RESOURCE_STATUS_CONFIG: Record<ResourceStatus, ResourceStatusConfig> = {
	AVAILABLE: {
		label: "Available",
		indicatorColor: "active",
		hex: colors.indicator.active
	},
	IN_USE: {
		label: "In Use",
		indicatorColor: "info",
		hex: colors.indicator.info
	},
	MAINTENANCE: {
		label: "Maintenance",
		indicatorColor: "warning",
		hex: colors.indicator.warning
	},
	UNAVAILABLE: {
		label: "Unavailable",
		indicatorColor: "error",
		hex: colors.indicator.error
	}
};

export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
	VEHICLE: "Vehicle",
	FACILITY: "Facility",
	EQUIPMENT: "Equipment",
	IOT_DEVICE: "IoT Device"
};
