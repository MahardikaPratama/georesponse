/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Data-access functions for /api/v1/auth. The backend
 *                establishes the authenticated context as an HttpOnly
 *                cookie (see httpClient's credentials: "include"); these
 *                functions never handle a token directly.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { httpClient } from "@api/httpClient";
import { DataEnvelope } from "@api/httpClient.types";

import { LoginRequest, User } from "./authApi.types";

export const authApi = {
	login(payload: LoginRequest): Promise<DataEnvelope<User>> {
		return httpClient.post<User>("/auth/login", payload);
	},

	logout(): Promise<void> {
		return httpClient.postNoContent("/auth/logout");
	},

	me(): Promise<DataEnvelope<User>> {
		return httpClient.get<User>("/auth/me");
	}
};
