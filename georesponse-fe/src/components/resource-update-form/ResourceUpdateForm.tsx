/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : The update-resource form's fields (FR-004, UC-07): id
 *                shown read-only (BR-015 — identity is preserved across an
 *                update, so it isn't an editable field here), name, type,
 *                and type-specific attributes. Field-level errors render
 *                under their field; anything unmapped renders as a
 *                form-level error, same convention as ResourceCreateForm.
 *                Presentation only — state and submission live in
 *                useResourceUpdateForm, owned by this component's
 *                container, UpdateResourceModal.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Built its type options from the new shared
 *                        RESOURCE_TYPE_OPTIONS instead of its own copy of
 *                        the same Object.keys(...).map(...) (Phase 6
 *                        section 9.6).
 */
import React from "react";

import Dropdown from "@common/dropdowns/dropdown/Dropdown";
import { RESOURCE_ATTRIBUTE_SCHEMA } from "@constants/resourceAttributeSchema.constants";
import { RESOURCE_TYPE_OPTIONS } from "@constants/resourceStatus.constants";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { ResourceType } from "../../types/resource.types";

import { ResourceUpdateFormProps } from "./ResourceUpdateForm.types";

const fieldClassName =
	"h-10 rounded-md border border-transparent bg-background-100-1 px-3 text-sm text-white " +
	"outline-none transition-colors placeholder:text-neutral-3 focus:border-primary-20";

function FieldError({ message }: { message?: string }) {
	if (!message) return null;
	return (
		<p role="alert" className="mt-1 text-xs text-error-4">
			{message}
		</p>
	);
}

function ResourceUpdateForm({
	id,
	state,
	dispatch,
	errors,
	formError,
	isSubmitting
}: ResourceUpdateFormProps) {
	return (
		<div className="flex flex-col w-full max-w-md gap-3 px-6 text-white">
			<h2 className="text-lg font-bold">Edit Resource</h2>

			<FieldError message={formError ?? undefined} />

			<div className="flex flex-col gap-1 text-sm">
				ID
				<p className="h-10 flex items-center px-3 rounded-md bg-white/5 text-neutral-3">
					{id}
				</p>
			</div>

			<label className="flex flex-col gap-1 text-sm" htmlFor="resource-update-name">
				Name
				<input
					id="resource-update-name"
					value={state.name}
					onChange={(event) => dispatch({ type: "SET_NAME", value: event.target.value })}
					disabled={isSubmitting}
					className={fieldClassName}
				/>
				<FieldError message={errors.name} />
			</label>

			<div className="flex flex-col gap-1 text-sm">
				Type
				<Dropdown
					value={state.type}
					options={RESOURCE_TYPE_OPTIONS}
					disabled={isSubmitting}
					inputHeight="h-10"
					fontSize="text-sm"
					onChange={(value) => dispatch({ type: "SET_TYPE", value: value as ResourceType })}
				/>
				<FieldError message={errors.type} />
			</div>

			<div className="grid grid-cols-2 gap-3">
				{RESOURCE_ATTRIBUTE_SCHEMA[state.type].map((field) => (
					<label
						key={field.key}
						className="flex flex-col gap-1 text-sm"
						htmlFor={`resource-update-attribute-${field.key}`}
					>
						{field.label}
						<input
							id={`resource-update-attribute-${field.key}`}
							type={field.kind === "number" ? "number" : "text"}
							value={state.attributes[field.key] ?? ""}
							onChange={(event) =>
								dispatch({
									type: "SET_ATTRIBUTE",
									key: field.key,
									value: event.target.value
								})
							}
							disabled={isSubmitting}
							className={fieldClassName}
						/>
						<FieldError message={errors[`attributes.${field.key}`]} />
					</label>
				))}
			</div>
		</div>
	);
}

export default ResourceUpdateForm;
