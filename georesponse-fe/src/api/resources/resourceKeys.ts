/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : TanStack Query key factory for resources, per
 *                FRONTEND_STATE.md section 5. Keyed on domain concept
 *                ("resources"), not the HTTP path, so invalidation stays
 *                correct regardless of how a query's data was fetched.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { ResourceFilters } from "./resourceApi.types";

export const resourceKeys = {
	all: ["resources"] as const,
	lists: () => [...resourceKeys.all, "list"] as const,
	list: (filters: ResourceFilters) =>
		[...resourceKeys.lists(), filters] as const,
	details: () => [...resourceKeys.all, "detail"] as const,
	detail: (id: string) => [...resourceKeys.details(), id] as const,
	history: (id: string) => [...resourceKeys.detail(id), "history"] as const
};
