/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Request/response shapes for the /api/v1/resources
 *                endpoints.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
// See resourceApi.ts for why this is a relative import, not "@types/...".
import { Location, ResourceStatus, ResourceType } from "../../types/resource.types";

export interface ResourceFilters {
	search?: string;
	type?: ResourceType;
	status?: ResourceStatus;
	page?: number;
	pageSize?: number;
}

export interface CreateResourceRequest {
	id: string;
	name: string;
	type: ResourceType;
	status: ResourceStatus;
	attributes: Record<string, unknown>;
	location: Location;
}

export interface UpdateResourceRequest {
	name: string;
	type: ResourceType;
	attributes: Record<string, unknown>;
}

export interface ChangeResourceStatusRequest {
	status: ResourceStatus;
}

export interface RelocateResourceRequest {
	latitude: number;
	longitude: number;
}

export type ResourceHistoryType = "status" | "location" | "change";

export interface ResourceHistoryFilters {
	type?: ResourceHistoryType;
	page?: number;
	pageSize?: number;
}

export interface ResourceChange {
	field: string;
	before: unknown;
	after: unknown;
}

export interface StatusHistoryEntry {
	id: string;
	resourceId: string;
	previousStatus: ResourceStatus;
	newStatus: ResourceStatus;
	changedAt: string;
	changedBy?: string;
}

export interface LocationHistoryEntry {
	id: string;
	resourceId: string;
	previousLocation: Location;
	newLocation: Location;
	changedAt: string;
	changedBy?: string;
}

export interface ChangeHistoryEntry {
	id: string;
	resourceId: string;
	changes: ResourceChange[];
	changedAt: string;
	changedBy?: string;
}

export interface ResourceHistory {
	statusHistory: StatusHistoryEntry[];
	locationHistory: LocationHistoryEntry[];
	changeHistory: ChangeHistoryEntry[];
}
