/*
 * Author       : Mahardika Pratama
 * Version      : 1.12.0
 * Created Date : 2026-09-19
 * Description  : The map-first application shell: top bar, resource list
 *                panel, map, and a detail panel that opens when a resource
 *                is selected. Shown by App.tsx once a user is authenticated.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Wires the resource list and map to live data:
 *                        owns the shared selection state the two panels
 *                        highlight in both directions. The detail panel's
 *                        real content comes in a later revision.
 * - 1.2.0 (2026-09-19): Owns `filters` client state, fed by the new
 *                        ResourceFilterBar and applied to both the list
 *                        and the map's own useResources call, so they
 *                        always show the same filtered set.
 * - 1.3.0 (2026-09-19): Renders ResourceDetail when a resource is
 *                        selected — map-marker selection already flowed
 *                        into selectedResourceId via ResourceMap's
 *                        onResourceSelect, so this is what makes that
 *                        selection actually open the panel (FR-021,
 *                        UC-05 step 5).
 * - 1.4.0 (2026-09-19): Added a "New Resource" button opening
 *                        CreateResourceModal. No extra wiring was needed
 *                        for the created resource to appear in the
 *                        list/map without a refresh — useCreateResource
 *                        already invalidates resourceKeys.lists(), which
 *                        this component's own useResources call shares.
 * - 1.5.0 (2026-09-19): Wires ResourceDetail's edit action to
 *                        UpdateResourceModal.
 * - 1.6.0 (2026-09-19): Wires ResourceDetail's delete action to
 *                        DeleteResourceConfirmation. A successful
 *                        deletion also closes the detail panel itself,
 *                        since the resource it was showing no longer
 *                        exists.
 * - 1.7.0 (2026-09-19): Added a "Manage Roles" button opening
 *                        RoleManagementModal. Any authenticated user can
 *                        open it — the modal itself is what blocks a
 *                        caller lacking role.read/role.manage, since the
 *                        frontend has no other way to know a user's
 *                        permissions in advance.
 * - 1.8.0 (2026-09-19): Moved ResourceDetail from a full-width bottom bar
 *                        into `main`, as a floating card anchored to the
 *                        map's top-right corner (the "side panel" layout
 *                        option) — the bottom-bar layout capped the
 *                        panel's height and made its history section
 *                        awkward to read below the fold.
 * - 1.9.0 (2026-09-19): Added an "Audit Trail" button opening
 *                        AuditLogModal, gated the same way as "Manage
 *                        Roles" — any authenticated user can open it,
 *                        the modal itself blocks a caller lacking
 *                        audit.read.
 * - 1.10.0 (2026-09-20): Wired ResourceMap's onMapDoubleClick to open
 *                        CreateResourceModal with latitude/longitude
 *                        pre-filled from the clicked point, and added a
 *                        one-line tip next to "+ New Resource" so the
 *                        feature is discoverable.
 * - 1.11.0 (2026-09-20): Pass the newest hotspot's observation date to
 *                         HotspotToggle as the overlay's "as of" date.
 * - 1.12.0 (2026-09-20): Render MapLegend over the map.
 */
import React, { useMemo, useState } from "react";

import { ResourceFilters } from "@api/resources/resourceApi.types";
import { useCurrentUser } from "@hooks/useCurrentUser";
import { useHotspots } from "@hooks/useHotspots";
import { useLogout } from "@hooks/useLogout";
import { useResources } from "@hooks/useResources";
import AuditLogModal from "@components/audit-log/AuditLogModal";
import CreateResourceModal from "@components/resource-create-form/CreateResourceModal";
import DeleteResourceConfirmation from "@components/resource-delete-confirmation/DeleteResourceConfirmation";
import ResourceDetail from "@components/resource-detail/ResourceDetail";
import ResourceFilterBar from "@components/resource-filter-bar/ResourceFilterBar";
import HotspotToggle from "@components/hotspot-toggle/HotspotToggle";
import MapLegend from "@components/map-legend/MapLegend";
import ResourceList from "@components/resource-list/ResourceList";
import ResourceMap from "@components/resource-map/ResourceMap";
import { HotspotMarker, MapMarker } from "@components/resource-map/map-adapter/MapAdapter.types";
import RoleManagementModal from "@components/role-management/RoleManagementModal";
import { RESOURCE_STATUS_CONFIG } from "@constants/resourceStatus.constants";
import UpdateResourceModal from "@components/resource-update-form/UpdateResourceModal";
import { getApiErrorMessage } from "@utils/apiErrorMessage";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { Resource } from "../../types/resource.types";

function AppShell() {
	const { data: user } = useCurrentUser();
	const logout = useLogout();
	const [filters, setFilters] = useState<ResourceFilters>({});
	const { data: resourcesPage } = useResources(filters);
	const hotspotsQuery = useHotspots();
	const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
	const [deletingResource, setDeletingResource] = useState<Resource | null>(null);
	const [hotspotLayerVisible, setHotspotLayerVisible] = useState(true);
	const [isRoleManagementOpen, setIsRoleManagementOpen] = useState(false);
	const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
	const [createLocation, setCreateLocation] = useState<{
		latitude: number;
		longitude: number;
	} | null>(null);

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

	const hotspots = useMemo<HotspotMarker[]>(
		() =>
			(hotspotsQuery.data?.data ?? []).map((hotspot) => ({
				id: hotspot.id,
				latitude: hotspot.latitude,
				longitude: hotspot.longitude,
				province: hotspot.province,
				regency: hotspot.regency,
				observedDate: hotspot.observedDate,
				observedTime: hotspot.observedTime
			})),
		[hotspotsQuery.data]
	);

	// The backend orders hotspots newest-first, so the first item carries
	// the observation date the whole overlay is current to.
	const hotspotsAsOf = hotspotsQuery.data?.data[0]?.observedDate;

	return (
		<div className="flex flex-col w-screen h-screen overflow-hidden text-white bg-background-100-1">
			<header className="flex items-center justify-between p-4 border-b border-white/10">
				<h1 className="text-xl font-bold">GeoResponse</h1>
				<div className="flex items-center gap-4 text-sm">
					<HotspotToggle
						visible={hotspotLayerVisible}
						onToggle={setHotspotLayerVisible}
						status={hotspotsQuery.status}
						count={hotspots.length}
						asOf={hotspotsAsOf}
						error={hotspotsQuery.error}
						getErrorMessage={getApiErrorMessage}
					/>
					{user && <span>{user.name}</span>}
					<button
						type="button"
						onClick={() => setIsRoleManagementOpen(true)}
						className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20"
					>
						Manage Roles
					</button>
					<button
						type="button"
						onClick={() => setIsAuditLogOpen(true)}
						className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20"
					>
						Audit Trail
					</button>
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
						onClick={() => {
							setCreateLocation(null);
							setIsCreateModalOpen(true);
						}}
						className="w-full h-9 text-sm font-medium rounded-md bg-primary-20 hover:bg-primary-50"
					>
						+ New Resource
					</button>
					<p className="mt-2 mb-3 text-xs text-neutral-3">
						Tip: double-click the map to create a resource at that location.
					</p>

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
						hotspots={hotspots}
						hotspotLayerVisible={hotspotLayerVisible}
						onMapDoubleClick={(location) => {
							setCreateLocation(location);
							setIsCreateModalOpen(true);
						}}
					/>
					<MapLegend
						hotspotLayerVisible={hotspotLayerVisible && hotspots.length > 0}
						hotspotAsOf={hotspotsAsOf}
					/>

					{selectedResourceId && (
						<ResourceDetail
							resourceId={selectedResourceId}
							onClose={() => setSelectedResourceId(null)}
							onEdit={() => setEditingResourceId(selectedResourceId)}
							onDelete={setDeletingResource}
						/>
					)}
				</main>
			</div>

			{isCreateModalOpen && (
				<CreateResourceModal
					onClose={() => setIsCreateModalOpen(false)}
					initialLocation={createLocation ?? undefined}
				/>
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

			{isRoleManagementOpen && (
				<RoleManagementModal onClose={() => setIsRoleManagementOpen(false)} />
			)}

			{isAuditLogOpen && <AuditLogModal onClose={() => setIsAuditLogOpen(false)} />}
		</div>
	);
}

export default AppShell;
