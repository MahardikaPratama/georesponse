/*
 * Author       : Mahardika Pratama
 * Version      : 1.1.0
 * Created Date : 2026-09-19
 * Description  : Field name lists consumed by InputValidation's optional
 *                per-field behaviors (forced readonly, auto-uppercase,
 *                auto-padding on blur). Deliberately empty by default —
 *                the version this was adapted from hardcoded field names
 *                specific to that project's domain (e.g. AIS "squawk"),
 *                which don't apply to GeoResponse's Resource fields. Add
 *                entries here as a real GeoResponse form needs them.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 * - 1.1.0 (2026-09-19): Emptied the field lists — see Description.
 */

/** Field names that should always be readonly when specified conditions are met. */
export const READONLY_KINEMATIC_FIELDS: readonly string[] = [];

/** Field names that should be automatically converted to uppercase. */
export const UPPERCASE_FIELDS: readonly string[] = [];

/** Field names that require auto-padding with leading zeros on blur. */
export const AUTO_PADDING_FIELDS: Record<string, string> = {};

/** Padding configuration for fields listed in AUTO_PADDING_FIELDS. */
export const FIELD_PADDING_CONFIG: Record<
	string,
	{
		targetLength: number;
		padChar: string;
		padDirection: "start" | "end";
	}
> = {};

/**
 * Type definitions for field name constants.
 */
export type ReadonlyKinematicField = (typeof READONLY_KINEMATIC_FIELDS)[number];
export type UppercaseField = (typeof UPPERCASE_FIELDS)[number];
export type AutoPaddingField = (typeof AUTO_PADDING_FIELDS)[keyof typeof AUTO_PADDING_FIELDS];