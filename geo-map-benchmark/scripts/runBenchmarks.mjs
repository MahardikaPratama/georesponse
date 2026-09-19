// Automated benchmark executor. Serves the production build (dist/) and
// drives the headless harness (src/harness.ts -> dist/harness.html) with a
// real Chrome browser via Playwright, once per (library, scenario,
// datasetSize) combination. Each page load runs the full
// warmup(3) + measured(10) cycle through the same Benchmark Engine used by
// the interactive React app, then reports the aggregated ScenarioResult.
//
// Per AGENT.md section 8 (Result Integrity): if a run throws or times out,
// it is recorded as FAILED with the error message, never estimated or
// silently skipped.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.resolve(root, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
};

function startServer(port) {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let filePath = path.join(distDir, urlPath === '/' ? '/index.html' : urlPath);
      if (!existsSync(filePath)) {
        res.writeHead(404).end('Not found');
        return;
      }
      const body = await readFile(filePath);
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
      res.end(body);
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

const LIBRARIES = ['leaflet', 'openlayers', 'maplibre'];

// Scenarios without explicit dataset-size levels (S01-S05, S07) plus S06 run
// once per documented dataset-size level (small/medium/large).
const FIXED_SCENARIOS = ['S01', 'S02', 'S03', 'S04', 'S05', 'S07'];
const S06_SIZES = ['small', 'medium', 'large'];

function buildMatrix() {
  const combos = [];
  for (const libraryId of LIBRARIES) {
    for (const scenarioId of FIXED_SCENARIOS) {
      combos.push({ libraryId, scenarioId, datasetSize: undefined });
    }
    for (const datasetSize of S06_SIZES) {
      combos.push({ libraryId, scenarioId: 'S06', datasetSize });
    }
  }
  return combos;
}

async function runCombo(browser, baseUrl, combo) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const params = new URLSearchParams({ library: combo.libraryId, scenario: combo.scenarioId });
  if (combo.datasetSize) params.set('datasetSize', combo.datasetSize);
  if (process.env.SMOKE) {
    params.set('warmupRuns', '1');
    params.set('measuredRuns', '1');
  }

  try {
    await page.goto(`${baseUrl}/harness.html?${params.toString()}`, { waitUntil: 'load' });
    await page.waitForFunction(
      () => window.__BENCHMARK_RESULT__ !== undefined || window.__BENCHMARK_ERROR__ !== undefined,
      undefined,
      { timeout: 180_000 },
    );
    const outcome = await page.evaluate(() => ({
      result: window.__BENCHMARK_RESULT__ ?? null,
      error: window.__BENCHMARK_ERROR__ ?? null,
    }));

    if (outcome.error) {
      return {
        scenarioId: combo.scenarioId,
        libraryId: combo.libraryId,
        datasetSize: combo.datasetSize,
        failed: true,
        failureReason: outcome.error,
        consoleErrors: errors,
      };
    }
    return { ...outcome.result, consoleErrors: errors };
  } catch (error) {
    return {
      scenarioId: combo.scenarioId,
      libraryId: combo.libraryId,
      datasetSize: combo.datasetSize,
      failed: true,
      failureReason: error instanceof Error ? error.message : String(error),
      consoleErrors: errors,
    };
  } finally {
    await context.close();
  }
}

async function main() {
  if (!existsSync(path.join(distDir, 'harness.html'))) {
    console.error('dist/harness.html not found. Run `npm run build` first.');
    process.exit(1);
  }

  const port = 4173;
  const server = await startServer(port);
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--force-color-profile=srgb',
    ],
  });

  const browserVersion = browser.version();
  let matrix = process.env.SMOKE
    ? LIBRARIES.map((libraryId) => ({ libraryId, scenarioId: 'S01', datasetSize: undefined }))
    : buildMatrix();
  if (process.env.ONLY_LIB) {
    matrix = matrix.filter((c) => c.libraryId === process.env.ONLY_LIB);
  }
  if (process.env.ONLY_SCENARIO) {
    matrix = matrix.filter((c) => c.scenarioId === process.env.ONLY_SCENARIO);
  }
  const results = [];

  console.log(`Chrome version: ${browserVersion}`);
  console.log(`Platform: ${os.platform()} ${os.release()} | CPUs: ${os.cpus().length}x ${os.cpus()[0]?.model ?? 'unknown'} | RAM: ${(os.totalmem() / 1024 ** 3).toFixed(1)} GB`);
  console.log(`Running ${matrix.length} scenario combinations (warmup=3, measured=10 each)...`);

  for (const [index, combo] of matrix.entries()) {
    const label = `${combo.libraryId} / ${combo.scenarioId}${combo.datasetSize ? ` (${combo.datasetSize})` : ''}`;
    const start = Date.now();
    process.stdout.write(`[${index + 1}/${matrix.length}] ${label} ... `);
    const result = await runCombo(browser, baseUrl, combo);
    const elapsedS = ((Date.now() - start) / 1000).toFixed(1);
    if (result.failed) {
      console.log(`FAILED (${elapsedS}s): ${result.failureReason}`);
    } else {
      console.log(`ok (${elapsedS}s) duration median=${result.duration.median.toFixed(1)}ms`);
    }
    results.push(result);
  }

  await browser.close();
  await new Promise((resolve) => server.close(resolve));

  const output = {
    meta: {
      capturedAt: new Date().toISOString(),
      browserVersion,
      platform: `${os.platform()} ${os.release()}`,
      cpuModel: os.cpus()[0]?.model ?? 'unknown',
      cpuCount: os.cpus().length,
      totalMemoryGb: Number((os.totalmem() / 1024 ** 3).toFixed(2)),
    },
    results,
  };

  if (process.env.SMOKE) {
    console.log('\nSMOKE mode: results not written to disk.');
    return;
  }

  const outDir = path.resolve(root, 'benchmarks', 'results');
  const { mkdir, writeFile } = await import('node:fs/promises');
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `raw-${Date.now()}.json`);
  await writeFile(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nRaw results written to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
