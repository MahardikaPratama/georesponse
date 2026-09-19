/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : TanStack Query key factory for the authenticated user.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */

export const authKeys = {
	all: ["auth"] as const,
	me: () => [...authKeys.all, "me"] as const
};
