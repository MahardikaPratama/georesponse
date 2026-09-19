/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Request/response shapes for GET /api/v1/audit-logs.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */

export type AuditOperation =
	| "RESOURCE_CREATED"
	| "RESOURCE_UPDATED"
	| "RESOURCE_STATUS_CHANGED"
	| "RESOURCE_RELOCATED"
	| "RESOURCE_DELETED"
	| "ROLE_CHANGED"
	| "PERMISSION_CHANGED";

export interface AuditFilters {
	userId?: string;
	resourceId?: string;
	operation?: AuditOperation;
	startTime?: string;
	endTime?: string;
	page?: number;
	pageSize?: number;
}

export interface AuditRecord {
	id: string;
	operation: AuditOperation;
	userId?: string;
	resourceId?: string;
	occurredAt: string;
	details: Record<string, unknown>;
}
