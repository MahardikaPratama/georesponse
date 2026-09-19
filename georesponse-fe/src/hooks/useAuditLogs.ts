/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Queries the audit trail (GET /api/v1/audit-logs),
 *                restricted to callers holding `audit.read` — the query's
 *                `error` is how the frontend detects the caller lacks
 *                access (FR-040, UC-14), the same pattern useRoles uses
 *                for role.read.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { auditApi } from "@api/audit/auditApi";
import { AuditFilters } from "@api/audit/auditApi.types";
import { auditKeys } from "@api/audit/auditKeys";
import { useQuery } from "@tanstack/react-query";

export function useAuditLogs(filters: AuditFilters = {}) {
	return useQuery({
		queryKey: auditKeys.list(filters),
		queryFn: () => auditApi.list(filters),
		retry: false
	});
}
