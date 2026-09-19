/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : The resource history view (FR-034-037, UC-13): status,
 *                location, and change history in tabs, each entry
 *                showing what changed, when, and by whom when available.
 *                Tab selection is client state, local to this component.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React, { useState } from "react";

import {
	ChangeHistoryEntry,
	LocationHistoryEntry,
	StatusHistoryEntry
} from "@api/resources/resourceApi.types";
import Tabs from "@common/tabs/Tabs";
import { RESOURCE_STATUS_CONFIG } from "@constants/resourceStatus.constants";
import { useResourceHistory } from "@hooks/useResourceHistory";
import { getApiErrorMessage } from "@utils/apiErrorMessage";

type HistoryTab = "status" | "location" | "change";

const TABS: { title: string; value: HistoryTab }[] = [
	{ title: "Status", value: "status" },
	{ title: "Location", value: "location" },
	{ title: "Changes", value: "change" }
];

function formatChangedAt(changedAt: string): string {
	const date = new Date(changedAt);
	return Number.isNaN(date.getTime()) ? changedAt : date.toLocaleString();
}

function EntryMeta({ changedAt, changedBy }: { changedAt: string; changedBy?: string }) {
	return (
		<p className="text-xs text-neutral-3">
			{formatChangedAt(changedAt)}
			{changedBy ? ` · ${changedBy}` : ""}
		</p>
	);
}

function EmptyState({ message }: { message: string }) {
	return <p className="p-3 text-sm text-neutral-3">{message}</p>;
}

function StatusHistoryList({ entries }: { entries: StatusHistoryEntry[] }) {
	if (entries.length === 0) return <EmptyState message="No status changes yet." />;
	return (
		<ul className="flex flex-col gap-2">
			{entries.map((entry) => (
				<li key={entry.id} className="text-sm">
					<p>
						{RESOURCE_STATUS_CONFIG[entry.previousStatus].label} {"→"}{" "}
						{RESOURCE_STATUS_CONFIG[entry.newStatus].label}
					</p>
					<EntryMeta changedAt={entry.changedAt} changedBy={entry.changedBy} />
				</li>
			))}
		</ul>
	);
}

function LocationHistoryList({ entries }: { entries: LocationHistoryEntry[] }) {
	if (entries.length === 0) return <EmptyState message="No relocations yet." />;
	return (
		<ul className="flex flex-col gap-2">
			{entries.map((entry) => (
				<li key={entry.id} className="text-sm">
					<p>
						{entry.previousLocation.latitude.toFixed(4)}, {entry.previousLocation.longitude.toFixed(4)}{" "}
						{"→"} {entry.newLocation.latitude.toFixed(4)}, {entry.newLocation.longitude.toFixed(4)}
					</p>
					<EntryMeta changedAt={entry.changedAt} changedBy={entry.changedBy} />
				</li>
			))}
		</ul>
	);
}

function ChangeHistoryList({ entries }: { entries: ChangeHistoryEntry[] }) {
	if (entries.length === 0) return <EmptyState message="No other changes yet." />;
	return (
		<ul className="flex flex-col gap-2">
			{entries.map((entry) => (
				<li key={entry.id} className="text-sm">
					<ul className="list-disc pl-4">
						{entry.changes.map((change, index) => (
							<li key={`${entry.id}-${change.field}-${index}`}>
								{change.field}: {String(change.before)} {"→"} {String(change.after)}
							</li>
						))}
					</ul>
					<EntryMeta changedAt={entry.changedAt} changedBy={entry.changedBy} />
				</li>
			))}
		</ul>
	);
}

function ResourceHistoryView({ resourceId }: { resourceId: string }) {
	const [activeTab, setActiveTab] = useState<HistoryTab>("status");
	const { data, status, error } = useResourceHistory(resourceId);

	if (status === "pending") {
		return <p className="p-3 text-sm text-neutral-3 animate-pulse">Loading history…</p>;
	}

	if (status === "error") {
		return (
			<p role="alert" className="p-3 text-sm text-error-4">
				{getApiErrorMessage(error)}
			</p>
		);
	}

	const history = data.data;

	return (
		<div className="flex flex-col gap-2">
			<Tabs tabsData={TABS} currentTab={activeTab} onTabChange={setActiveTab} tabFontSize="text-sm" />
			{activeTab === "status" && <StatusHistoryList entries={history.statusHistory} />}
			{activeTab === "location" && <LocationHistoryList entries={history.locationHistory} />}
			{activeTab === "change" && <ChangeHistoryList entries={history.changeHistory} />}
		</div>
	);
}

export default ResourceHistoryView;
