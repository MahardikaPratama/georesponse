/*
 * Author       : Mahardika Pratama
 * Version      : 1.2.0
 * Created Date : 2026-09-19
 * Description  : The create-resource form's fields (FR-001, FR-006-009,
 *                FR-013-015, UC-06): id, name, type, status, type-specific
 *                attributes, and location, per FRONTEND_UI_UX.md section
 *                6. Field-level errors (client-side validation and,
 *                per FR-043, backend `details`) render under their field;
 *                anything that can't be mapped to a field renders as a
 *                form-level error. Presentation only — state and
 *                submission live in useResourceCreateForm, owned by this
 *                component's container, CreateResourceModal.
 *
 *                Location can be typed directly or filled in by
 *                double-clicking the map before opening this form — see
 *                AppShell's onMapDoubleClick — per FRONTEND_UI_UX.md
 *                section 6's map-click placement.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Built its type/status options from the new shared
 *                        RESOURCE_TYPE_OPTIONS/RESOURCE_STATUS_OPTIONS
 *                        instead of its own copy of the same
 *                        Object.keys(...).map(...) (Phase 6 section 9.6).
 * - 1.2.0 (2026-09-19): Latitude/longitude (and numeric attribute fields)
 *                        switched from `type="number"` to `type="text"`
 *                        with `inputMode="decimal"`/`"numeric"` — the native
 *                        number input's up/down spinner served no purpose
 *                        for coordinates and was the only thing forcing a
 *                        click into the field before typing. Added
 *                        placeholders to every field, a hint when latitude/
 *                        longitude were filled in from a map double-click,
 *                        and a tip pointing at that feature.
 */
import React from "react";

import Dropdown from "@common/dropdowns/dropdown/Dropdown";
import {
	RESOURCE_STATUS_OPTIONS,
	RESOURCE_TYPE_OPTIONS
} from "@constants/resourceStatus.constants";
import { RESOURCE_ATTRIBUTE_SCHEMA } from "@constants/resourceAttributeSchema.constants";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { ResourceStatus, ResourceType } from "../../types/resource.types";

import { ResourceCreateFormProps } from "./ResourceCreateForm.types";

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

function ResourceCreateForm({
	state,
	dispatch,
	errors,
	formError,
	isSubmitting,
	locationPrefilled
}: ResourceCreateFormProps) {
	return (
		<div className="flex flex-col w-full max-w-md gap-3 px-6 text-white">
			<h2 className="text-lg font-bold">New Resource</h2>
			<p className="-mt-2 text-xs text-neutral-3">
				Tip: close this and double-click a spot on the map to open this form with
				latitude/longitude already filled in.
			</p>

			<FieldError message={formError ?? undefined} />

			<label className="flex flex-col gap-1 text-sm" htmlFor="resource-id">
				ID
				<input
					id="resource-id"
					value={state.id}
					onChange={(event) => dispatch({ type: "SET_ID", value: event.target.value })}
					disabled={isSubmitting}
					placeholder="e.g. resource-006"
					className={fieldClassName}
				/>
				<FieldError message={errors.id} />
			</label>

			<label className="flex flex-col gap-1 text-sm" htmlFor="resource-name">
				Name
				<input
					id="resource-name"
					value={state.name}
					onChange={(event) => dispatch({ type: "SET_NAME", value: event.target.value })}
					disabled={isSubmitting}
					placeholder="e.g. Ambulance Unit 2 - Jakarta Pusat"
					className={fieldClassName}
				/>
				<FieldError message={errors.name} />
			</label>

			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1 text-sm">
					Type
					<Dropdown
						value={state.type}
						options={RESOURCE_TYPE_OPTIONS}
						disabled={isSubmitting}
						inputHeight="h-10"
						fontSize="text-sm"
						onChange={(value) =>
							dispatch({ type: "SET_TYPE", value: value as ResourceType })
						}
					/>
					<FieldError message={errors.type} />
				</div>

				<div className="flex flex-col gap-1 text-sm">
					Status
					<Dropdown
						value={state.status}
						options={RESOURCE_STATUS_OPTIONS}
						disabled={isSubmitting}
						inputHeight="h-10"
						fontSize="text-sm"
						onChange={(value) =>
							dispatch({ type: "SET_STATUS", value: value as ResourceStatus })
						}
					/>
					<FieldError message={errors.status} />
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				{RESOURCE_ATTRIBUTE_SCHEMA[state.type].map((field) => (
					<label
						key={field.key}
						className="flex flex-col gap-1 text-sm"
						htmlFor={`resource-attribute-${field.key}`}
					>
						{field.label}
						<input
							id={`resource-attribute-${field.key}`}
							type="text"
							inputMode={field.kind === "number" ? "numeric" : "text"}
							value={state.attributes[field.key] ?? ""}
							onChange={(event) =>
								dispatch({
									type: "SET_ATTRIBUTE",
									key: field.key,
									value: event.target.value
								})
							}
							disabled={isSubmitting}
							placeholder={field.kind === "number" ? "e.g. 4" : `e.g. ${field.label}`}
							className={fieldClassName}
						/>
						<FieldError message={errors[`attributes.${field.key}`]} />
					</label>
				))}
			</div>

			<div className="grid grid-cols-2 gap-3">
				<label className="flex flex-col gap-1 text-sm" htmlFor="resource-latitude">
					Latitude
					<input
						id="resource-latitude"
						type="text"
						inputMode="decimal"
						value={state.latitude}
						onChange={(event) =>
							dispatch({ type: "SET_LATITUDE", value: event.target.value })
						}
						disabled={isSubmitting}
						placeholder="e.g. -6.2088"
						className={fieldClassName}
					/>
					<FieldError message={errors["location.latitude"]} />
				</label>

				<label className="flex flex-col gap-1 text-sm" htmlFor="resource-longitude">
					Longitude
					<input
						id="resource-longitude"
						type="text"
						inputMode="decimal"
						value={state.longitude}
						onChange={(event) =>
							dispatch({ type: "SET_LONGITUDE", value: event.target.value })
						}
						disabled={isSubmitting}
						placeholder="e.g. 106.8456"
						className={fieldClassName}
					/>
					<FieldError message={errors["location.longitude"]} />
				</label>

				{locationPrefilled && (
					<p className="col-span-2 -mt-1 text-xs text-primary-50">
						Filled in from where you double-clicked the map.
					</p>
				)}
			</div>
		</div>
	);
}

export default ResourceCreateForm;
