/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Reducer for the resource create form's field state.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { ResourceFormAction, ResourceFormState } from "./ResourceCreateForm.types";

export function createInitialResourceFormState(): ResourceFormState {
	return {
		id: "",
		name: "",
		type: "VEHICLE",
		status: "AVAILABLE",
		attributes: {},
		latitude: "",
		longitude: ""
	};
}

export function resourceFormReducer(
	state: ResourceFormState,
	action: ResourceFormAction
): ResourceFormState {
	switch (action.type) {
		case "SET_ID":
			return { ...state, id: action.value };
		case "SET_NAME":
			return { ...state, name: action.value };
		case "SET_TYPE":
			// A type change makes the previous type's attributes meaningless
			// (e.g. a VEHICLE's "capacity" isn't an IOT_DEVICE field), so the
			// attribute set resets along with it rather than carrying stale
			// values into fields the new type doesn't render.
			return { ...state, type: action.value, attributes: {} };
		case "SET_STATUS":
			return { ...state, status: action.value };
		case "SET_ATTRIBUTE":
			return { ...state, attributes: { ...state.attributes, [action.key]: action.value } };
		case "SET_LATITUDE":
			return { ...state, latitude: action.value };
		case "SET_LONGITUDE":
			return { ...state, longitude: action.value };
		case "RESET":
			return createInitialResourceFormState();
		default:
			return state;
	}
}
