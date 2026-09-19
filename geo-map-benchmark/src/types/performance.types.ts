export interface FpsSamplingResult {
  fps: number;
  sampleDurationMs: number;
  frameCount: number;
}

export interface MemorySnapshot {
  usedJsHeapSizeMb: number | null;
}
