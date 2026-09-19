/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Validates typed latitude/longitude input, mirroring the
 *                backend's range rules (latitude in [-90, 90], longitude
 *                in [-180, 180]). UX-only — the backend remains
 *                authoritative. Shared by the create form and the
 *                relocate control, both of which take typed coordinates.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */

export interface LocationErrors {
	latitude?: string;
	longitude?: string;
}

/** @param latitude,longitude Raw input strings, so the caller can validate before parsing. */
export function validateLocation(latitude: string, longitude: string): LocationErrors {
	const errors: LocationErrors = {};

	const latitudeValue = Number(latitude);
	if (latitude.trim().length === 0 || Number.isNaN(latitudeValue)) {
		errors.latitude = "Latitude is required.";
	} else if (latitudeValue < -90 || latitudeValue > 90) {
		errors.latitude = "Latitude must be between -90 and 90.";
	}

	const longitudeValue = Number(longitude);
	if (longitude.trim().length === 0 || Number.isNaN(longitudeValue)) {
		errors.longitude = "Longitude is required.";
	} else if (longitudeValue < -180 || longitudeValue > 180) {
		errors.longitude = "Longitude must be between -180 and 180.";
	}

	return errors;
}
