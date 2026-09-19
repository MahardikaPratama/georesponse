/** High-resolution timestamp, in milliseconds. */
export function now(): number {
  return performance.now();
}

/** Times an operation (sync or async) and returns its result plus duration. */
export async function timeAsync<T>(fn: () => Promise<T> | T): Promise<{ result: T; durationMs: number }> {
  const start = now();
  const result = await fn();
  const durationMs = now() - start;
  return { result, durationMs };
}
