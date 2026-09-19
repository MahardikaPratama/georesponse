/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Container hook for LoginForm: owns the form's client
 *                state (identifier/password, both local — never server
 *                state) and drives the login mutation.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { FormEvent, useState } from "react";

import { useLogin } from "@hooks/useLogin";

export function useLoginForm() {
	const [identifier, setIdentifier] = useState("");
	const [password, setPassword] = useState("");
	const login = useLogin();

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		login.mutate({ identifier, password });
	}

	return {
		identifier,
		setIdentifier,
		password,
		setPassword,
		handleSubmit,
		isSubmitting: login.isPending,
		error: login.error
	};
}
