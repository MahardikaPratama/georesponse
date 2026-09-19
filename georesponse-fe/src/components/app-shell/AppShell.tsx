/*
 * Author       : Mahardika Pratama
 * Version      : 1.6.0
 * Created Date : 2026-09-19
 * Description  : The map-first application shell (FRONTEND_UI_UX.md
 *                section 3): top bar, resource list panel, map, and a
 *                detail panel that opens when a resource is selected.
 *                Shown by App.tsx once a user is authenticated.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Wires the resource list and map to live data
 *                        (Phase 6 section 9.1): owns the shared selection
 *                        state the two panels highlight in both directions
 *                        (FRONTEND_UI_UX.md section 3). The detail panel's
 *                        real content is still Phase 6 section 9.3.
 * - 1.2.0 (2026-09-19): Owns `filters` client state (Phase 6 section 9.2),
 *                        fed by the new ResourceFilterBar and applied to
 *                        both the list and the map's own useResources call,
 *                        so they always show the same filtered set.
 * - 1.3.0 (2026-09-19): Renders ResourceDetail when a resource is selected
 *                        (Phase 6 section 9.3) — map-marker selection
 *                        already flowed into selectedResourceId via
 *                        ResourceMap's onResourceSelect (section 9.1), so
 *                        this is what makes that selection actually open
 *                        the panel (FR-021, UC-05 step 5).
 * - 1.4.0 (2026-09-19): Added a "New Resource" button opening
 *                        CreateResourceModal (Phase 6 section 9.4). No
 *                        extra wiring was needed for the created resource
 *                        to appear in the list/map without a refresh —
 *                        useCreateResource already invalidates
 *                        resourceKeys.lists(), which this component's own
 *                        useResources call shares.
 * - 1.5.0 (2026-09-19): Wires ResourceDetail's edit action to
 *                        UpdateResourceModal (Phase 6 section 9.5).
 * - 1.6.0 (2026-09-19): Wires ResourceDetail's delete action to
 *                        DeleteResourceConfirmation (Phase 6 section 9.8).
 *                        A successful deletion also closes the detail
 *                        panel itself, since the resource it was showing
 *                        no longer exists.
 */
import React, { useMemo, useState } from "react";

import { ResourceFilters } from "@api/resources/resourceApi.types";
import { useCurrentUser } from "@hooks/useCurrentUser";
import { useLogout } from "@hooks/useLogout";
import { useResources } from "@hooks/useResources";
import CreateResourceModal from "@components/resource-create-form/CreateResourceModal";
import DeleteResourceConfirmation from "@components/resource-delete-confirmation/DeleteResourceConfirmation";
import ResourceDetail from "@components/resource-detail/ResourceDetail";
import ResourceFilterBar from "@components/resource-filter-bar/ResourceFilterBar";
import ResourceList from "@components/resource-list/ResourceList";
import ResourceMap from "@components/resource-map/ResourceMap";
import { MapMarker } from "@components/resource-map/map-adapter/MapAdapter.types";
import { RESOURCE_STATUS_CONFIG } from "@constants/resourceStatus.constants";
import UpdateResourceModal from "@components/resource-update-form/UpdateResourceModal";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { Resource } from "../../types/resource.types";

function AppShell() {
	const { data: user } = useCurrentUser();
	const logout = useLogout();
	const [filters, setFilters] = useState<ResourceFilters>({});
	const { data: resourcesPage } = useResources(filters);
	const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
	const [deletingResource, setDeletingResource] = useState<Resource | null>(null);

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
					<button
						type="button"
						onClick={() => setIsCreateModalOpen(true)}
						className="w-full h-9 mb-3 text-sm font-medium rounded-md bg-primary-20 hover:bg-primary-50"
					>
						+ New Resource
					</button>

					<ResourceFilterBar filters={filters} onFiltersChange={setFilters} />
					<ResourceList
						filters={filters}
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

			{selectedResourceId && (
				<ResourceDetail
					resourceId={selectedResourceId}
					onClose={() => setSelectedResourceId(null)}
					onEdit={() => setEditingResourceId(selectedResourceId)}
					onDelete={setDeletingResource}
				/>
			)}

			{isCreateModalOpen && (
				<CreateResourceModal onClose={() => setIsCreateModalOpen(false)} />
			)}

			{editingResourceId && (
				<UpdateResourceModal
					resourceId={editingResourceId}
					onClose={() => setEditingResourceId(null)}
				/>
			)}

			{deletingResource && (
				<DeleteResourceConfirmation
					resourceId={deletingResource.id}
					resourceName={deletingResource.name}
					onClose={() => setDeletingResource(null)}
					onDeleted={() => {
						setDeletingResource(null);
						setSelectedResourceId(null);
					}}
				/>
			)}
		</div>
	);
}

export default AppShell;
