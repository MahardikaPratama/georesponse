/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Container hook for the update-resource form (used by
 *                UpdateResourceModal): owns the form's field state via a
 *                reducer, pre-filled from the already-fetched resource,
 *                runs client-side validation before submitting, and
 *                drives the update mutation.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { useReducer, useState } from "react";

import { UpdateResourceRequest } from "@api/resources/resourceApi.types";
import { RESOURCE_ATTRIBUTE_SCHEMA } from "@constants/resourceAttributeSchema.constants";
import { useUpdateResource } from "@hooks/useUpdateResource";
import { mapValidationError } from "@utils/mapValidationError";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { Resource } from "../../types/resource.types";

import { ResourceUpdateFormErrors } from "./ResourceUpdateForm.types";
import {
	createResourceUpdateFormState,
	resourceUpdateFormReducer
} from "./resourceUpdateFormReducer";
import { validateResourceUpdateForm } from "./validateResourceUpdateForm";

const KNOWN_FIELDS = [
	"name",
	"type",
	...Object.values(RESOURCE_ATTRIBUTE_SCHEMA)
		.flat()
		.map((field) => `attributes.${field.key}`)
];

export function useResourceUpdateForm(resource: Resource, onUpdated: () => void) {
	const [state, dispatch] = useReducer(
		resourceUpdateFormReducer,
		resource,
		createResourceUpdateFormState
	);
	const [errors, setErrors] = useState<ResourceUpdateFormErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const updateResource = useUpdateResource(resource.id);

	function handleSubmit() {
		const validationErrors = validateResourceUpdateForm(state);
		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors);
			setFormError(null);
			return;
		}

		const payload: UpdateResourceRequest = {
			name: state.name.trim(),
			type: state.type,
			attributes: Object.fromEntries(
				RESOURCE_ATTRIBUTE_SCHEMA[state.type].map((field) => {
					const raw = state.attributes[field.key] ?? "";
					return [field.key, field.kind === "number" ? Number(raw) : raw];
				})
			)
		};

		setErrors({});
		setFormError(null);

		updateResource.mutate(payload, {
			onSuccess: onUpdated,
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
		isSubmitting: updateResource.isPending,
		handleSubmit
	};
}
