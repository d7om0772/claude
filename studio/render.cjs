#!/usr/bin/env node
/* =============================================================================
 render.cjs — يصوّر كل فريم من قالب السلسلة بـ Playwright (renderFrame(t) حتمية) ويجمعها بـ ffmpeg.

 node studio/render.cjs --series budget-builds --data work/<ID>/scene.json --out work/<ID>/video.mp4 \
      [--audio work/<ID>/mix.wav] [--from 0] [--to 5] [--fps 30] [--crf 16] [--workers 2] [--qa work/<ID>/qa.json]

 - 1080×1920، 30fps، H.264 (crf 14–18، yuv420p، BT.709)، صوت AAC 192k، faststart.
 - كل نص ثانية يشغّل window.__qa(t): المناطق الآمنة + تداخل العناصر → يكتبها في qa.json.
 - --workers يقسم الفريمات على أكثر من متصفح (الجهاز فيه 4 أنوية؛ 2–3 مناسب).
============================================================================= */
const { chromium } = require("playwright");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function args() {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) if (a[i].startsWith("--")) { const k = a[i].slice(2); o[k] = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true; }
  return o;
}
const A = args();
const STUDIO = __dirname;
const series = A.series; if (!series) throw new Error("--series required");
const dataPath = path.resolve(A.data || path.join(STUDIO, series, "sample.json"));
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const fps = +(A.fps || data.fps || 30);
const from = +(A.from || 0);
const to = Math.min(+(A.to || data.duration), data.duration);
const crf = String(A.crf || 16);
const workers = Math.max(1, +(A.workers || 2));
const out = path.resolve(A.out || path.join(path.dirname(dataPath), "video.mp4"));
const qaPath = path.resolve(A.qa || path.join(path.dirname(out), "qa.json"));
const html = "file://" + path.join(STUDIO, series, "index.html");
const tmp = fs.mkdtempSync(path.join(path.dirname(out), ".render-"));
const FFMPEG = "ffmpeg";

const totalFrames = Math.round((to - from) * fps);
const chunk = Math.ceil(totalFrames / workers);

async function runWorker(k) {
  const f0 = k * chunk, f1 = Math.min(totalFrames, f0 + chunk);
  if (f0 >= f1) return { frames: 0, qa: [], ms: 0 };
  const seg = path.join(tmp, `seg_${String(k).padStart(2, "0")}.mp4`);
  const ff = spawn(FFMPEG, ["-nostdin", "-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", crf, "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.2",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-r", String(fps), seg], { stdio: ["pipe", "inherit", "inherit"] });
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    "--allow-file-access-from-files", "--font-render-hinting=none", "--disable-lcd-text"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`console.${m.type()}: ${m.text()}`); });
  await page.addInitScript((d) => { window.__SCENE_DATA__ = d; }, data);
  await page.goto(html);
  await page.waitForFunction("window.__ready === true", null, { timeout: 90000 }).catch(async (e) => {
    throw new Error("scene not ready: " + e.message + "\n" + errors.join("\n"));
  });
  const meta = await page.evaluate(() => window.__meta);
  const qa = []; const t0 = Date.now();
  const qaEvery = Math.round(fps / 2);
  for (let f = f0; f < f1; f++) {
    const t = from + f / fps;
    await page.evaluate((tt) => window.renderFrame(tt), t);
    if ((f % qaEvery) === 0) qa.push(...(await page.evaluate((tt) => window.__qa(tt), t)));
    const buf = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (k === 0 && (f - f0) % 150 === 0) process.stdout.write(`  [w0] frame ${f - f0}/${f1 - f0}\n`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on("close", (c) => (c === 0 ? r() : j(new Error("ffmpeg exit " + c)))));
  await browser.close();
  return { frames: f1 - f0, qa, ms: (Date.now() - t0) / Math.max(1, f1 - f0), seg, meta, errors };
}

(async () => {
  const t0 = Date.now();
  console.log(`render ${series}: ${totalFrames} frames (${from}s→${to}s) @${fps}fps, ${workers} workers`);
  const res = await Promise.all([...Array(workers).keys()].map(runWorker));
  const segs = res.filter((r) => r.seg).map((r) => r.seg);
  const list = path.join(tmp, "list.txt");
  fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join("\n"));
  const silent = path.join(tmp, "video_silent.mp4");
  execFileSync(FFMPEG, ["-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent]);
  if (A.audio) {
    execFileSync(FFMPEG, ["-nostdin", "-v", "error", "-y", "-i", silent, "-ss", String(from), "-t", String(to - from), "-i", path.resolve(A.audio),
      "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out]);
  } else {
    execFileSync(FFMPEG, ["-nostdin", "-v", "error", "-y", "-i", silent, "-c", "copy", "-movflags", "+faststart", out]);
  }
  const qa = res.flatMap((r) => r.qa);
  const errors = [...new Set(res.flatMap((r) => r.errors || []))];
  const report = { series, data: dataPath, out, frames: totalFrames, fps, from, to, workers,
    ms_per_frame: Math.round(res.reduce((s, r) => s + r.ms * r.frames, 0) / Math.max(1, totalFrames)),
    seconds: Math.round((Date.now() - t0) / 1000), meta: res[0].meta, violations: qa, console_errors: errors };
  fs.writeFileSync(qaPath, JSON.stringify(report, null, 1));
  fs.rmSync(tmp, { recursive: true, force: true });
  const byType = qa.reduce((m, v) => ((m[v.type] = (m[v.type] || 0) + 1), m), {});
  console.log(`✓ ${out}  (${report.seconds}s, ${report.ms_per_frame}ms/frame)  qa: ${JSON.stringify(byType)}  console_errors: ${errors.length}`);
})().catch((e) => { console.error("✗ render failed:", e.message); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {} process.exit(1); });
