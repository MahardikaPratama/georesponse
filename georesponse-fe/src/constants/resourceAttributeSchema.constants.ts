/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : The type-specific attribute fields the create/update
 *                forms render, mirroring the
 *                backend's per-type attribute validators
 *                (georesponse-be/internal/resource/attribute_validator_*.go)
 *                so client-side validation matches what the backend will
 *                actually accept — non-authoritative; the backend remains
 *                the source of truth.
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
	placeholder: string;
}

export const RESOURCE_ATTRIBUTE_SCHEMA: Record<ResourceType, ResourceAttributeField[]> = {
	VEHICLE: [
		{ key: "vehicleType", label: "Vehicle Type", kind: "text", placeholder: "e.g. Ambulance" },
		{ key: "capacity", label: "Capacity", kind: "number", placeholder: "e.g. 4" }
	],
	FACILITY: [
		{ key: "facilityType", label: "Facility Type", kind: "text", placeholder: "e.g. Shelter" },
		{ key: "capacity", label: "Capacity", kind: "number", placeholder: "e.g. 200" }
	],
	EQUIPMENT: [
		{
			key: "equipmentType",
			label: "Equipment Type",
			kind: "text",
			placeholder: "e.g. Generator"
		},
		{ key: "quantity", label: "Quantity", kind: "number", placeholder: "e.g. 10" }
	],
	IOT_DEVICE: [
		{ key: "deviceType", label: "Device Type", kind: "text", placeholder: "e.g. Water Level Sensor" }
	]
};
