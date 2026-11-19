#!/usr/bin/env node
/* =============================================================================
 render.cjs — رندر المشهد فريم فريم (Playwright) → ffmpeg.

 لقطات سريعة:  node tools/render.cjs --data work/scene.json --snap 0,3,8 --outdir work/snap
 فيديو كامل:   node tools/render.cjs --data work/scene.json --audio work/mix.wav --out work/video.mp4 [--workers 3] [--crf 16]
============================================================================= */
const { chromium } = require("playwright");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const a = process.argv.slice(2), A = {};
for (let i = 0; i < a.length; i++) if (a[i].startsWith("--")) A[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
const ROOT = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.resolve(A.data), "utf8"));
const fps = +(A.fps || 30);
const html = "file://" + path.join(ROOT, "scene", "index.html");

async function openPage() {
  const browser = await chromium.launch({ args: ["--allow-file-access-from-files", "--font-render-hinting=none", "--disable-lcd-text"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errors.push(m.text()); });
  await page.addInitScript((d) => { window.__SCENE_DATA__ = d; }, data);
  await page.goto(html);
  await page.waitForFunction("window.__ready === true", null, { timeout: 60000 });
  return { browser, page, errors };
}

async function snap() {
  const { browser, page, errors } = await openPage();
  const out = path.resolve(A.outdir || "snap");
  fs.mkdirSync(out, { recursive: true });
  for (const s of String(A.snap).split(",")) {
    const t = +s;
    await page.evaluate((t) => window.renderFrame(t), t);
    const qa = await page.evaluate(() => window.__qa());
    await page.screenshot({ path: path.join(out, `t${t.toFixed(2).padStart(6, "0")}.jpg`), type: "jpeg", quality: 85 });
    if (qa.length) console.log(`t=${t}:`, qa.join(" | "));
  }
  if (errors.length) console.log("errors:", errors.join("\n"));
  await browser.close();
}

async function worker(k, n, total, tmp) {
  const f0 = Math.floor((k * total) / n), f1 = Math.floor(((k + 1) * total) / n);
  const seg = path.join(tmp, `seg${k}.mp4`);
  const ff = spawn("ffmpeg", ["-nostdin", "-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", String(A.crf || 16), "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-r", String(fps), seg], { stdio: ["pipe", "inherit", "inherit"] });
  const { browser, page, errors } = await openPage();
  const qa = [];
  for (let f = f0; f < f1; f++) {
    const t = f / fps;
    await page.evaluate((t) => window.renderFrame(t), t);
    if (f % 15 === 0) { const q = await page.evaluate(() => window.__qa()); if (q.length) qa.push({ t: +t.toFixed(2), q }); }
    const buf = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (k === 0 && (f - f0) % 60 === 0) console.log(`  frame ${f - f0}/${f1 - f0}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  await browser.close();
  return { seg, qa, errors };
}

async function render() {
  const total = Math.round(data.duration * fps);
  const n = Math.max(1, +(A.workers || 3));
  const out = path.resolve(A.out);
  const tmp = fs.mkdtempSync(path.join(path.dirname(out), ".render-"));
  const t0 = Date.now();
  const res = await Promise.all(Array.from({ length: n }, (_, k) => worker(k, n, total, tmp)));
  const list = path.join(tmp, "list.txt");
  fs.writeFileSync(list, res.map((r) => `file '${r.seg}'`).join("\n"));
  const args = ["-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list];
  if (A.audio) args.push("-i", path.resolve(A.audio), "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest");
  args.push("-c:v", "copy", "-movflags", "+faststart", out);
  execFileSync("ffmpeg", args, { stdio: "inherit" });
  fs.rmSync(tmp, { recursive: true, force: true });
  const qa = res.flatMap((r) => r.qa), errors = res.flatMap((r) => r.errors);
  fs.writeFileSync(out.replace(/\.mp4$/, ".qa.json"), JSON.stringify({ qa, errors }, null, 1));
  console.log(`done ${out} in ${((Date.now() - t0) / 1000).toFixed(0)}s · qa issues: ${qa.length} · errors: ${errors.length}`);
}

(A.snap ? snap() : render()).catch((e) => { console.error(e); process.exit(1); });
