/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Local types for ResourceDetail.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added onEdit (Phase 6 section 9.5), the edit
 *                        action FRONTEND_UI_UX.md section 5 describes.
 * - 1.2.0 (2026-09-19): Added onDelete (Phase 6 section 9.8), the delete
 *                        action FRONTEND_UI_UX.md section 5 describes.
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
