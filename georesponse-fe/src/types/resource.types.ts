/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Shared Resource domain type, mirroring the backend's
 *                resource.Resource shape.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */

export type ResourceType = "VEHICLE" | "FACILITY" | "EQUIPMENT" | "IOT_DEVICE";

export type ResourceStatus =
	| "AVAILABLE"
	| "IN_USE"
	| "MAINTENANCE"
	| "UNAVAILABLE";

export interface Location {
	latitude: number;
	longitude: number;
}

export interface Resource {
	id: string;
	name: string;
	type: ResourceType;
	status: ResourceStatus;
	attributes: Record<string, unknown>;
	location: Location;
}
