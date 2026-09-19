/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Data-access functions for /api/v1/resources
 *                (API_CONTRACT.md sections 6-9). Called only from
 *                hooks — never directly from a component.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { httpClient } from "@api/httpClient";
import { DataEnvelope, ListEnvelope } from "@api/httpClient.types";
import { Resource } from "@types/resource.types";

import {
	ChangeResourceStatusRequest,
	CreateResourceRequest,
	RelocateResourceRequest,
	ResourceFilters,
	ResourceHistory,
	ResourceHistoryFilters,
	UpdateResourceRequest
} from "./resourceApi.types";

export const resourceApi = {
	list(filters: ResourceFilters): Promise<ListEnvelope<Resource>> {
		return httpClient.getList<Resource>("/resources", { ...filters });
	},

	get(id: string): Promise<DataEnvelope<Resource>> {
		return httpClient.get<Resource>(`/resources/${id}`);
	},

	create(payload: CreateResourceRequest): Promise<DataEnvelope<Resource>> {
		return httpClient.post<Resource>("/resources", payload);
	},

	update(
		id: string,
		payload: UpdateResourceRequest
	): Promise<DataEnvelope<Resource>> {
		return httpClient.put<Resource>(`/resources/${id}`, payload);
	},

	remove(id: string): Promise<void> {
		return httpClient.delete(`/resources/${id}`);
	},

	changeStatus(
		id: string,
		payload: ChangeResourceStatusRequest
	): Promise<DataEnvelope<Resource>> {
		return httpClient.patch<Resource>(`/resources/${id}/status`, payload);
	},

	relocate(
		id: string,
		payload: RelocateResourceRequest
	): Promise<DataEnvelope<Resource>> {
		return httpClient.patch<Resource>(`/resources/${id}/location`, payload);
	},

	history(
		id: string,
		filters: ResourceHistoryFilters = {}
	): Promise<DataEnvelope<ResourceHistory>> {
		return httpClient.get<ResourceHistory>(`/resources/${id}/history`, {
			...filters
		});
	}
};
