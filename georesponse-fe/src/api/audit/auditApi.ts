/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Data-access functions for GET /api/v1/audit-logs
 *                (API_CONTRACT.md section 11). Called only from hooks —
 *                never directly from a component.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { httpClient } from "@api/httpClient";
import { ListEnvelope } from "@api/httpClient.types";

import { AuditFilters, AuditRecord } from "./auditApi.types";

export const auditApi = {
	list(filters: AuditFilters): Promise<ListEnvelope<AuditRecord>> {
		return httpClient.getList<AuditRecord>("/audit-logs", { ...filters });
	}
};
