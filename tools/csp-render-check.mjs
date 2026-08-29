#!/usr/bin/env node
/**
 * يتحقق أن الرندر داخل المتصفح يعمل تحت سياسة أمان مماثلة للنسخة المنشورة.
 *
 * أُضيف بعد سلسلة أعطال لم يكشفها أي اختبار محلي: السياسة هناك تمنع fetch على
 * blob: وdata:، فكان كل ملف يرفعه المستخدم يفشل بينما كل شيء يعمل هنا. أي
 * تغيير يمسّ قراءة الوسائط يجب أن يمرّ من هذا الفحص.
 *
 *   node tools/csp-render-check.mjs            فيديو مرفق
 *   node tools/csp-render-check.mjs --no-media بلا مرفقات
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const PORT = 4599;
const PAGE = "dist-ui/standalone.html";
const SAMPLE = "public/previews/card-stretch-reveal.webm";
const CSP = [
  "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
  // بيت القصيد: blob: وdata: خارج connect-src
  "connect-src 'self' https://cdnjs.cloudflare.com",
  "media-src blob: data: 'self'",
  "img-src blob: data: 'self' https:",
  "font-src data: 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
].join("; ");

const html = readFileSync(PAGE);
const server = createServer((_req, res) => {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "content-security-policy": CSP,
  });
  res.end(html);
});
await new Promise((r) => server.listen(PORT, r));

const withMedia = !process.argv.includes("--no-media");
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "load" });
  await page.waitForSelector(".card");
  const titles = await page.$$eval(".card", (els) =>
    els.map((el) => el.textContent),
  );
  const index = Math.max(
    0,
    titles.findIndex((t) => t.includes("كاريوكي")),
  );
  await page.$$eval(".card", (els, i) => els[i].click(), index);
  await page.waitForSelector("input[type=file]", { state: "attached" });
  if (withMedia) {
    for (const input of await page.$$("input[type=file]")) {
      const accept = (await input.getAttribute("accept")) ?? "";
      if (accept.includes("video")) {
        await input.setInputFiles(SAMPLE);
        break;
      }
    }
    await page.waitForTimeout(4000);
  }
  const download = page.waitForEvent("download", { timeout: 300000 });
  await page
    .getByRole("button", { name: /رندر في المتصفح/ })
    .first()
    .click();
  const file = await (await download).path();
  const { size } = await import("node:fs").then((fs) => fs.statSync(file));
  process.stdout.write(`نجح الرندر تحت السياسة — ${size} بايت\n`);
} finally {
  await browser.close();
  server.close();
}
