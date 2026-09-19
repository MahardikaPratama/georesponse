/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Reducer for the resource update form's field state.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
// See resourceApi.ts for why this is a relative import, not "@types/...".
import { Resource } from "../../types/resource.types";

import {
	ResourceUpdateFormAction,
	ResourceUpdateFormState
} from "./ResourceUpdateForm.types";

/** Pre-fills the form from the fetched resource (GET /api/v1/resources/{id}), converting numeric attribute values to strings for the inputs. */
export function createResourceUpdateFormState(resource: Resource): ResourceUpdateFormState {
	return {
		name: resource.name,
		type: resource.type,
		attributes: Object.fromEntries(
			Object.entries(resource.attributes).map(([key, value]) => [key, String(value)])
		)
	};
}

export function resourceUpdateFormReducer(
	state: ResourceUpdateFormState,
	action: ResourceUpdateFormAction
): ResourceUpdateFormState {
	switch (action.type) {
		case "SET_NAME":
			return { ...state, name: action.value };
		case "SET_TYPE":
			// A type change makes the previous type's attributes meaningless
			// (e.g. a VEHICLE's "capacity" isn't an IOT_DEVICE field), so the
			// attribute set resets along with it, same as the create form.
			return { ...state, type: action.value, attributes: {} };
		case "SET_ATTRIBUTE":
			return { ...state, attributes: { ...state.attributes, [action.key]: action.value } };
		default:
			return state;
	}
}
