/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Container hook for the create-resource form (used by
 *                CreateResourceModal): owns the form's field state via a
 *                reducer (a multi-field transition, per FRONTEND_STATE.md
 *                section 3), runs client-side validation before
 *                submitting, and drives the create mutation.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Takes an optional initialLocation, forwarded to
 *                        createInitialResourceFormState, so the form can
 *                        open pre-filled from a map double-click
 *                        (FRONTEND_UI_UX.md section 6's map-click placement).
 */
import { useReducer, useState } from "react";

import { CreateResourceRequest } from "@api/resources/resourceApi.types";
import { RESOURCE_ATTRIBUTE_SCHEMA } from "@constants/resourceAttributeSchema.constants";
import { useCreateResource } from "@hooks/useCreateResource";
import { mapValidationError } from "@utils/mapValidationError";

import { ResourceFormErrors } from "./ResourceCreateForm.types";
import { createInitialResourceFormState, resourceFormReducer } from "./resourceFormReducer";
import { validateResourceForm } from "./validateResourceForm";

const KNOWN_FIELDS = [
	"id",
	"name",
	"type",
	"status",
	"location.latitude",
	"location.longitude",
	...Object.values(RESOURCE_ATTRIBUTE_SCHEMA)
		.flat()
		.map((field) => `attributes.${field.key}`)
];

export function useResourceCreateForm(
	onCreated: () => void,
	initialLocation?: { latitude: number; longitude: number }
) {
	const [state, dispatch] = useReducer(resourceFormReducer, initialLocation, createInitialResourceFormState);
	const [errors, setErrors] = useState<ResourceFormErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const createResource = useCreateResource();

	function handleSubmit() {
		const validationErrors = validateResourceForm(state);
		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors);
			setFormError(null);
			return;
		}

		const payload: CreateResourceRequest = {
			id: state.id.trim(),
			name: state.name.trim(),
			type: state.type,
			status: state.status,
			attributes: Object.fromEntries(
				RESOURCE_ATTRIBUTE_SCHEMA[state.type].map((field) => {
					const raw = state.attributes[field.key] ?? "";
					return [field.key, field.kind === "number" ? Number(raw) : raw];
				})
			),
			location: { latitude: Number(state.latitude), longitude: Number(state.longitude) }
		};

		setErrors({});
		setFormError(null);

		createResource.mutate(payload, {
			onSuccess: () => {
				dispatch({ type: "RESET" });
				onCreated();
			},
			onError: (error) => {
				const mapped = mapValidationError(error, KNOWN_FIELDS);
				setErrors(mapped.fieldErrors);
				setFormError(mapped.formError);
			}
		});
	}

	return {
		state,
		dispatch,
		errors,
		formError,
		isSubmitting: createResource.isPending,
		handleSubmit
	};
}
