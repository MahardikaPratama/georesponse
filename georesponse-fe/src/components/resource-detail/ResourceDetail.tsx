/*
 * Author       : Mahardika Pratama
 * Version      : 1.7.0
 * Created Date : 2026-09-19
 * Description  : The resource detail panel (FR-003, FR-021, UC-02): shows
 *                the selected resource's identity, type, attributes,
 *                status, and location, with loading/error/"not found"
 *                states driven by useResource's query status. The
 *                status-change, edit, delete, and history controls were
 *                added in later revisions, listed below. `updatedAt` is
 *                left out for now — the backend's resource response
 *                doesn't include it yet, even though it belongs in the
 *                displayed fields; showing it is blocked on that gap,
 *                not on this panel.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added the edit action, opening UpdateResourceModal
 *                        via onEdit.
 * - 1.2.0 (2026-09-19): Replaced the static status display with a
 *                        status-change control: a Dropdown constrained to
 *                        the four valid statuses, driving
 *                        useChangeResourceStatus directly, with an inline
 *                        error on failure. Its invalidation of
 *                        resourceKeys.lists() and the map's shared
 *                        useResources call is what makes the status badge
 *                        update across list, detail, and map views.
 * - 1.3.0 (2026-09-19): Added the relocate control to the Location field.
 * - 1.4.0 (2026-09-19): Added the delete action, opening
 *                        DeleteResourceConfirmation via onDelete.
 * - 1.5.0 (2026-09-19): Added the history section, toggled open/closed as
 *                        local client state.
 * - 1.6.0 (2026-09-19): Restyled as a floating card anchored to the map's
 *                        top-right corner instead of a full-width bottom
 *                        bar (the "side panel" layout option) — the
 *                        bottom-bar layout capped the panel at a shallow
 *                        max-height, which made the history section (the
 *                        tallest content) cramped and put it below the
 *                        fold. AppShell now renders this inside `main`,
 *                        so the card positions relative to the map only,
 *                        not the resource list.
 */
import React, { useState } from "react";

import { ApiError } from "@api/httpClient.types";
import Dropdown from "@common/dropdowns/dropdown/Dropdown";
import {
	RESOURCE_STATUS_CONFIG,
	RESOURCE_STATUS_OPTIONS,
	RESOURCE_TYPE_LABEL
} from "@constants/resourceStatus.constants";
import { useChangeResourceStatus } from "@hooks/useChangeResourceStatus";
import { useResource } from "@hooks/useResource";
import RelocateResourceControl from "@components/resource-relocate-form/RelocateResourceControl";
import ResourceHistoryView from "@components/resource-history/ResourceHistoryView";
import { getApiErrorMessage } from "@utils/apiErrorMessage";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { ResourceStatus } from "../../types/resource.types";

import { ResourceDetailProps } from "./ResourceDetail.types";

/** "vehicleType" -> "Vehicle Type". Attribute keys have no fixed display label. */
function humanizeAttributeKey(key: string): string {
	const withSpaces = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
	return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function CloseButton({ onClose }: { onClose?: () => void }) {
	return (
		<button
			type="button"
			onClick={onClose}
			aria-label="Close resource detail"
			className="px-2 py-1 text-sm rounded-md bg-white/10 hover:bg-white/20"
		>
			✕
		</button>
	);
}

function ResourceDetail({ resourceId, onClose, onEdit, onDelete }: ResourceDetailProps) {
	const { data, status, error } = useResource(resourceId);
	const changeStatus = useChangeResourceStatus(resourceId);
	const [showHistory, setShowHistory] = useState(false);

	const cardClassName =
		"absolute right-4 top-4 bottom-4 z-10 flex w-96 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-lg border border-white/10 bg-background-100-1 shadow-xl";

	if (status === "pending") {
		return (
			<div
				className={`${cardClassName} items-center justify-between p-4`}
				data-testid="resource-detail-skeleton"
			>
				<div className="w-1/3 rounded h-5 animate-pulse bg-white/5" />
				<CloseButton onClose={onClose} />
			</div>
		);
	}

	if (status === "error") {
		const notFound = error instanceof ApiError && error.code === "RESOURCE_NOT_FOUND";
		return (
			<div
				className={`${cardClassName} justify-start gap-3 p-4 text-sm`}
				role="alert"
			>
				<div className="flex items-start justify-between gap-3">
					<p>
						{notFound
							? "This resource could not be found. It may have been deleted."
							: getApiErrorMessage(error)}
					</p>
					<CloseButton onClose={onClose} />
				</div>
			</div>
		);
	}

	const resource = data.data;
	const statusConfig = RESOURCE_STATUS_CONFIG[resource.status];
	const attributeEntries = Object.entries(resource.attributes);

	return (
		<div className={cardClassName}>
			<div className="flex items-start justify-between gap-3 p-4 border-b shrink-0 border-white/10">
				<div>
					<h2 className="text-lg font-bold text-white">{resource.name}</h2>
					<p className="text-xs text-neutral-3">{resource.id}</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onEdit}
						className="px-2 py-1 text-sm rounded-md bg-white/10 hover:bg-white/20"
					>
						Edit
					</button>
					<button
						type="button"
						onClick={() => onDelete?.(resource)}
						className="px-2 py-1 text-sm text-white rounded-md bg-error-4 hover:bg-error-4/80"
					>
						Delete
					</button>
					<CloseButton onClose={onClose} />
				</div>
			</div>

			<div className="flex flex-col flex-1 gap-4 p-4 overflow-y-auto">
				<div className="grid grid-cols-2 gap-3 text-sm">
					<div>
						<p className="text-xs text-neutral-3">Type</p>
						<p>{RESOURCE_TYPE_LABEL[resource.type]}</p>
					</div>
					<div>
						<p className="text-xs text-neutral-3">Status</p>
						<div className="flex items-center gap-1.5">
							<span
								data-testid="status-color-box"
								className={`h-2.5 w-2.5 shrink-0 rounded-sm bg-indicator-${statusConfig.indicatorColor}`}
							/>
							<Dropdown
								value={resource.status}
								options={RESOURCE_STATUS_OPTIONS}
								disabled={changeStatus.isPending}
								inputHeight="h-7"
								fontSize="text-sm"
								onChange={(value) =>
									changeStatus.mutate({ status: value as ResourceStatus })
								}
							/>
						</div>
						{changeStatus.isError && (
							<p role="alert" className="mt-1 text-xs text-error-4">
								{getApiErrorMessage(changeStatus.error)}
							</p>
						)}
					</div>
					<div className="col-span-2">
						<p className="text-xs text-neutral-3">Location</p>
						<RelocateResourceControl resourceId={resource.id} location={resource.location} />
					</div>
				</div>

				{attributeEntries.length > 0 && (
					<div>
						<p className="mb-1 text-xs text-neutral-3">Attributes</p>
						<dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
							{attributeEntries.map(([key, value]) => (
								<div key={key}>
									<dt className="text-xs text-neutral-3">{humanizeAttributeKey(key)}</dt>
									<dd>{String(value)}</dd>
								</div>
							))}
						</dl>
					</div>
				)}

				<div className="pt-3 border-t border-white/10">
					<button
						type="button"
						onClick={() => setShowHistory((current) => !current)}
						className="text-xs text-primary-50 hover:underline"
					>
						{showHistory ? "Hide history" : "Show history"}
					</button>
					{showHistory && (
						<div className="mt-2">
							<ResourceHistoryView resourceId={resource.id} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default ResourceDetail;
