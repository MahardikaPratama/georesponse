/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Local types for ResourceFilterBar.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { ResourceFilters } from "@api/resources/resourceApi.types";

export interface ResourceFilterBarProps {
	filters: ResourceFilters;
	onFiltersChange: (filters: ResourceFilters) => void;
}
