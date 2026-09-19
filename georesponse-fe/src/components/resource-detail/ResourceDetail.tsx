/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
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
 */
import React from "react";

import { ApiError } from "@api/httpClient.types";
import { RESOURCE_STATUS_CONFIG, RESOURCE_TYPE_LABEL } from "@constants/resourceStatus.constants";
import { useResource } from "@hooks/useResource";
import { getApiErrorMessage } from "@utils/apiErrorMessage";

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

function ResourceDetail({ resourceId, onClose }: ResourceDetailProps) {
	const { data, status, error } = useResource(resourceId);

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
				<CloseButton onClose={onClose} />
			</div>

			<div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
				<div>
					<p className="text-xs text-neutral-3">Type</p>
					<p>{RESOURCE_TYPE_LABEL[resource.type]}</p>
				</div>
				<div>
					<p className="text-xs text-neutral-3">Status</p>
					<p className="flex items-center gap-1.5">
						<span
							data-testid="status-color-box"
							className={`h-2.5 w-2.5 rounded-sm bg-indicator-${statusConfig.indicatorColor}`}
						/>
						{statusConfig.label}
					</p>
				</div>
				<div>
					<p className="text-xs text-neutral-3">Location</p>
					<p>
						{resource.location.latitude.toFixed(4)}, {resource.location.longitude.toFixed(4)}
					</p>
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
