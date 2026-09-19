/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Modal component that displays its children in a centered dialog with
 *                Cancel and Confirm buttons.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React, { useEffect, useRef } from "react";
import { GoX } from "react-icons/go";

import { Button } from "@common/button/Button";

import { logger } from "@utils/logger/logger";

interface ModalProps {
	handleClose: () => void;
	handleConfirm: () => void;
	children: React.ReactNode;
	label?: string;
	className?: string;
	loading?: boolean;
	disabled?: boolean;
}

/**
 * Modal component that displays its children in a centered dialog with Cancel and Confirm buttons.
 *
 * @param {Object} props - The props for the Modal component.
 * @param {() => void} props.handleClose - Function to call when closing the modal.
 * @param {() => void} props.handleConfirm - Function to call when confirming the modal action.
 * @param {React.ReactNode} props.children - The content to display inside the modal.
 * @param {string} [props.label] - The label for the confirm button.
 * @param {string} [props.className] - Additional class names for the confirm button.
 * @param {boolean} [props.loading] - Whether the confirm action is in progress.
 * @param {boolean} [props.disabled] - Whether the modal actions should be disabled.
 * @returns {JSX.Element} The rendered modal component.
 */
const Modal: React.FC<ModalProps> = ({
	handleClose,
	handleConfirm,
	children,
	label,
	className,
	loading = false,
	disabled = false
}) => {
	const modalRef = useRef<HTMLDivElement>(null);
	/**
	 * Adds an event listener to detect clicks outside the modal and close it.
	 * When the component mounts, it adds the "mousedown" event listener to the document.
	 * When the component unmounts or handleClose changes, it removes the event listener.
	 */
	useEffect(() => {
		/**
		 * Handles clicks outside the modal to trigger handleClose.
		 * @param {MouseEvent} event - The mouse event.
		 */
		const handleClickOutside = (event: MouseEvent) => {
			try {
				if (
					modalRef.current &&
					event.target instanceof Node &&
					!modalRef.current.contains(event.target)
				) {
					handleClose();
				}
			} catch (error) {
				logger.error("Error in handleClickOutside", "Modal", error);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [handleClose]);

	return (
		<>
			<div className="fixed inset-0 z-50 bg-black opacity-50"></div>
			<div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto">
				<div ref={modalRef} className={`relative my-6 mx-auto`}>
					<div className="flex flex-col gap-[12px] py-[26px] rounded-2xl shadow-dark-lg bg-accent-3 relative">
						<button
							className="absolute top-3 right-3 hover:bg-neutral-3 rounded-[2px] active:bg-transparent p-1"
							onClick={handleClose}
							data-testid="close-button"
							disabled={loading || disabled}
						>
							<GoX className="w-6 h-6 font-bold text-white" />
						</button>
						{children}
						<div className="flex items-center justify-center gap-6">
							<Button
								onClick={handleClose}
								variant="solid"
								size="big"
								className="bg-neutral-3"
								disabled={loading || disabled}
							>
								Cancel
							</Button>
							<Button
								onClick={handleConfirm}
								variant="solid"
								size="big"
								className={className}
								loading={loading}
								disabled={disabled}
							>
								{label}
							</Button>
						</div>
					</div>
				</div>
			</div>
			<div className="fixed inset-0 z-10 bg-blur"></div>
		</>
	);
};

export default Modal;
