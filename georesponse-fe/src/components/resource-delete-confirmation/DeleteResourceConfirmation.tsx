/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : The delete confirmation dialog (FR-005, UC-10 step 2),
 *                built on the shared Modal component (its Cancel/Confirm
 *                buttons are exactly this pattern). Cancelling leaves the
 *                resource unchanged (UC-10 alternative flow) — Modal's
 *                Cancel/close just calls onClose, no mutation involved.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";

import Modal from "@common/modals/modal/Modal";
import { useDeleteResource } from "@hooks/useDeleteResource";
import { getApiErrorMessage } from "@utils/apiErrorMessage";

interface DeleteResourceConfirmationProps {
	resourceId: string;
	resourceName: string;
	onClose: () => void;
	onDeleted: () => void;
}

function DeleteResourceConfirmation({
	resourceId,
	resourceName,
	onClose,
	onDeleted
}: DeleteResourceConfirmationProps) {
	const deleteResource = useDeleteResource(resourceId);

	return (
		<Modal
			handleClose={onClose}
			handleConfirm={() => deleteResource.mutate(undefined, { onSuccess: onDeleted })}
			label="Delete"
			className="bg-error-4 hover:bg-error-4/80"
			loading={deleteResource.isPending}
		>
			<div className="flex flex-col gap-2 px-6 text-white">
				<h2 className="text-lg font-bold">Delete resource?</h2>
				<p className="text-sm text-neutral-3">
					This will permanently delete <span className="font-medium text-white">{resourceName}</span>.
					This cannot be undone.
				</p>
				{deleteResource.isError && (
					<p role="alert" className="text-xs text-error-4">
						{getApiErrorMessage(deleteResource.error)}
					</p>
				)}
			</div>
		</Modal>
	);
}

export default DeleteResourceConfirmation;
