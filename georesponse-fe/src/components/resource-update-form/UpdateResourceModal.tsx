/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Wraps ResourceUpdateForm in the shared Modal component,
 *                pre-filled from GET /api/v1/resources/{id} (UC-07).
 *                Split into two components because useResourceUpdateForm
 *                needs the fetched resource to initialize its reducer —
 *                UpdateResourceModal handles useResource's loading/error
 *                states, and only mounts UpdateResourceModalForm (which
 *                owns that hook) once the resource is available.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";

import { useResource } from "@hooks/useResource";
import Modal from "@common/modals/modal/Modal";

import { getApiErrorMessage } from "@utils/apiErrorMessage";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { Resource } from "../../types/resource.types";

import ResourceUpdateForm from "./ResourceUpdateForm";
import { useResourceUpdateForm } from "./useResourceUpdateForm";

interface UpdateResourceModalProps {
	resourceId: string;
	onClose: () => void;
}

function UpdateResourceModalForm({
	resource,
	onClose
}: {
	resource: Resource;
	onClose: () => void;
}) {
	const { state, dispatch, errors, formError, isSubmitting, handleSubmit } =
		useResourceUpdateForm(resource, onClose);

	return (
		<Modal handleClose={onClose} handleConfirm={handleSubmit} label="Save" loading={isSubmitting}>
			<ResourceUpdateForm
				id={resource.id}
				state={state}
				dispatch={dispatch}
				errors={errors}
				formError={formError}
				isSubmitting={isSubmitting}
			/>
		</Modal>
	);
}

function UpdateResourceModal({ resourceId, onClose }: UpdateResourceModalProps) {
	const { data, status, error } = useResource(resourceId);

	if (status === "pending") {
		return (
			<Modal handleClose={onClose} handleConfirm={onClose} label="Close" disabled>
				<p className="px-6 text-sm text-white">Loading…</p>
			</Modal>
		);
	}

	if (status === "error") {
		return (
			<Modal handleClose={onClose} handleConfirm={onClose} label="Close">
				<p role="alert" className="px-6 text-sm text-white">
					{getApiErrorMessage(error)}
				</p>
			</Modal>
		);
	}

	return <UpdateResourceModalForm resource={data.data} onClose={onClose} />;
}

export default UpdateResourceModal;
