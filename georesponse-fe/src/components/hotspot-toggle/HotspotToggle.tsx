/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Toggles the BMKG hotspot map layer on/off and shows its
 *                loading/empty/unavailable state, per FRONTEND_UI_UX.md
 *                section 8's state-handling convention. Purely
 *                presentational — the parent owns the useHotspots() query
 *                and passes its status/count/error down, the same way
 *                AppShell already derives resource markers via useMemo and
 *                hands them to ResourceList/ResourceMap as props, rather
 *                than each child fetching independently.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";

import { Button } from "@common/button/Button";
import DotLoading from "@common/dotloading/DotLoading";

export interface HotspotToggleProps {
	visible: boolean;
	onToggle: (visible: boolean) => void;
	status: "pending" | "error" | "success";
	count: number;
	error?: unknown;
	/** Maps error to a human-facing message (defaults to a generic one). */
	getErrorMessage?: (error: unknown) => string;
}

function HotspotToggle({
	visible,
	onToggle,
	status,
	count,
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
		statusText = <span className="text-neutral-3">{count} active</span>;
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
