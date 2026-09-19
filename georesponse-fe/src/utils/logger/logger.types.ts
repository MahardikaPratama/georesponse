/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Logging types.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "log";

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	context?: string;
	message: string;
	stack?: string;
	source?: string;
}
