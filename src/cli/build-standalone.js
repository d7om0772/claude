#!/usr/bin/env tsx
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { basename, join, posix } from "node:path";
/**
 * يبني الواجهة كملف HTML واحد مكتفٍ بذاته: كل شيء مضمّن، صفر طلبات شبكة.
 * الغرض مشاركتها للتجربة على أي جهاز بلا تشغيل خادم.
 */
const DIST = "dist-ui";
const OUT = `${DIST}/standalone.html`;
const MIME = {
  woff2: "font/woff2",
  otf: "font/otf",
  mp4: "video/mp4",
  webm: "video/webm",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  webp: "image/webp",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
};
const dataUri = (path) => {
  const ext = path.split(".").pop() ?? "";
  const mime = MIME[ext] ?? "application/octet-stream";
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
};
const kb = (n) => `${Math.round(n / 1024)}ك`;
process.stderr.write("بناء الواجهة … ");
execFileSync("npx", ["vite", "build"], {
  stdio: ["ignore", "ignore", "inherit"],
});
process.stderr.write("تم\n");
const html = readFileSync(`${DIST}/index.html`, "utf8");
const cssHref = /<link[^>]+href="([^"]+\.css)"/u.exec(html)?.[1];
const jsSrc = /<script[^>]+src="([^"]+\.js)"/u.exec(html)?.[1];
if (!cssHref || !jsSrc) {
  throw new Error("تعذّر العثور على ملفي CSS/JS في مخرج البناء");
}
const css = readFileSync(
  `${DIST}/${basename(cssHref).replace(/^/u, "assets/")}`,
  "utf8",
);
const js = readFileSync(`${DIST}/assets/${basename(jsSrc)}`, "utf8");
/**
 * كل ما في public يُضمَّن، عدا uploads.
 *
 * كان هنا سردٌ يدوي للخطوط والعيّنات، فكل أصل جديد يضيفه قالب — شعار أو صوت
 * نقرة — يغيب عن نسخة الملف الواحد بلا أي خطأ ظاهر: الصورة تنكسر والصوت يصمت.
 * المسح التلقائي يجعل «أضِف ملفاً إلى public» كافياً.
 */
const SKIP_DIRS = new Set(["uploads"]);
const collectAssets = (dir, prefix = "") => {
  const out = {};
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      Object.assign(
        out,
        collectAssets(join(dir, entry.name), posix.join(prefix, entry.name)),
      );
      continue;
    }
    const ext = entry.name.split(".").pop() ?? "";
    if (MIME[ext] === undefined) continue;
    out[`/${posix.join(prefix, entry.name)}`] = dataUri(join(dir, entry.name));
  }
  return out;
};
const assets = collectAssets("public");

// إعلان الترميز أولاً: الملف عربي بالكامل، وبدونه يقرؤه المتصفح لاتينياً
// فتتحوّل الحروف إلى بايتات مشوّهة — ويكفي تعبيرٌ نمطي واحد فيه مدى عربي
// ليصير غير صالح فيسقط التطبيق كله عند الإقلاع.
const page = `<meta charset="utf-8" />
<title>قوالب مونتاج</title>
<style>${css}</style>
<div id="root"></div>
<script>
  document.documentElement.dir = "rtl";
  document.documentElement.lang = "ar";
  globalThis.__ASSET_MAP__ = ${JSON.stringify(assets)};
</script>
<script type="module">${js}</script>
`;
writeFileSync(OUT, page, "utf8");
process.stderr.write(
  `${OUT} — ${kb(Buffer.byteLength(page))} (js ${kb(js.length)}، أصول ${kb(Object.values(assets).reduce((n, v) => n + v.length, 0))})\n`,
);
