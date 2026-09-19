/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : Login screen (UC-11). Shown by App.tsx when no user is
 *                authenticated. Presentation only — form state and the
 *                login mutation live in useLoginForm.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Restyled using the shared Button/Alert components
 *                        (common/) instead of raw HTML controls, matching
 *                        the app's dark theme and toast-style error
 *                        feedback.
 */
import React, { useEffect, useState } from "react";

import { ApiError } from "@api/httpClient.types";

import Alert from "@common/alert/Alert";
import { Button } from "@common/button/Button";

import { useLoginForm } from "./useLoginForm";

const fieldClassName =
	"h-11 rounded-md border border-transparent bg-background-100-1 px-3 text-white " +
	"outline-none transition-colors placeholder:text-neutral-3 " +
	"focus:border-primary-20 disabled:cursor-not-allowed disabled:opacity-50";

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

	const [alertOpen, setAlertOpen] = useState(false);

	useEffect(() => {
		setAlertOpen(error instanceof ApiError);
	}, [error]);

	return (
		<div className="flex items-center justify-center w-screen h-screen bg-background-100-1">
			<Alert
				isOpen={alertOpen}
				handleClose={() => setAlertOpen(false)}
				variant="error"
				title="Sign in failed"
				message={error instanceof ApiError ? error.message : ""}
				position="top-center"
			/>

			<form
				onSubmit={handleSubmit}
				className="flex flex-col w-full max-w-sm gap-5 p-8 border rounded-xl border-accent-3 bg-background-100-2"
			>
				<div>
					<h1 className="text-2xl font-bold text-white">GeoResponse</h1>
					<p className="mt-1 text-sm text-neutral-3">
						Sign in to manage disaster response resources
					</p>
				</div>

				<label
					className="flex flex-col gap-1 text-sm text-neutral-2"
					htmlFor="identifier"
				>
					Identifier
					<input
						id="identifier"
						type="text"
						value={identifier}
						onChange={(event) => setIdentifier(event.target.value)}
						required
						autoComplete="username"
						disabled={isSubmitting}
						className={fieldClassName}
					/>
				</label>

				<label
					className="flex flex-col gap-1 text-sm text-neutral-2"
					htmlFor="password"
				>
					Password
					<input
						id="password"
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						required
						autoComplete="current-password"
						disabled={isSubmitting}
						className={fieldClassName}
					/>
				</label>

				<Button
					type="submit"
					loading={isSubmitting}
					disabled={isSubmitting}
					fullWidth
					dataTestId="login-submit"
				>
					Sign in
				</Button>
			</form>
		</div>
	);
}

export default LoginForm;
