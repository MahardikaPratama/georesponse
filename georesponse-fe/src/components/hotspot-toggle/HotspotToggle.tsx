/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : Toggles the BMKG hotspot map layer on/off and shows its
 *                loading/empty/unavailable state, following the app's
 *                usual state-handling convention. Purely presentational
 *                — the parent owns the useHotspots() query
 *                and passes its status/count/error down, the same way
 *                AppShell already derives resource markers via useMemo and
 *                hands them to ResourceList/ResourceMap as props, rather
 *                than each child fetching independently.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-20): Show the observation date the data is current to,
 *                       since BMKG publishes with a lag of days.
 */
import React from "react";

import { Button } from "@common/button/Button";
import DotLoading from "@common/dotloading/DotLoading";

export interface HotspotToggleProps {
	visible: boolean;
	onToggle: (visible: boolean) => void;
	status: "pending" | "error" | "success";
	count: number;
	/**
	 * BMKG observation date (YYYY-MM-DD) the shown hotspots are current
	 * to. BMKG's feed lags real time, so this tells the operator how old
	 * the overlay is; omitted when there is nothing to show.
	 */
	asOf?: string;
	error?: unknown;
	/** Maps error to a human-facing message (defaults to a generic one). */
	getErrorMessage?: (error: unknown) => string;
}

function HotspotToggle({
	visible,
	onToggle,
	status,
	count,
	asOf,
	error,
	getErrorMessage
}: HotspotToggleProps) {
	let statusText: React.ReactNode;
	if (status === "pending") {
		statusText = <DotLoading />;
	} else if (status === "error") {
		statusText = (
			<span className="text-error-1" role="alert">
				{getErrorMessage ? getErrorMessage(error) : "BMKG hotspot data is temporarily unavailable."}
			</span>
		);
	} else if (count === 0) {
		statusText = <span className="text-neutral-3">No active hotspots</span>;
	} else {
		statusText = (
			<span className="text-neutral-3">
				{count} active{asOf ? ` (BMKG data as of ${asOf})` : ""}
			</span>
		);
	}

	return (
		<div className="flex items-center gap-2 text-sm">
			<Button
				type="button"
				size="sm"
				variant={visible ? "solid" : "outline"}
				color="warning"
				aria-pressed={visible}
				onClick={() => onToggle(!visible)}
			>
				BMKG Hotspots
			</Button>
			{statusText}
		</div>
	);
}

export default HotspotToggle;
