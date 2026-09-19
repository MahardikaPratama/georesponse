/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Returns `value`, delayed by `delayMs` after it last
 *                changed. Used by the resource search input so the backend
 *                is not queried on every keystroke.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timeoutId = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timeoutId);
	}, [value, delayMs]);

	return debounced;
}
