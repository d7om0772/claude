#!/usr/bin/env tsx
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { templates } from "../lib/registry";

/**
 * يبني الواجهة كملف HTML واحد مكتفٍ بذاته: كل شيء مضمّن، صفر طلبات شبكة.
 * الغرض مشاركتها للتجربة على أي جهاز بلا تشغيل خادم.
 */

const DIST = "dist-ui";
const OUT = `${DIST}/standalone.html`;

const MIME: Record<string, string> = {
  woff2: "font/woff2",
  mp4: "video/mp4",
  webm: "video/webm",
};

const dataUri = (path: string): string => {
  const ext = path.split(".").pop() ?? "";
  const mime = MIME[ext] ?? "application/octet-stream";
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
};

const kb = (n: number): string => `${Math.round(n / 1024)}ك`;

process.stderr.write("بناء الواجهة … ");
execFileSync("npx", ["vite", "build"], { stdio: ["ignore", "ignore", "inherit"] });
process.stderr.write("تم\n");

const html = readFileSync(`${DIST}/index.html`, "utf8");

const cssHref = /<link[^>]+href="([^"]+\.css)"/u.exec(html)?.[1];
const jsSrc = /<script[^>]+src="([^"]+\.js)"/u.exec(html)?.[1];
if (!cssHref || !jsSrc) {
  throw new Error("تعذّر العثور على ملفي CSS/JS في مخرج البناء");
}

const css = readFileSync(`${DIST}/${basename(cssHref).replace(/^/u, "assets/")}`, "utf8");
const js = readFileSync(`${DIST}/assets/${basename(jsSrc)}`, "utf8");

// الأصول التي تُطلب بمسار مطلق وقت التشغيل
const assets: Record<string, string> = {
  "/fonts/thmanyah-serif-display-Black.woff2": dataUri(
    "public/fonts/thmanyah-serif-display-Black.woff2",
  ),
  "/fonts/thmanyah-serif-display-Medium.woff2": dataUri(
    "public/fonts/thmanyah-serif-display-Medium.woff2",
  ),
};

for (const t of templates) {
  for (const ext of ["webm", "mp4"]) {
    const file = `public/previews/${t.meta.id}.${ext}`;
    try {
      statSync(file);
      assets[`/previews/${t.meta.id}.${ext}`] = dataUri(file);
    } catch {
      process.stderr.write(`تحذير: لا توجد عيّنة ${file}\n`);
    }
  }
}

const page = `<title>قوالب مونتاج</title>
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
  `${OUT} — ${kb(Buffer.byteLength(page))} (js ${kb(js.length)}، أصول ${kb(
    Object.values(assets).reduce((n, v) => n + v.length, 0),
  )})\n`,
);
