/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Labels and Dropdown options for the fixed set of
 *                auditable operations (API_CONTRACT.md section 11).
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import type { DropdownOption } from "@common/dropdowns/dropdown/Dropdown";

import { AuditOperation } from "@api/audit/auditApi.types";

export const AUDIT_OPERATION_LABEL: Record<AuditOperation, string> = {
	RESOURCE_CREATED: "Resource Created",
	RESOURCE_UPDATED: "Resource Updated",
	RESOURCE_STATUS_CHANGED: "Resource Status Changed",
	RESOURCE_RELOCATED: "Resource Relocated",
	RESOURCE_DELETED: "Resource Deleted",
	ROLE_CHANGED: "Role Changed",
	PERMISSION_CHANGED: "Permission Changed"
};

export const AUDIT_OPERATION_OPTIONS: DropdownOption[] = (
	Object.keys(AUDIT_OPERATION_LABEL) as AuditOperation[]
).map((operation) => ({ value: operation, label: AUDIT_OPERATION_LABEL[operation] }));
