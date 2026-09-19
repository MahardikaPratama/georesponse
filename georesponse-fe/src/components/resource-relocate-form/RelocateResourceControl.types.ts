/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Local types for RelocateResourceControl.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
// See resourceApi.ts for why this is a relative import, not "@types/...".
import { Location } from "../../types/resource.types";

export interface RelocateResourceControlProps {
	resourceId: string;
	location: Location;
}
