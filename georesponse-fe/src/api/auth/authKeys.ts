/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : TanStack Query key factory for the authenticated user,
 *                per FRONTEND_STATE.md section 5's pattern.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */

export const authKeys = {
	all: ["auth"] as const,
	me: () => [...authKeys.all, "me"] as const
};
