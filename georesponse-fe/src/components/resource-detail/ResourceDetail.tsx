/*
 * Author       : Mahardika Pratama
 * Version      : 1.4.0
 * Created Date : 2026-09-19
 * Description  : The resource detail panel (FR-003, FR-021, UC-02): shows
 *                the selected resource's identity, type, attributes,
 *                status, and location (FRONTEND_UI_UX.md section 5), with
 *                loading/error/"not found" states driven by useResource's
 *                query status (section 8). The status-change, edit,
 *                delete, and history controls the same doc section
 *                describes are added by their own Phase 6 sub-phases
 *                (9.5-9.9). `updatedAt` is left out for now — the backend's
 *                resource response doesn't include it yet, even though
 *                DATA_CONTRACT.md section 3.1 and this doc list it; showing
 *                it is blocked on that gap, not on this panel.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added the edit action (Phase 6 section 9.5),
 *                        opening UpdateResourceModal via onEdit.
 * - 1.2.0 (2026-09-19): Replaced the static status display with the
 *                        status-change control (Phase 6 section 9.6): a
 *                        Dropdown constrained to the four valid statuses,
 *                        driving useChangeResourceStatus directly, with an
 *                        inline error on failure. Its invalidation of
 *                        resourceKeys.lists() and the map's shared
 *                        useResources call is what makes the status badge
 *                        update across list, detail, and map views.
 * - 1.3.0 (2026-09-19): Added the relocate control (Phase 6 section 9.7)
 *                        to the Location field.
 * - 1.4.0 (2026-09-19): Added the delete action (Phase 6 section 9.8),
 *                        opening DeleteResourceConfirmation via onDelete.
 */
import React from "react";

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
import { getApiErrorMessage } from "@utils/apiErrorMessage";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { ResourceStatus } from "../../types/resource.types";

import { ResourceDetailProps } from "./ResourceDetail.types";

/** "vehicleType" -> "Vehicle Type". Attribute keys have no fixed display label per DATA_CONTRACT.md section 3.4. */
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

	if (status === "pending") {
		return (
			<div
				className="flex items-center justify-between p-4 border-t border-white/10"
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
				className="flex items-center justify-between gap-3 p-4 text-sm border-t border-white/10"
				role="alert"
			>
				<p>
					{notFound
						? "This resource could not be found. It may have been deleted."
						: getApiErrorMessage(error)}
				</p>
				<CloseButton onClose={onClose} />
			</div>
		);
	}

	const resource = data.data;
	const statusConfig = RESOURCE_STATUS_CONFIG[resource.status];
	const attributeEntries = Object.entries(resource.attributes);

	return (
		<div className="flex flex-col gap-3 p-4 border-t max-h-64 overflow-y-auto border-white/10">
			<div className="flex items-start justify-between gap-3">
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
						className="px-2 py-1 text-sm rounded-md bg-error-4/20 text-error-4 hover:bg-error-4/30"
					>
						Delete
					</button>
					<CloseButton onClose={onClose} />
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
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
				<div>
					<p className="text-xs text-neutral-3">Location</p>
					<RelocateResourceControl resourceId={resource.id} location={resource.location} />
				</div>
			</div>

			{attributeEntries.length > 0 && (
				<div>
					<p className="mb-1 text-xs text-neutral-3">Attributes</p>
					<dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm sm:grid-cols-4">
						{attributeEntries.map(([key, value]) => (
							<div key={key}>
								<dt className="text-xs text-neutral-3">{humanizeAttributeKey(key)}</dt>
								<dd>{String(value)}</dd>
							</div>
						))}
					</dl>
				</div>
			)}
		</div>
	);
}

export default ResourceDetail;
