/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : TanStack Query key factory for audit logs.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { AuditFilters } from "./auditApi.types";

export const auditKeys = {
	all: ["audit-logs"] as const,
	list: (filters: AuditFilters) => [...auditKeys.all, filters] as const
};
