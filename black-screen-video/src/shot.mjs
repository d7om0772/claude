// Render selected timestamps to PNG for review: node shot.mjs out_dir t1 t2 ...
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [outDir, ...ts] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const root = new URL('..', import.meta.url).pathname;
const srv = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:8765/src/index.html');
await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
for (const t of ts) {
  const t0 = Date.now();
  await page.evaluate((t) => window.renderFrame(t), +t);
  await page.screenshot({ path: `${outDir}/t_${(+t).toFixed(2)}.jpg`, type: 'jpeg', quality: 85 });
  console.log('t', t, Date.now() - t0, 'ms');
}
await browser.close(); srv.kill();
