/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Local types for ResourceList.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added filters, so the list queries the same
 *                        search/type/status combination ResourceFilterBar
 *                        and the map are showing.
 */
import { ResourceFilters } from "@api/resources/resourceApi.types";

export interface ResourceListProps {
	filters?: ResourceFilters;
	selectedResourceId?: string | null;
	onSelectResource?: (resourceId: string) => void;
}
