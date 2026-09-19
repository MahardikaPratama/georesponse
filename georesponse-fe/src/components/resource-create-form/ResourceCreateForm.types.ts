/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : Shared types for the resource create form: its field
 *                state (a multi-field transition, per FRONTEND_STATE.md
 *                section 3's useReducer guidance), reducer actions, and
 *                validation error shape.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added ResourceCreateFormProps — the presentational
 *                        component now takes useResourceCreateForm's
 *                        return value as props instead of calling the
 *                        hook itself, so CreateResourceModal (its
 *                        container) can drive Modal's Confirm button from
 *                        the same hook instance without a ref bridge.
 * - 1.2.0 (2026-09-19): Added locationPrefilled, so the form can show a
 *                        hint that latitude/longitude were filled in from a
 *                        map double-click instead of typed.
 */
import { Dispatch } from "react";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { ResourceStatus, ResourceType } from "../../types/resource.types";

/** All inputs are kept as strings so the user can type freely; parsed/validated on submit. */
export interface ResourceFormState {
	id: string;
	name: string;
	type: ResourceType;
	status: ResourceStatus;
	attributes: Record<string, string>;
	latitude: string;
	longitude: string;
}

export type ResourceFormAction =
	| { type: "SET_ID"; value: string }
	| { type: "SET_NAME"; value: string }
	| { type: "SET_TYPE"; value: ResourceType }
	| { type: "SET_STATUS"; value: ResourceStatus }
	| { type: "SET_ATTRIBUTE"; key: string; value: string }
	| { type: "SET_LATITUDE"; value: string }
	| { type: "SET_LONGITUDE"; value: string }
	| { type: "RESET" };

/** Field key -> message. Field keys match ResourceFormState's fields, "attributes.<key>" for an attribute. */
export type ResourceFormErrors = Record<string, string>;

export interface ResourceCreateFormProps {
	state: ResourceFormState;
	dispatch: Dispatch<ResourceFormAction>;
	errors: ResourceFormErrors;
	formError: string | null;
	isSubmitting: boolean;
	locationPrefilled?: boolean;
}
