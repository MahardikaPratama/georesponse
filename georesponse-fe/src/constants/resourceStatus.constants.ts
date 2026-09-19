/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
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
 * - 1.1.0 (2026-09-19): Added RESOURCE_STATUS_OPTIONS/RESOURCE_TYPE_OPTIONS
 *                        — the Dropdown-ready option lists ResourceFilterBar,
 *                        ResourceCreateForm, ResourceUpdateForm, and now
 *                        the status-change control in ResourceDetail
 *                        (Phase 6 section 9.6) all need, each rebuilding
 *                        the same `Object.keys(...).map(...)` before this.
 */
import type { DropdownOption } from "@common/dropdowns/dropdown/Dropdown";

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

export const RESOURCE_STATUS_OPTIONS: DropdownOption[] = (
	Object.keys(RESOURCE_STATUS_CONFIG) as ResourceStatus[]
).map((status) => ({ value: status, label: RESOURCE_STATUS_CONFIG[status].label }));

export const RESOURCE_TYPE_OPTIONS: DropdownOption[] = (
	Object.keys(RESOURCE_TYPE_LABEL) as ResourceType[]
).map((type) => ({ value: type, label: RESOURCE_TYPE_LABEL[type] }));
