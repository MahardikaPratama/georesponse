/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : The relocation interaction (FR-022-026, UC-09): a
 *                "set new location" control in the detail panel's
 *                Location field, used as an alternative to dragging the
 *                map marker. Marker dragging isn't implemented —
 *                ResourceMap renders resources through a GeoJSON source +
 *                circle layer (map-adapter/MapAdapter.ts), not
 *                maplibregl.Marker DOM elements, so native drag support
 *                isn't available without substantial adapter rework;
 *                this control gets the same UC-09 outcome (FR-022's
 *                marker moving on relocation) without it.
 *                useRelocateResource's optimistic update is what makes
 *                the marker move immediately on save, before the backend
 *                confirms.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Latitude/longitude switched from `type="number"` to
 *                        `type="text"` with `inputMode="decimal"`, dropping
 *                        the native spinner arrows the coordinate fields
 *                        never needed (matches ResourceCreateForm).
 */
import React, { useState } from "react";

import { useRelocateResource } from "@hooks/useRelocateResource";
import { getApiErrorMessage } from "@utils/apiErrorMessage";
import { validateLocation } from "@utils/validateLocation";

import { RelocateResourceControlProps } from "./RelocateResourceControl.types";

const fieldClassName =
	"h-8 w-28 rounded-md border border-transparent bg-background-100-1 px-2 text-sm text-white " +
	"outline-none transition-colors focus:border-primary-20";

function RelocateResourceControl({ resourceId, location }: RelocateResourceControlProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [latitude, setLatitude] = useState(String(location.latitude));
	const [longitude, setLongitude] = useState(String(location.longitude));
	const [errors, setErrors] = useState<{ latitude?: string; longitude?: string }>({});
	const relocate = useRelocateResource(resourceId);

	function startEditing() {
		setLatitude(String(location.latitude));
		setLongitude(String(location.longitude));
		setErrors({});
		setIsEditing(true);
	}

	function handleSave() {
		const validationErrors = validateLocation(latitude, longitude);
		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors);
			return;
		}
		setErrors({});

		relocate.mutate(
			{ latitude: Number(latitude), longitude: Number(longitude) },
			{ onSuccess: () => setIsEditing(false) }
		);
	}

	if (!isEditing) {
		return (
			<>
				<p>
					{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
				</p>
				<button
					type="button"
					onClick={startEditing}
					className="text-xs text-primary-50 hover:underline"
				>
					Relocate
				</button>
			</>
		);
	}

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center gap-1">
				<label className="sr-only" htmlFor="relocate-latitude">
					Latitude
				</label>
				<input
					id="relocate-latitude"
					type="text"
					inputMode="decimal"
					value={latitude}
					onChange={(event) => setLatitude(event.target.value)}
					disabled={relocate.isPending}
					placeholder="Latitude"
					className={fieldClassName}
				/>
				<label className="sr-only" htmlFor="relocate-longitude">
					Longitude
				</label>
				<input
					id="relocate-longitude"
					type="text"
					inputMode="decimal"
					value={longitude}
					onChange={(event) => setLongitude(event.target.value)}
					disabled={relocate.isPending}
					placeholder="Longitude"
					className={fieldClassName}
				/>
			</div>
			{(errors.latitude || errors.longitude) && (
				<p role="alert" className="text-xs text-error-4">
					{errors.latitude ?? errors.longitude}
				</p>
			)}
			{relocate.isError && (
				<p role="alert" className="text-xs text-error-4">
					{getApiErrorMessage(relocate.error)}
				</p>
			)}
			<div className="flex gap-2">
				<button
					type="button"
					onClick={handleSave}
					disabled={relocate.isPending}
					className="text-xs text-primary-50 hover:underline disabled:opacity-50"
				>
					{relocate.isPending ? "Saving…" : "Save"}
				</button>
				<button
					type="button"
					onClick={() => setIsEditing(false)}
					disabled={relocate.isPending}
					className="text-xs text-neutral-3 hover:underline disabled:opacity-50"
				>
					Cancel
				</button>
			</div>
		</div>
	);
}

export default RelocateResourceControl;
