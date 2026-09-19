# Benchmark Environment

## Hardware

| Component | Specification                  |
| --------- | ------------------------------ |
| CPU       | Intel Core i7-6500U @ 2.50 GHz |
| RAM       | 8 GB                           |
| GPU       | Intel HD Graphics 520          |
| Display   | 1920 × 1080 @ 60 Hz            |
| Storage   | SanDisk SD8SN8U-512G-1006      |

The benchmark should be executed on the same machine for all candidates.

## Operating System

| Component | Specification         |
| --------- | --------------------- |
| OS        | Windows 10 Pro 64-bit |
| Build     | 19045                 |
| DirectX   | DirectX 12            |

## Software

The following versions must be recorded before benchmarking:

| Software        | Version |
| --------------- | ------- |
| Node.js         | v24.21.0 |
| Package Manager | v10.19.1 |
| Browser         | Chrome 153.0.8010.48 (Official Build) (64-bit) |
| React           | 19.3.0     |
| TypeScript      | 7.0.2     |

## Map Libraries

| Library        | Version |
| -------------- | ------- |
| Leaflet        | 1.9.4     |
| OpenLayers     | 10.10.0     |
| MapLibre GL JS | 6.10.0     |

Library versions must remain fixed throughout the benchmark.

**Correction (2026-09-19):** the OpenLayers and MapLibre GL JS version
numbers were originally transcribed swapped relative to what
`package.json` actually pins and what was installed and benchmarked. The
table above reflects the corrected, verified values. See
`BENCHMARK_RESULTS.md` section 1 and `DECISION_RECORD.md`.

## Browser Configuration

The following configuration should remain consistent:

* Same browser and version
* Same viewport size
* Same browser zoom level
* No unnecessary browser extensions
* Same hardware acceleration setting
* No other benchmark applications running

## Benchmark Environment Rule

All candidates must be benchmarked on the same hardware, operating system, browser, viewport, dataset, and test configuration.

Any environment change during benchmarking must be documented and may require repeating previous measurements.
