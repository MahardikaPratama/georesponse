/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : The resource list panel (FR-002, FR-020, UC-01, UC-05):
 *                identity, type, status, and a location cue per row, with
 *                loading/error/empty states driven by useResources' query
 *                status. Search/filter controls were added in a later
 *                revision.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Queries by `filters` and distinguishes "no
 *                        resources exist" from "no results match the
 *                        current filters" (UC-03/UC-04 alternative
 *                        flows).
 */
import React from "react";

import { RESOURCE_STATUS_CONFIG, RESOURCE_TYPE_LABEL } from "@constants/resourceStatus.constants";
import { useResources } from "@hooks/useResources";
import { getApiErrorMessage } from "@utils/apiErrorMessage";
import { cn } from "@utils/cn";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { Resource } from "../../types/resource.types";

import { ResourceListProps } from "./ResourceList.types";

function formatLocation(resource: Resource): string {
	return `${resource.location.latitude.toFixed(4)}, ${resource.location.longitude.toFixed(4)}`;
}

function ResourceListSkeleton() {
	return (
		<ul aria-hidden="true" data-testid="resource-list-skeleton" className="flex flex-col gap-2">
			{Array.from({ length: 6 }, (_, index) => (
				<li
					key={index}
					className="h-16 rounded-md animate-pulse bg-white/5"
				/>
			))}
		</ul>
	);
}

function ResourceList({
	filters = {},
	selectedResourceId = null,
	onSelectResource
}: ResourceListProps) {
	const { data, status, error, refetch, isFetching } = useResources(filters);

	if (status === "pending") {
		return <ResourceListSkeleton />;
	}

	if (status === "error") {
		return (
			<div className="flex flex-col items-start gap-3 p-4 text-sm rounded-md bg-error-4/40" role="alert">
				<p>{getApiErrorMessage(error)}</p>
				<button
					type="button"
					onClick={() => refetch()}
					disabled={isFetching}
					className="px-3 py-1 text-xs rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-50"
				>
					{isFetching ? "Retrying…" : "Retry"}
				</button>
			</div>
		);
	}

	const resources = data.data;

	if (resources.length === 0) {
		const hasActiveFilters = Boolean(filters.search || filters.type || filters.status);
		return (
			<p className="p-4 text-sm text-neutral-3">
				{hasActiveFilters
					? "No resources match the current filters."
					: "No resources exist yet."}
			</p>
		);
	}

	return (
		<ul className="flex flex-col gap-2" aria-label="Resources">
			{resources.map((resource) => {
				const statusConfig = RESOURCE_STATUS_CONFIG[resource.status];
				const selected = resource.id === selectedResourceId;

				return (
					<li key={resource.id}>
						<button
							type="button"
							onClick={() => onSelectResource?.(resource.id)}
							aria-pressed={selected}
							className={cn(
								"flex w-full flex-col gap-1 rounded-md border px-3 py-2 text-left transition-colors",
								selected
									? "border-primary-20 bg-white/10"
									: "border-transparent bg-white/5 hover:bg-white/10"
							)}
						>
							<div className="flex items-center justify-between gap-2">
								<span className="font-medium text-white truncate">{resource.name}</span>
								<span className="flex items-center gap-1.5 text-xs text-neutral-3 shrink-0">
									<span
										data-testid="status-color-box"
										className={`h-2.5 w-2.5 rounded-sm bg-indicator-${statusConfig.indicatorColor}`}
									/>
									{statusConfig.label}
								</span>
							</div>
							<div className="flex items-center justify-between gap-2 text-xs text-neutral-3">
								<span>{RESOURCE_TYPE_LABEL[resource.type]}</span>
								<span>{formatLocation(resource)}</span>
							</div>
						</button>
					</li>
				);
			})}
		</ul>
	);
}

export default ResourceList;
