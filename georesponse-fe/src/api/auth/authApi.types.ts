/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Request/response shapes for /api/v1/auth.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */

export interface User {
	id: string;
	name: string;
	roles: string[];
}

export interface LoginRequest {
	identifier: string;
	password: string;
}
