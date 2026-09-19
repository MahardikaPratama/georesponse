/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Root application component. Decides between the login
 *                screen and the authenticated app shell based on whether
 *                GET /api/v1/auth/me resolves a user (UC-11) — this is
 *                the closest thing this SPA has to route guarding, since
 *                no router library is installed (there is currently only
 *                one authenticated view to guard).
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Reset to a clean GeoResponse shell, replacing the
 *                        prior project's AIS/ADS-B simulator entry point.
 * - 1.1.0 (2026-09-19): Wired the login/app-shell auth gate.
 */
import React from "react";

import { useCurrentUser } from "@hooks/useCurrentUser";
import AppShell from "@components/app-shell/AppShell";
import LoginForm from "@components/login-form/LoginForm";

function App() {
	const { data: user, isLoading } = useCurrentUser();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center w-screen h-screen text-white bg-background-100-1">
				Loading...
			</div>
		);
	}

	return user ? <AppShell /> : <LoginForm />;
}

export default App;
