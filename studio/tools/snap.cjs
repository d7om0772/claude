#!/usr/bin/env node
/* snap.cjs — يصوّر فريمات محددة من قالب (للمراجعة السريعة ولصورة الغلاف).
   node studio/tools/snap.cjs --series budget-builds --data work/<ID>/scene.json --t 3.2,10,20 --out work/<ID>/snap   [--debug]
   ينتج: <out>_<t>.png لكل وقت. --cover يحفظ أول وقت باسم <out>.jpg (جودة 92) لصورة الغلاف. */
const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
const a = process.argv.slice(2), A = {}; for (let i = 0; i < a.length; i++) if (a[i].startsWith("--")) A[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
const STUDIO = path.dirname(__dirname);
(async () => {
  const dataPath = path.resolve(A.data || path.join(STUDIO, A.series, "sample.json"));
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--allow-file-access-from-files", "--font-render-hinting=none"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.addInitScript((d) => { window.__SCENE_DATA__ = d; }, data);
  await p.goto("file://" + path.join(STUDIO, A.series, "index.html") + (A.debug ? "?debug=1" : ""));
  await p.waitForFunction("window.__ready === true", null, { timeout: 90000 });
  const out = path.resolve(A.out || "snap");
  for (const ts of String(A.t || "1").split(",")) {
    const t = parseFloat(ts); await p.evaluate((tt) => window.renderFrame(tt), t);
    if (A.cover) { await p.screenshot({ path: out + ".jpg", type: "jpeg", quality: 92 }); console.log(out + ".jpg"); break; }
    const f = `${out}_${ts}.png`; await p.screenshot({ path: f }); console.log(f);
  }
  if (errs.length) console.log("page errors:", errs.join("\n"));
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
