// One-off reproducibility check for the OpenLayers S06 (large, 10,000
// points) outlier reported in BENCHMARK_RESULTS.md section 5. Re-runs that
// exact combination 3 additional times against the current dist/ build and
// writes benchmarks/results/openlayers-s06-large-repeats.json. Requires
// `npm run build` first. Kept as a reusable tool for confirming outliers on
// any future scenario/library combination.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const filePath = path.join(distDir, urlPath === '/' ? '/index.html' : urlPath);
  if (!existsSync(filePath)) { res.writeHead(404).end(); return; }
  const body = await readFile(filePath);
  res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream' });
  res.end(body);
});
await new Promise((r) => server.listen(4174, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const runs = [];
for (let i = 0; i < 3; i += 1) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4174/harness.html?library=openlayers&scenario=S06&datasetSize=large', { waitUntil: 'load' });
  await page.waitForFunction(
    () => window.__BENCHMARK_RESULT__ !== undefined || window.__BENCHMARK_ERROR__ !== undefined,
    undefined,
    { timeout: 180000 },
  );
  const outcome = await page.evaluate(() => ({ result: window.__BENCHMARK_RESULT__ ?? null, error: window.__BENCHMARK_ERROR__ ?? null }));
  console.log(`run ${i + 1}:`, outcome.error ?? JSON.stringify({ median: outcome.result.duration.median, mean: outcome.result.duration.mean, max: outcome.result.duration.max, stdDev: outcome.result.duration.stdDev, raw: outcome.result.raw.map(r => Number(r.durationMs.toFixed(1))) }));
  runs.push(outcome.result ?? { error: outcome.error });
  await context.close();
}
await browser.close();
await new Promise((r) => server.close(r));

const { writeFile } = await import('node:fs/promises');
await writeFile(path.resolve(__dirname, '..', 'benchmarks', 'results', 'openlayers-s06-large-repeats.json'), JSON.stringify(runs, null, 2));
console.log('done');
