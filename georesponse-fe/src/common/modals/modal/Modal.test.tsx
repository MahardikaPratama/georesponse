/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Unit test for Modal component covering rendering logic, visibility,
 *                title, content, and action buttons.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";

import Modal from "./Modal";

describe("Modal Component", () => {
	const defaultProps = {
		handleClose: vi.fn(),
		handleConfirm: vi.fn(),
		label: "Confirm",
		className: "custom-class",
		loading: false,
		disabled: false
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders children and buttons", () => {
		render(
			<Modal {...defaultProps}>
				<div>Modal Content</div>
			</Modal>
		);
		expect(screen.getByText("Modal Content")).toBeInTheDocument();
		expect(screen.getByText("Cancel")).toBeInTheDocument();
		expect(screen.getByText("Confirm")).toBeInTheDocument();
	});

	it("calls handleClose when Cancel button is clicked", () => {
		render(
			<Modal {...defaultProps}>
				<div>Modal Content</div>
			</Modal>
		);
		fireEvent.click(screen.getByText("Cancel"));
		expect(defaultProps.handleClose).toHaveBeenCalled();
	});

	it("calls handleConfirm when Confirm button is clicked", () => {
		render(
			<Modal {...defaultProps}>
				<div>Modal Content</div>
			</Modal>
		);
		fireEvent.click(screen.getByText("Confirm"));
		expect(defaultProps.handleConfirm).toHaveBeenCalled();
	});

	it("calls handleClose when close (X) button is clicked", () => {
		render(
			<Modal {...defaultProps}>
				<div>Modal Content</div>
			</Modal>
		);
		fireEvent.click(screen.getByTestId("close-button"));
		expect(defaultProps.handleClose).toHaveBeenCalled();
	});

	it("disables buttons when loading or disabled is true", () => {
		const { rerender } = render(
			<Modal {...defaultProps} loading={true}>
				<div>Modal Content</div>
			</Modal>
		);
		expect(screen.getByText("Cancel")).toBeDisabled();
		expect(screen.getByTestId("close-button")).toBeDisabled();

		rerender(
			<Modal {...defaultProps} loading={false} disabled={true}>
				<div>Modal Content</div>
			</Modal>
		);
		expect(screen.getByText("Cancel")).toBeDisabled();
		expect(screen.getByTestId("close-button")).toBeDisabled();
		expect(screen.getByText("Confirm")).toBeDisabled();
	});

	it("applies custom className to Confirm button", () => {
		render(
			<Modal {...defaultProps} className="my-custom-class">
				<div>Modal Content</div>
			</Modal>
		);
		const confirmBtn = screen.getByText("Confirm");
		expect(confirmBtn.closest("button")).toHaveClass("my-custom-class");
	});

	it("calls handleClose when clicking outside the modal", () => {
		render(
			<Modal {...defaultProps}>
				<div>Modal Content</div>
			</Modal>
		);
		// Simulate click outside modal
		fireEvent.mouseDown(document.body);
		expect(defaultProps.handleClose).toHaveBeenCalled();
	});

	it("renders without label and className", () => {
		render(
			<Modal
				handleClose={defaultProps.handleClose}
				handleConfirm={defaultProps.handleConfirm}
			>
				<div>Modal Content</div>
			</Modal>
		);
		expect(screen.getByText("Cancel")).toBeInTheDocument();
	});
});
