/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Login screen (UC-11). Shown by App.tsx when no user is
 *                authenticated. Presentation only — form state and the
 *                login mutation live in useLoginForm.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import React from "react";

import { ApiError } from "@api/httpClient.types";

import { useLoginForm } from "./useLoginForm";

function LoginForm() {
	const {
		identifier,
		setIdentifier,
		password,
		setPassword,
		handleSubmit,
		isSubmitting,
		error
	} = useLoginForm();

	return (
		<div className="flex items-center justify-center w-screen h-screen text-white bg-background-100-1">
			<form
				onSubmit={handleSubmit}
				className="flex flex-col w-full max-w-sm gap-4 p-8"
			>
				<h1 className="text-2xl font-bold">GeoResponse</h1>

				<label className="flex flex-col gap-1 text-sm" htmlFor="identifier">
					Identifier
					<input
						id="identifier"
						type="text"
						value={identifier}
						onChange={(event) => setIdentifier(event.target.value)}
						required
						autoComplete="username"
						className="px-3 py-2 text-black rounded-md"
					/>
				</label>

				<label className="flex flex-col gap-1 text-sm" htmlFor="password">
					Password
					<input
						id="password"
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						required
						autoComplete="current-password"
						className="px-3 py-2 text-black rounded-md"
					/>
				</label>

				{error instanceof ApiError && (
					<p role="alert" className="text-sm text-indicator-error">
						{error.message}
					</p>
				)}

				<button
					type="submit"
					disabled={isSubmitting}
					className="px-4 py-2 rounded-md bg-indicator-active disabled:opacity-50"
				>
					{isSubmitting ? "Signing in..." : "Sign in"}
				</button>
			</form>
		</div>
	);
}

export default LoginForm;
