/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : The resource list's search + type/status filter controls
 *                (FR-016-019, UC-03, UC-04). The search input is debounced
 *                before it reaches `filters` (FRONTEND_UI_UX.md section 4);
 *                the type and status controls are closed dropdowns
 *                populated from the fixed DOMAIN_MODEL.md enums, not free
 *                text, and change `filters` immediately since a selection
 *                is a discrete action, not typing.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 * - 1.1.0 (2026-09-19): Built its type/status options from the new shared
 *                        RESOURCE_TYPE_OPTIONS/RESOURCE_STATUS_OPTIONS
 *                        instead of its own copy of the same
 *                        Object.keys(...).map(...) (Phase 6 section 9.6).
 */
import React, { useEffect, useRef, useState } from "react";

import Dropdown from "@common/dropdowns/dropdown/Dropdown";
import {
	RESOURCE_STATUS_OPTIONS,
	RESOURCE_TYPE_OPTIONS
} from "@constants/resourceStatus.constants";
import { useDebouncedValue } from "@hooks/useDebouncedValue";

// See resourceApi.ts for why this is a relative import, not "@types/...".
import { ResourceStatus, ResourceType } from "../../types/resource.types";

import { ResourceFilterBarProps } from "./ResourceFilterBar.types";

const ALL_VALUE = "";

const TYPE_OPTIONS = [{ value: ALL_VALUE, label: "All types" }, ...RESOURCE_TYPE_OPTIONS];

const STATUS_OPTIONS = [
	{ value: ALL_VALUE, label: "All statuses" },
	...RESOURCE_STATUS_OPTIONS
];

const SEARCH_DEBOUNCE_MS = 300;

function ResourceFilterBar({ filters, onFiltersChange }: ResourceFilterBarProps) {
	const [searchInput, setSearchInput] = useState(filters.search ?? "");
	const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
	const isFirstRender = useRef(true);

	// Fires once the debounced search text settles, folding it into the
	// current filters (so a type/status change made in the meantime isn't
	// clobbered). Skips the mount run — debouncedSearch "changing" from
	// undefined to its initial value on mount isn't a user edit.
	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		onFiltersChange({
			...filters,
			search: debouncedSearch || undefined
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedSearch]);

	return (
		<div className="flex flex-col gap-2 mb-3">
			<input
				type="search"
				value={searchInput}
				onChange={(event) => setSearchInput(event.target.value)}
				placeholder="Search resources by name…"
				aria-label="Search resources"
				className="w-full px-3 text-sm text-white rounded-md h-9 bg-background-100-1 placeholder:text-neutral-3 focus:outline-none focus:border-primary-20 border border-transparent"
			/>

			<div className="flex gap-2">
				<Dropdown
					value={filters.type ?? ALL_VALUE}
					options={TYPE_OPTIONS}
					placeholder="All types"
					inputHeight="h-9"
					fontSize="text-sm"
					onChange={(value) =>
						onFiltersChange({
							...filters,
							type: value === ALL_VALUE ? undefined : (value as ResourceType)
						})
					}
				/>
				<Dropdown
					value={filters.status ?? ALL_VALUE}
					options={STATUS_OPTIONS}
					placeholder="All statuses"
					inputHeight="h-9"
					fontSize="text-sm"
					onChange={(value) =>
						onFiltersChange({
							...filters,
							status: value === ALL_VALUE ? undefined : (value as ResourceStatus)
						})
					}
				/>
			</div>
		</div>
	);
}

export default ResourceFilterBar;
