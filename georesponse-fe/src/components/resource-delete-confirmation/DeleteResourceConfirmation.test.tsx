/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests DeleteResourceConfirmation: cancelling calls
 *                onClose without deleting anything (UC-10 alternative
 *                flow), confirming deletes and calls onDeleted, and a
 *                failed deletion shows an inline error without closing.
 *                useDeleteResource is mocked so no real network call is
 *                made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@api/httpClient.types";
import { useDeleteResource } from "@hooks/useDeleteResource";

import DeleteResourceConfirmation from "./DeleteResourceConfirmation";

vi.mock("@hooks/useDeleteResource", () => ({
	useDeleteResource: vi.fn()
}));

const mockedUseDeleteResource = vi.mocked(useDeleteResource);

describe("DeleteResourceConfirmation", () => {
	it("shows the resource name and does not delete when cancelled", () => {
		const mutate = vi.fn();
		mockedUseDeleteResource.mockReturnValue({
			mutate,
			isPending: false,
			isError: false,
			error: null
		} as unknown as ReturnType<typeof useDeleteResource>);
		const onClose = vi.fn();
		const onDeleted = vi.fn();

		render(
			<DeleteResourceConfirmation
				resourceId="res-001"
				resourceName="Ambulance 12"
				onClose={onClose}
				onDeleted={onDeleted}
			/>
		);

		expect(screen.getByText("Ambulance 12")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(mutate).not.toHaveBeenCalled();
		expect(onDeleted).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

	it("deletes and calls onDeleted when confirmed", () => {
		const mutate = vi.fn();
		mockedUseDeleteResource.mockReturnValue({
			mutate,
			isPending: false,
			isError: false,
			error: null
		} as unknown as ReturnType<typeof useDeleteResource>);
		const onDeleted = vi.fn();

		render(
			<DeleteResourceConfirmation
				resourceId="res-001"
				resourceName="Ambulance 12"
				onClose={vi.fn()}
				onDeleted={onDeleted}
			/>
		);

		fireEvent.click(screen.getByRole("button", { name: "Delete" }));

		expect(mutate).toHaveBeenCalledWith(
			undefined,
			expect.objectContaining({ onSuccess: onDeleted })
		);
	});

	it("shows an inline error when deletion fails", () => {
		mockedUseDeleteResource.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
			isError: true,
			error: new ApiError(500, { code: "PERSISTENCE_ERROR", message: "boom" })
		} as unknown as ReturnType<typeof useDeleteResource>);

		render(
			<DeleteResourceConfirmation
				resourceId="res-001"
				resourceName="Ambulance 12"
				onClose={vi.fn()}
				onDeleted={vi.fn()}
			/>
		);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"The server could not complete the operation. Please try again."
		);
	});
});
