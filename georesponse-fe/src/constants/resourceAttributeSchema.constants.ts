/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : The type-specific attribute fields the create/update
 *                forms render (DOMAIN_MODEL.md section 6.2), mirroring the
 *                backend's per-type attribute validators
 *                (georesponse-be/internal/resource/attribute_validator_*.go)
 *                so client-side validation matches what the backend will
 *                actually accept (TECHNOLOGY_SELECTION.md section 13.1) —
 *                non-authoritative; the backend remains the source of
 *                truth (API_CONTRACT.md section 12).
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
// See resourceApi.ts for why this is a relative import, not "@types/...".
import { ResourceType } from "../types/resource.types";

export interface ResourceAttributeField {
	key: string;
	label: string;
	kind: "text" | "number";
}

export const RESOURCE_ATTRIBUTE_SCHEMA: Record<ResourceType, ResourceAttributeField[]> = {
	VEHICLE: [
		{ key: "vehicleType", label: "Vehicle Type", kind: "text" },
		{ key: "capacity", label: "Capacity", kind: "number" }
	],
	FACILITY: [
		{ key: "facilityType", label: "Facility Type", kind: "text" },
		{ key: "capacity", label: "Capacity", kind: "number" }
	],
	EQUIPMENT: [
		{ key: "equipmentType", label: "Equipment Type", kind: "text" },
		{ key: "quantity", label: "Quantity", kind: "number" }
	],
	IOT_DEVICE: [{ key: "deviceType", label: "Device Type", kind: "text" }]
};
