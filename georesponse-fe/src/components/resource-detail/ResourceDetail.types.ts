/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Local types for ResourceDetail.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added onEdit, the edit action for the detail
 *                        panel.
 * - 1.2.0 (2026-09-19): Added onDelete, the delete action for the detail
 *                        panel.
 *                        Passes the loaded Resource itself, so the
 *                        confirmation dialog can show its name without
 *                        depending on it being present in the (possibly
 *                        filtered) list.
 */
// See resourceApi.ts for why this is a relative import, not "@types/...".
import { Resource } from "../../types/resource.types";

export interface ResourceDetailProps {
	resourceId: string;
	onClose?: () => void;
	onEdit?: () => void;
	onDelete?: (resource: Resource) => void;
}
