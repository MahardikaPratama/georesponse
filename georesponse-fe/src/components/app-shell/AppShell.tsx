/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : The map-first application shell (FRONTEND_UI_UX.md
 *                section 3): top bar, resource list panel, map, and a
 *                detail panel region (still empty; see the changelog).
 *                Shown by App.tsx once a user is authenticated.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Wires the resource list and map to live data
 *                        (Phase 6 section 9.1): owns the shared selection
 *                        state the two panels highlight in both directions
 *                        (FRONTEND_UI_UX.md section 3). The detail panel's
 *                        real content is still Phase 6 section 9.3.
 */
import React, { useMemo, useState } from "react";

import { useCurrentUser } from "@hooks/useCurrentUser";
import { useLogout } from "@hooks/useLogout";
import { useResources } from "@hooks/useResources";
import ResourceList from "@components/resource-list/ResourceList";
import ResourceMap from "@components/resource-map/ResourceMap";
import { MapMarker } from "@components/resource-map/map-adapter/MapAdapter.types";
import { RESOURCE_STATUS_CONFIG } from "@constants/resourceStatus.constants";

function AppShell() {
	const { data: user } = useCurrentUser();
	const logout = useLogout();
	const { data: resourcesPage } = useResources();
	const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

	const markers = useMemo<MapMarker[]>(
		() =>
			(resourcesPage?.data ?? []).map((resource) => ({
				id: resource.id,
				latitude: resource.location.latitude,
				longitude: resource.location.longitude,
				color: RESOURCE_STATUS_CONFIG[resource.status].hex
			})),
		[resourcesPage]
	);

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
					{/* Search and filter controls — Phase 6 section 9.2 */}
					<ResourceList
						selectedResourceId={selectedResourceId}
						onSelectResource={setSelectedResourceId}
					/>
				</aside>

				<main className="relative flex-1">
					<ResourceMap
						markers={markers}
						selectedResourceId={selectedResourceId}
						onResourceSelect={setSelectedResourceId}
					/>
				</main>
			</div>

			{/* Resource detail panel opens here when a resource is selected —
			    Phase 6 section 9.3 */}
		</div>
	);
}

export default AppShell;
