/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Shared types for the resource update form. Deliberately
 *                narrower than the create form's state: `id` isn't an
 *                editable field (BR-015 — identity is preserved across an
 *                update), status has its own dedicated control (section
 *                9.6, FRONTEND_UI_UX.md section 5), and location has its
 *                own dedicated relocate flow (section 9.7, `API_CONTRACT.md`
 *                section 6.4's boundary between a general update and a
 *                relocation).
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { Dispatch } from "react";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { ResourceType } from "../../types/resource.types";

/** All inputs are kept as strings so the user can type freely; parsed/validated on submit. */
export interface ResourceUpdateFormState {
	name: string;
	type: ResourceType;
	attributes: Record<string, string>;
}

export type ResourceUpdateFormAction =
	| { type: "SET_NAME"; value: string }
	| { type: "SET_TYPE"; value: ResourceType }
	| { type: "SET_ATTRIBUTE"; key: string; value: string };

/** Field key -> message. "attributes.<key>" for an attribute, matching validateResourceForm's convention. */
export type ResourceUpdateFormErrors = Record<string, string>;

export interface ResourceUpdateFormProps {
	/** Shown read-only — identity isn't editable here (BR-015). */
	id: string;
	state: ResourceUpdateFormState;
	dispatch: Dispatch<ResourceUpdateFormAction>;
	errors: ResourceUpdateFormErrors;
	formError: string | null;
	isSubmitting: boolean;
}
