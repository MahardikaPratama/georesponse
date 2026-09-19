/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Local types for ResourceDetail.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */

export interface ResourceDetailProps {
	resourceId: string;
	onClose?: () => void;
}
