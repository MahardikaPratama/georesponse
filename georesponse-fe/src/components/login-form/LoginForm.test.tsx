/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tests LoginForm's submit flow and error display, with
 *                authApi mocked so no real network call is made.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { authApi } from "@api/auth/authApi";
import { ApiError } from "@api/httpClient.types";

import LoginForm from "./LoginForm";

vi.mock("@api/auth/authApi", () => ({
	authApi: { login: vi.fn(), logout: vi.fn(), me: vi.fn() }
}));

function renderWithQueryClient(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
	});
	return render(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
	);
}

describe("LoginForm", () => {
	it("submits the entered identifier and password", async () => {
		vi.mocked(authApi.login).mockResolvedValueOnce({
			data: { id: "user-001", name: "Demo Administrator", roles: ["administrator"] }
		});

		renderWithQueryClient(<LoginForm />);

		fireEvent.change(screen.getByLabelText(/identifier/i), {
			target: { value: "user-001" }
		});
		fireEvent.change(screen.getByLabelText(/password/i), {
			target: { value: "ChangeMe123!" }
		});
		fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

		await waitFor(() => {
			expect(authApi.login).toHaveBeenCalledWith({
				identifier: "user-001",
				password: "ChangeMe123!"
			});
		});
	});

	it("shows the server's error message when login fails", async () => {
		vi.mocked(authApi.login).mockRejectedValueOnce(
			new ApiError(401, { code: "AUTHENTICATION_FAILED", message: "Invalid credentials" })
		);

		renderWithQueryClient(<LoginForm />);

		fireEvent.change(screen.getByLabelText(/identifier/i), {
			target: { value: "user-001" }
		});
		fireEvent.change(screen.getByLabelText(/password/i), {
			target: { value: "wrong-password" }
		});
		fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Invalid credentials"
		);
	});
});
