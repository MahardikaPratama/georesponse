/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Logging utility with contextual metadata, level
 *                detection, and wrappers for error/debug logs. The
 *                established convention for client-side logging in this
 *                project.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import { LogEntry, LogLevel } from "./logger.types";

export const logger = {
	/**
	 * Logs a message with optional level, context, and additional data.
	 *
	 * @param message - The main message to log.
	 * @param context - Context or module source for the log.
	 * @param level - Log level ("debug", "info", "warn", "error").
	 * @param data - Optional additional data (e.g., object, error).
	 */
	log(
		message: string,
		context = "",
		level: LogLevel = "log",
		data?: unknown
	): void {
		const timestamp = new Date().toISOString();
		const logLevel = (process.env.LOG_LEVEL ?? "debug") as LogLevel;

		const levels: LogLevel[] = ["debug", "info", "warn", "error"];
		const levelIndex = levels.indexOf(level);
		const envLevelIndex = levels.indexOf(logLevel);

		if (levelIndex < envLevelIndex) return;

		const entry: Partial<LogEntry> = {
			timestamp,
			level,
			message
		};

		if (context) entry.context = context;

		if (level === "error" && data instanceof Error && data.stack) {
			entry.stack = data.stack;
		}

		// Avoid logging `data` if it's just the same string as the message
		const logArgs = [entry];
		if (data !== undefined && data !== null) {
			logArgs.push(data);
		}

		switch (level) {
			case "info":
				console.info(...logArgs);
				break;
			case "warn":
				console.warn(...logArgs);
				break;
			case "error":
				console.error(...logArgs);
				break;
			case "debug":
				console.debug(...logArgs);
				break;
			default:
				console.log(...logArgs);
				break;
		}
	},

	info(message: string, context = "", data?: unknown) {
		this.log(message, context, "info", data);
	},

	warn(message: string, context = "", data?: unknown) {
		this.log(message, context, "warn", data);
	},

	error(message: string, context = "", error?: unknown) {
		this.log(message, context, "error", error);
	},

	debug(message: string, context = "", data?: unknown) {
		this.log(message, context, "debug", data);
	},

	logError(error: unknown, context = "") {
		const message = error instanceof Error ? error.message : String(error);
		this.error(message, context, error);
	}
};
