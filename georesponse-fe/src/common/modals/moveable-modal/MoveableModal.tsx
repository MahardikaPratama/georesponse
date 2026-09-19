/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Reusable, draggable modal component that supports z-index stacking,
 *                moveable positioning, and flexible content/action rendering.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React, { ReactNode, memo, useCallback, useRef } from "react";
import { GoX } from "react-icons/go";

import { cn } from "@utils/cn";
import useMoveableWindow from "./hooks/useMoveableWindow";

type MoveableModalProps = {
	children: ReactNode;
	className?: string;
	icon?: ReactNode;
	name?: string;
	title?: string | ReactNode;
	onClose: () => void;
	show: boolean;
	action?: ReactNode;
	isFreezeModal?: boolean;
};

type ContentProps = {
	children: ReactNode;
	name?: string;
	title?: string | ReactNode;
	onClose: () => void;
	elementRef: React.RefObject<HTMLDivElement>;
	action?: ReactNode;
};
/**
 * Renders the draggable header and content area of the modal.
 * Includes the title, optional actions, and close button.
 *
 * @param {ContentProps} props - Props for rendering modal header and body.
 * @returns {JSX.Element} The content section of the modal.
 */
const Content = memo(function Content({
	children,
	name,
	title,
	onClose,
	elementRef,
	action
}: ContentProps) {
	const { onMouseDown, onMouseUp } = useMoveableWindow(elementRef);

	return (
		<>
			<header
				aria-hidden
				className="flex items-center justify-between w-full text-white cursor-move bg-bg1-100"
				onMouseDown={onMouseDown}
				onMouseUp={onMouseUp}
			>
				<h1 className="font-semibold text-white text-[24px] select-none">
					{title ?? name}
				</h1>
				<div className="flex items-center gap-1">
					{action}
					<button
						className="hover:bg-bg3-100 rounded-[2px] active:bg-transparent cursor-default"
						data-testid="close-button"
						onClick={onClose}
					>
						<GoX className="font-bold h-7 w-7" />
					</button>
				</div>
			</header>
			{children}
		</>
	);
});
/**
 * A draggable modal window component.
 * It centers itself on screen and can be moved by dragging its header.
 *
 * @param {MoveableModalProps} props - Props to control modal appearance and behavior.
 * @returns {JSX.Element} A fully rendered, movable modal dialog.
 */
const MoveableModal = memo(function MoveableModal({
	children,
	className = "",
	name,
	title,
	onClose,
	show,
	action,
	isFreezeModal,
	...props
}: MoveableModalProps) {
	const elementRef = useRef<HTMLDivElement>(null);
	/**
	 * Brings the modal element to the front by updating its z-index.
	 * This is used when the modal is interacted with to ensure it stacks above other elements.
	 */
	const focusElement = useCallback(() => {
		if (elementRef.current) {
			elementRef.current.style.zIndex = "999";
		}
	}, []);

	const renderBackdrop = isFreezeModal && show;

	return (
		<>
			{renderBackdrop && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: "rgba(0, 0, 0, 0.5)",
						zIndex: 98
					}}
				/>
			)}

			<div
				aria-hidden
				ref={elementRef}
				onMouseDown={focusElement}
				style={{
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)"
				}}
				className={cn(
					`bg-bg1-100 fixed rounded-2xl z-[999] overflow-hidden select-none 
           flex flex-col justify-center items-center border border-neutral-2 shadow-lg ${!show ? "hidden" : "visible"}`,
					className
				)}
				{...props}
			>
				{show && (
					<Content
						name={name}
						title={title}
						onClose={onClose}
						elementRef={elementRef}
						action={action}
					>
						<div className="w-full text-white bg-host-content rounded-xl">
							{children}
						</div>
					</Content>
				)}
			</div>
		</>
	);
});

export default MoveableModal;
