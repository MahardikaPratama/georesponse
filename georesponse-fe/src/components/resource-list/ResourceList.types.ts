/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Local types for ResourceList.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */

export interface ResourceListProps {
	selectedResourceId?: string | null;
	onSelectResource?: (resourceId: string) => void;
}
