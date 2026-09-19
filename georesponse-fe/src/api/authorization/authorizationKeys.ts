/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : TanStack Query key factory for roles/permissions, per
 *                FRONTEND_STATE.md section 5.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */

export const authorizationKeys = {
	roles: ["roles"] as const,
	permissions: ["permissions"] as const
};
