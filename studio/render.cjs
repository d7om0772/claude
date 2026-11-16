#!/usr/bin/env node
/* =============================================================================
 render.cjs — يصوّر كل فريم من قالب السلسلة بـ Playwright (renderFrame(t) حتمية) ويجمعها بـ ffmpeg.

 node studio/render.cjs --series budget-builds --data work/<ID>/scene.json --out work/<ID>/video.mp4 \
      [--audio work/<ID>/mix.wav] [--from 0] [--to 5] [--fps 30] [--crf 16] [--workers 3] [--qa work/<ID>/qa.json]

 فيديو طويل (أمر Bash الواحد حدّه 10 دقايق): قسّم الرندر لأجزاء، كل جزء في أمر مستقل، ثم جمّعها:
   node studio/render.cjs ... --parts 3 --part 1      (ثم --part 2 ثم --part 3)  → work/<ID>/.parts/
   node studio/render.cjs ... --assemble               → يجمع الأجزاء + يركّب الصوت + qa.json

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
const workers = Math.max(1, +(A.workers || 3));
const out = path.resolve(A.out || path.join(path.dirname(dataPath), "video.mp4"));
const qaPath = path.resolve(A.qa || path.join(path.dirname(out), "qa.json"));
const html = "file://" + path.join(STUDIO, series, "index.html");
const tmp = fs.mkdtempSync(path.join(path.dirname(out), ".render-"));
const FFMPEG = "ffmpeg";

const totalFrames = Math.round((to - from) * fps);
const nParts = Math.max(1, +(A.parts || 1)), part = +(A.part || 0);
const partsDir = path.join(path.dirname(out), ".parts");
const pSize = Math.ceil(totalFrames / nParts);
const P0 = part ? (part - 1) * pSize : 0, P1 = part ? Math.min(totalFrames, part * pSize) : totalFrames;
const chunk = Math.ceil((P1 - P0) / workers);

// الحلقة: نصوّر الفريم الأول (t=0) ونعطيه للصفحة، وآخر ثانية تذوب فيه (core.js → data.loop).
async function setLoopFrame(page) {
  if (!(await page.evaluate(() => !!window.__loop))) return false;
  await page.evaluate(() => window.renderFrame(0));
  const b64 = (await page.screenshot({ type: "png" })).toString("base64");
  return page.evaluate((s) => window.__setLoopFrame("data:image/png;base64," + s), b64);
}

async function runWorker(k) {
  const f0 = P0 + k * chunk, f1 = Math.min(P1, f0 + chunk);
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
  await setLoopFrame(page);
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

function finish(silent, qa, errors, meta, msPerFrame, t0) {
  if (A.audio) {
    execFileSync(FFMPEG, ["-nostdin", "-v", "error", "-y", "-i", silent, "-ss", String(from), "-t", String(to - from), "-i", path.resolve(A.audio),
      "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out]);
  } else {
    execFileSync(FFMPEG, ["-nostdin", "-v", "error", "-y", "-i", silent, "-c", "copy", "-movflags", "+faststart", out]);
  }
  const report = { series, data: dataPath, out, frames: totalFrames, fps, from, to, workers, ms_per_frame: msPerFrame,
    seconds: Math.round((Date.now() - t0) / 1000), meta, violations: qa, console_errors: errors };
  fs.writeFileSync(qaPath, JSON.stringify(report, null, 1));
  const byType = qa.reduce((m, v) => ((m[v.type] = (m[v.type] || 0) + 1), m), {});
  console.log(`✓ ${out}  (${report.seconds}s, ${msPerFrame}ms/frame)  qa: ${JSON.stringify(byType)}  console_errors: ${errors.length}`);
}

(async () => {
  const t0 = Date.now();
  if (A.assemble) { // تجميع الأجزاء
    const parts = fs.readdirSync(partsDir).filter((f) => /^p\d+\.mp4$/.test(f)).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
    const metas = parts.map((f) => JSON.parse(fs.readFileSync(path.join(partsDir, f.replace(".mp4", ".json")), "utf8")));
    const want = metas[0]?.nParts; if (!want || parts.length !== want) throw new Error(`parts missing: have ${parts.length}, need ${want}`);
    const list = path.join(tmp, "list.txt"); fs.writeFileSync(list, parts.map((f) => `file '${path.join(partsDir, f)}'`).join("\n"));
    const silent = path.join(tmp, "video_silent.mp4");
    execFileSync(FFMPEG, ["-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent]);
    finish(silent, metas.flatMap((m) => m.qa), [...new Set(metas.flatMap((m) => m.errors))], metas[0].meta,
      Math.round(metas.reduce((s, m) => s + m.ms * m.frames, 0) / Math.max(1, totalFrames)), t0);
    fs.rmSync(tmp, { recursive: true, force: true }); fs.rmSync(partsDir, { recursive: true, force: true });
    return;
  }
  console.log(`render ${series}: frames ${P0}→${P1} of ${totalFrames} (${from}s→${to}s) @${fps}fps, ${workers} workers${part ? `, part ${part}/${nParts}` : ""}`);
  const res = await Promise.all([...Array(workers).keys()].map(runWorker));
  const segs = res.filter((r) => r.seg).map((r) => r.seg);
  const list = path.join(tmp, "list.txt");
  fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join("\n"));
  const silent = path.join(tmp, "video_silent.mp4");
  execFileSync(FFMPEG, ["-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent]);
  const qa = res.flatMap((r) => r.qa);
  const errors = [...new Set(res.flatMap((r) => r.errors || []))];
  const frames = P1 - P0, ms = Math.round(res.reduce((s, r) => s + r.ms * r.frames, 0) / Math.max(1, frames));
  if (part) {
    fs.mkdirSync(partsDir, { recursive: true });
    fs.copyFileSync(silent, path.join(partsDir, `p${part}.mp4`));
    fs.writeFileSync(path.join(partsDir, `p${part}.json`), JSON.stringify({ nParts, part, frames, ms, qa, errors, meta: res[0].meta }));
    console.log(`✓ part ${part}/${nParts} (${frames} frames, ${Math.round((Date.now() - t0) / 1000)}s). ${part === nParts ? "" : "شغّل الجزء التالي، "}وبعد كل الأجزاء: --assemble`);
  } else {
    finish(silent, qa, errors, res[0].meta, ms, t0);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
})().catch((e) => { console.error("✗ render failed:", e.message); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {} process.exit(1); });
