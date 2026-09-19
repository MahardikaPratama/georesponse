/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : A reusable custom React hook to make any referenced DOM element
 *                draggable, with boundary limits and automatic z-index management.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import {
	RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState
} from "react";

type UseMoveableWindowResult = {
	elementRef: RefObject<HTMLDivElement>;
	onMouseDown: (e: MouseEvent | React.MouseEvent) => void;
	onMouseUp: () => void;
	isMovedRef: React.MutableRefObject<boolean>;
	focusElement: () => void;
};

/**
 * Custom hook that makes a referenced DOM element moveable by dragging it with the mouse.
 *
 * @param {RefObject<HTMLDivElement>} elementRef - A ref to the DOM element that should be moveable.
 * @param {number} [upperLimit=115] - The top boundary (in pixels) the element can be dragged to.
 * @param {number} [lowerLimit=64] - The bottom boundary buffer (in pixels) from the window bottom.
 * @returns {UseMoveableWindowResult} Object containing drag handlers and refs.
 */
const useMoveableWindow = (
	elementRef: RefObject<HTMLDivElement>,
	upperLimit: number = 115,
	lowerLimit: number = 64
): UseMoveableWindowResult => {
	const [isDragging, setIsDragging] = useState(false);
	const [offsetX, setOffsetX] = useState(0);
	const [offsetY, setOffsetY] = useState(0);
	const isMovedRef = useRef(false);
	/**
	 * Starts the drag behavior by calculating offset from the mouse position.
	 * @param {MouseEvent | React.MouseEvent} e - The mouse event triggering the drag.
	 */
	const onMouseDown = useCallback(
		(e: MouseEvent | React.MouseEvent) => {
			if (!elementRef.current) return;
			setIsDragging(true);
			const rect = elementRef.current.getBoundingClientRect();
			setOffsetX(e.clientX - rect.left);
			setOffsetY(e.clientY - rect.top);
		},
		[elementRef]
	);
	/**
	 * Ends the drag behavior.
	 */
	const onMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);
	/**
	 * Brings the element to the front by increasing its z-index.
	 */
	const focusElement = useCallback(() => {
		if (elementRef.current) {
			elementRef.current.style.zIndex = "99";
		}
	}, [elementRef]);
	/**
	 * Sends the element to the background by reducing its z-index.
	 */
	const blurElement = useCallback(() => {
		if (elementRef.current) {
			elementRef.current.style.zIndex = "10";
		}
	}, [elementRef]);

	useEffect(() => {
		/**
		 * Handles click outside the element to trigger blur.
		 *
		 * @param {MouseEvent} e - The mouse event triggered by a document click.
		 */
		const handleClickOutside = (e: MouseEvent) => {
			if (
				elementRef.current &&
				!elementRef.current.contains(e.target as Node)
			) {
				blurElement();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [elementRef]);

	useEffect(() => {
		/**
		 * Updates the element's position while dragging, respecting window boundaries.
		 *
		 * @param {MouseEvent} e - The mouse event triggered during dragging.
		 */
		const onMouseMove = (e: MouseEvent) => {
			if (!elementRef.current || !isDragging) return;

			e.preventDefault();
			const x = e.clientX - offsetX;
			const y = e.clientY - offsetY;

			const el = elementRef.current;
			const boundedX = Math.max(
				0,
				Math.min(x, window.innerWidth - el.offsetWidth)
			);
			const boundedY = Math.max(
				upperLimit,
				Math.min(y, window.innerHeight - lowerLimit - el.offsetHeight)
			);

			el.style.transform = "none";
			el.style.left = `${boundedX}px`;
			el.style.top = `${boundedY}px`;

			isMovedRef.current = true;
		};

		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
		return () => {
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
		};
	}, [isDragging, offsetX, offsetY, upperLimit, lowerLimit, elementRef]);

	return useMemo(
		() => ({
			elementRef,
			onMouseDown,
			onMouseUp,
			isMovedRef,
			focusElement
		}),
		[elementRef, onMouseDown, onMouseUp, isMovedRef, focusElement]
	);
};

export default useMoveableWindow;
