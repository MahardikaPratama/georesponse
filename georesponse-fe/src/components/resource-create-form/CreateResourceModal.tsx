/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Wraps ResourceCreateForm in the shared Modal component:
 *                owns the useResourceCreateForm hook instance and wires
 *                Modal's Confirm button to its submit handler and Cancel/
 *                close to `onClose`. On a successful create, closes itself
 *                (the list/map pick up the new resource via the
 *                invalidated query, per UC-06 step 8 — no manual refresh).
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Added initialLocation, forwarded to
 *                        useResourceCreateForm, so AppShell can open this
 *                        pre-filled from a map double-click, matching
 *                        the map-click placement pattern used elsewhere
 *                        in the app.
 */
import React from "react";

import Modal from "@common/modals/modal/Modal";

import ResourceCreateForm from "./ResourceCreateForm";
import { useResourceCreateForm } from "./useResourceCreateForm";

interface CreateResourceModalProps {
	onClose: () => void;
	initialLocation?: { latitude: number; longitude: number };
}

function CreateResourceModal({ onClose, initialLocation }: CreateResourceModalProps) {
	const { state, dispatch, errors, formError, isSubmitting, handleSubmit } =
		useResourceCreateForm(onClose, initialLocation);

	return (
		<Modal handleClose={onClose} handleConfirm={handleSubmit} label="Create" loading={isSubmitting}>
			<ResourceCreateForm
				state={state}
				dispatch={dispatch}
				errors={errors}
				formError={formError}
				isSubmitting={isSubmitting}
				locationPrefilled={!!initialLocation}
			/>
		</Modal>
	);
}

export default CreateResourceModal;
