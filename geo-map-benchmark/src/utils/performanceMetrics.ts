import type { AggregatedMetric } from '../types/benchmark.types';
import type { FpsSamplingResult, MemorySnapshot } from '../types/performance.types';
import { FPS_SAMPLE_DURATION_MS } from '../constants/benchmarkConfig.constants.ts';

/**
 * Samples FPS by counting animation frames over a fixed wall-clock window.
 * Callers are expected to drive continuous rendering (e.g. pan/zoom) while
 * this promise is pending; a fully idle map will report the browser's
 * background/idle frame rate.
 */
export function sampleFps(durationMs: number = FPS_SAMPLE_DURATION_MS): Promise<FpsSamplingResult> {
  return new Promise((resolve) => {
    let frameCount = 0;
    let startTime = 0;

    function frame(timestamp: number): void {
      if (startTime === 0) {
        startTime = timestamp;
      }
      frameCount += 1;
      const elapsed = timestamp - startTime;
      if (elapsed < durationMs) {
        requestAnimationFrame(frame);
      } else {
        resolve({ fps: (frameCount / elapsed) * 1000, sampleDurationMs: elapsed, frameCount });
      }
    }

    requestAnimationFrame(frame);
  });
}

/**
 * Non-standard Chrome-only heap size API. Guarded behind a feature check;
 * on browsers without it, memory measurements are reported as `null` rather
 * than fabricated (see AGENT.md section 8 - Result Integrity).
 */
interface ChromePerformanceMemory {
  usedJSHeapSize: number;
}

function getChromeMemory(): ChromePerformanceMemory | undefined {
  return (performance as Performance & { memory?: ChromePerformanceMemory }).memory;
}

export function snapshotMemory(): MemorySnapshot {
  const memory = getChromeMemory();
  if (!memory) {
    return { usedJsHeapSizeMb: null };
  }
  return { usedJsHeapSizeMb: memory.usedJSHeapSize / (1024 * 1024) };
}

export function aggregate(values: number[]): AggregatedMetric {
  if (values.length === 0) {
    throw new Error('Cannot aggregate an empty sample set');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  const mid = Math.floor(n / 2);
  const median = n % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
  const min = sorted[0]!;
  const max = sorted[n - 1]!;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  return { mean, median, min, max, stdDev, sampleCount: n };
}
