// Render frames [f0, f1) at 30fps into an H.264 segment: node render.mjs f0 f1 out.mp4 port
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [f0, f1, out, port, cuesOut] = process.argv.slice(2);
const FPS = 30;
const root = new URL('..', import.meta.url).pathname;
const srv = spawn('python3', ['-m', 'http.server', port, '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/src/index.html`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
if (cuesOut) fs.writeFileSync(cuesOut, JSON.stringify(await page.evaluate(() => ({ cues: window.SFX_CUES, end: window.T_END })), null, 1));
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let f = +f0; f < +f1; f++) {
  await page.evaluate((t) => window.renderFrame(t), f / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if ((f - f0) % 60 === 0) console.log(`[${out}] frame ${f} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close(); srv.kill();
console.log(`[${out}] done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
