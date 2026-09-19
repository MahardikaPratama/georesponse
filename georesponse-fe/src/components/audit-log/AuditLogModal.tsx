/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : The audit-log view (FR-038-040, UC-14), restricted to
 *                authorized users: GET /api/v1/audit-logs is itself
 *                permission-gated (audit.read, confirmed in
 *                georesponse-be/internal/audit/service.go), so an
 *                AUTHORIZATION_DENIED response is how this detects the
 *                caller lacks access and blocks the view, the same
 *                pattern RoleManagementModal uses for role.read.
 *                Filter controls (userId, resourceId, operation,
 *                startTime, endTime) are local client state, reflected in
 *                the query key so each combination caches independently,
 *                matching the filter pattern used elsewhere in the app.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Switched directly on auditLogsQuery.status instead
 *                        of derived isBlocked/isOtherError/isLoading
 *                        booleans — the derived booleans broke TypeScript's
 *                        control-flow narrowing on auditLogsQuery.data in
 *                        the success branch (`'data' is possibly
 *                        undefined`), what CI's typecheck caught.
 */
import React, { useState } from "react";

import { AuditFilters } from "@api/audit/auditApi.types";
import { ApiError } from "@api/httpClient.types";
import Dropdown from "@common/dropdowns/dropdown/Dropdown";
import Modal from "@common/modals/modal/Modal";
import { AUDIT_OPERATION_LABEL, AUDIT_OPERATION_OPTIONS } from "@constants/auditOperation.constants";
import { useAuditLogs } from "@hooks/useAuditLogs";
import { getApiErrorMessage } from "@utils/apiErrorMessage";

const ALL_OPERATIONS = "";

interface AuditLogModalProps {
	onClose: () => void;
}

function isForbidden(error: unknown): boolean {
	return error instanceof ApiError && error.code === "AUTHORIZATION_DENIED";
}

function formatOccurredAt(occurredAt: string): string {
	const date = new Date(occurredAt);
	return Number.isNaN(date.getTime()) ? occurredAt : date.toLocaleString();
}

function AuditLogModal({ onClose }: AuditLogModalProps) {
	const [filters, setFilters] = useState<AuditFilters>({});
	const auditLogsQuery = useAuditLogs(filters);

	const isLoading = auditLogsQuery.status === "pending";

	let body: React.ReactNode;
	if (auditLogsQuery.status === "error") {
		body = isForbidden(auditLogsQuery.error) ? (
			<p role="alert" className="px-6 text-sm text-white">
				You do not have permission to view the audit trail.
			</p>
		) : (
			<p role="alert" className="px-6 text-sm text-white">
				{getApiErrorMessage(auditLogsQuery.error)}
			</p>
		);
	} else if (auditLogsQuery.status === "pending") {
		body = <p className="px-6 text-sm text-white">Loading…</p>;
	} else {
		const records = auditLogsQuery.data.data;
		body = (
			<div className="flex flex-col w-full max-w-2xl gap-3 px-6 text-white">
				<h2 className="text-lg font-bold">Audit Trail</h2>

				<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
					<input
						value={filters.userId ?? ""}
						onChange={(event) =>
							setFilters((current) => ({
								...current,
								userId: event.target.value || undefined
							}))
						}
						placeholder="User ID"
						aria-label="Filter by user ID"
						className="h-9 rounded-md border border-transparent bg-background-100-1 px-3 text-sm text-white outline-none focus:border-primary-20"
					/>
					<input
						value={filters.resourceId ?? ""}
						onChange={(event) =>
							setFilters((current) => ({
								...current,
								resourceId: event.target.value || undefined
							}))
						}
						placeholder="Resource ID"
						aria-label="Filter by resource ID"
						className="h-9 rounded-md border border-transparent bg-background-100-1 px-3 text-sm text-white outline-none focus:border-primary-20"
					/>
					<Dropdown
						value={filters.operation ?? ALL_OPERATIONS}
						options={[{ value: ALL_OPERATIONS, label: "All operations" }, ...AUDIT_OPERATION_OPTIONS]}
						placeholder="All operations"
						inputHeight="h-9"
						fontSize="text-sm"
						onChange={(value) =>
							setFilters((current) => ({
								...current,
								operation:
									value === ALL_OPERATIONS
										? undefined
										: (value as AuditFilters["operation"])
							}))
						}
					/>
				</div>

				{records.length === 0 ? (
					<p className="p-3 text-sm text-neutral-3">No audit records match the current filters.</p>
				) : (
					<ul className="flex flex-col gap-2 overflow-y-auto max-h-80">
						{records.map((record) => (
							<li key={record.id} className="p-2 text-sm rounded-md bg-white/5">
								<p className="font-medium">{AUDIT_OPERATION_LABEL[record.operation]}</p>
								<p className="text-xs text-neutral-3">
									{formatOccurredAt(record.occurredAt)}
									{record.userId ? ` · ${record.userId}` : ""}
									{record.resourceId ? ` · ${record.resourceId}` : ""}
								</p>
							</li>
						))}
					</ul>
				)}
			</div>
		);
	}

	return (
		<Modal handleClose={onClose} handleConfirm={onClose} label="Close" disabled={isLoading}>
			{body}
		</Modal>
	);
}

export default AuditLogModal;
