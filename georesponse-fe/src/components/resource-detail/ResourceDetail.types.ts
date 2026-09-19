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
 */

export interface ResourceDetailProps {
	resourceId: string;
	onClose?: () => void;
	onEdit?: () => void;
}
