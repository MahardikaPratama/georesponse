/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Shared Hotspot domain type, mirroring the backend's
 *                hotspot.Hotspot shape (BMKG GeoHotspot situational-
 *                awareness overlay). Kept separate from Resource — a
 *                hotspot is never an application-managed resource.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */

export interface Hotspot {
	id: string;
	latitude: number;
	longitude: number;
	region: string;
	province: string;
	regency: string;
	district: string;
	observedDate: string;
	observedTime: string;
	updatedAt: string;
	originDate: string;
}
