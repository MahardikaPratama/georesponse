/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : The map-first application shell (FRONTEND_UI_UX.md
 *                section 3): top bar, resource list panel, map, and a
 *                (currently empty) detail panel region. Shown by App.tsx
 *                once a user is authenticated. Resource list/search/
 *                filter and the detail panel's real content are Phase 6
 *                work; this establishes the layout structure and the
 *                Map Adapter boundary they will be built into.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";

import { useCurrentUser } from "@hooks/useCurrentUser";
import { useLogout } from "@hooks/useLogout";
import ResourceMap from "@components/resource-map/ResourceMap";

function AppShell() {
	const { data: user } = useCurrentUser();
	const logout = useLogout();

	return (
		<div className="flex flex-col w-screen h-screen overflow-hidden text-white bg-background-100-1">
			<header className="flex items-center justify-between p-4 border-b border-white/10">
				<h1 className="text-xl font-bold">GeoResponse</h1>
				<div className="flex items-center gap-4 text-sm">
					{user && <span>{user.name}</span>}
					<button
						type="button"
						onClick={() => logout.mutate()}
						disabled={logout.isPending}
						className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-50"
					>
						Log out
					</button>
				</div>
			</header>

			<div className="flex flex-1 overflow-hidden">
				<aside
					className="w-80 p-4 overflow-y-auto border-r shrink-0 border-white/10"
					aria-label="Resource list"
				>
					{/* Search, filters, and the resource list — Phase 6 */}
				</aside>

				<main className="relative flex-1">
					<ResourceMap />
				</main>
			</div>

			{/* Resource detail panel opens here when a resource is selected —
			    Phase 6 */}
		</div>
	);
}

export default AppShell;
