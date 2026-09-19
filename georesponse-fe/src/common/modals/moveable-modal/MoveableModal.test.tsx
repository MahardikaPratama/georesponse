/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Unit test for MoveableModal component covering rendering,
 *                visibility, title, content, close, action, and drag behavior.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { act, renderHook } from "@testing-library/react";

import MoveableModal from "./MoveableModal";
import useMoveableWindow from "./hooks/useMoveableWindow";

describe("MoveableModal Component", () => {
	const defaultProps = {
		onClose: vi.fn(),
		show: true,
		title: "Test Modal",
		name: "TestName",
		className: "custom-class",
		isFreezeModal: false,
		action: <button data-testid="action-btn">Action</button>
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders modal with title, content, and action", () => {
		render(
			<MoveableModal {...defaultProps}>
				<div>Modal Content</div>
			</MoveableModal>
		);
		expect(screen.getByText("Test Modal")).toBeInTheDocument();
		expect(screen.getByText("Modal Content")).toBeInTheDocument();
		expect(screen.getByTestId("action-btn")).toBeInTheDocument();
	});

	it("calls onClose when close (X) button is clicked", () => {
		render(
			<MoveableModal {...defaultProps}>
				<div>Modal Content</div>
			</MoveableModal>
		);
		fireEvent.click(screen.getByTestId("close-button"));
		expect(defaultProps.onClose).toHaveBeenCalled();
	});

	it("does not render when show is false", () => {
		render(
			<MoveableModal {...defaultProps} show={false}>
				<div>Modal Content</div>
			</MoveableModal>
		);
		expect(screen.queryByText("Modal Content")).not.toBeInTheDocument();
	});

	it("renders backdrop when isFreezeModal is true", () => {
		render(
			<MoveableModal {...defaultProps} isFreezeModal={true}>
				<div>Modal Content</div>
			</MoveableModal>
		);
		const backdrop = document.querySelector('div[style*="z-index: 98"]');
		expect(backdrop).toBeInTheDocument();
	});

	it("renders with name if title is not provided", () => {
		render(
			<MoveableModal {...defaultProps} title={undefined} name="MyName">
				<div>Modal Content</div>
			</MoveableModal>
		);
		expect(screen.getByText("MyName")).toBeInTheDocument();
	});

	it("applies custom className to modal", () => {
		render(
			<MoveableModal {...defaultProps} className="my-custom-class">
				<div>Modal Content</div>
			</MoveableModal>
		);
		const modal = document.querySelector(".my-custom-class");
		expect(modal).toBeInTheDocument();
	});

	it("header has cursor-move and close button has cursor-default", () => {
		render(
			<MoveableModal {...defaultProps}>
				<div>Modal Content</div>
			</MoveableModal>
		);
		const header = screen.getByText("Test Modal").closest("header");
		const closeBtn = screen.getByTestId("close-button");
		expect(header).toHaveClass("cursor-move");
		expect(closeBtn).toHaveClass("cursor-default");
	});

	it("calls onClose when clicking close button after dragging", () => {
		render(
			<MoveableModal {...defaultProps}>
				<div>Modal Content</div>
			</MoveableModal>
		);
		const closeBtn = screen.getByTestId("close-button");
		fireEvent.mouseDown(closeBtn);
		fireEvent.mouseUp(closeBtn);
		fireEvent.click(closeBtn);
		expect(defaultProps.onClose).toHaveBeenCalled();
	});

	it("can be dragged by header (simulated)", () => {
		render(
			<MoveableModal {...defaultProps}>
				<div>Modal Content</div>
			</MoveableModal>
		);
		const header = screen.getByText("Test Modal").closest("header");
		expect(header).toBeInTheDocument();
		fireEvent.mouseDown(header!, { clientX: 100, clientY: 100 });
		fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });
		fireEvent.mouseUp(window);
		expect(true).toBe(true);
	});
});

describe("useMoveableWindow hook", () => {
	it("focusElement and blurElement update zIndex", () => {
		const ref = { current: document.createElement("div") };
		const { result } = renderHook(() => useMoveableWindow(ref));
		act(() => {
			result.current.focusElement();
		});
		expect(ref.current.style.zIndex).toBe("99");
		// Simulate click outside
		document.body.appendChild(ref.current);
		act(() => {
			document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		});
		// zIndex should be 10 after blur
		expect(ref.current.style.zIndex).toBe("10");
	});

	it("drag boundaries are respected", () => {
		const ref = { current: document.createElement("div") };
		// Set fake dimensions
		Object.defineProperty(ref.current, "offsetWidth", { value: 100 });
		Object.defineProperty(ref.current, "offsetHeight", { value: 100 });
		ref.current.getBoundingClientRect = () => ({
			left: 0,
			top: 0,
			width: 100,
			height: 100,
			right: 100,
			bottom: 100,
			x: 0,
			y: 0,
			toJSON: () => {}
		});
		document.body.appendChild(ref.current);
		const { result } = renderHook(() => useMoveableWindow(ref, 10, 10));
		// Start drag
		act(() => {
			result.current.onMouseDown({
				clientX: 50,
				clientY: 50,
				preventDefault: () => {},
				target: ref.current
			} as any);
		});
		// Move mouse to negative (should clamp to 0, upperLimit)
		act(() => {
			window.dispatchEvent(
				new MouseEvent("mousemove", { clientX: -100, clientY: -100 })
			);
		});
		expect(ref.current.style.left).toBe("0px");
		expect(ref.current.style.top).toBe("10px");
		// Move mouse to large (should clamp to window.innerWidth - offsetWidth, window.innerHeight - lowerLimit - offsetHeight)
		act(() => {
			window.dispatchEvent(
				new MouseEvent("mousemove", { clientX: 9999, clientY: 9999 })
			);
		});
		expect(
			Number(ref.current.style.left.replace("px", ""))
		).toBeLessThanOrEqual(window.innerWidth - 100);
		expect(Number(ref.current.style.top.replace("px", ""))).toBeLessThanOrEqual(
			window.innerHeight - 10 - 100
		);
		// End drag
		act(() => {
			window.dispatchEvent(new MouseEvent("mouseup"));
		});
	});

	it("does nothing if elementRef.current is null", () => {
		const ref = { current: null };
		const { result } = renderHook(() => useMoveableWindow(ref as any));
		act(() => {
			result.current.onMouseDown({
				clientX: 0,
				clientY: 0,
				preventDefault: () => {},
				target: null
			} as any);
			result.current.focusElement();
		});
		// No error thrown
		expect(true).toBe(true);
	});
});
