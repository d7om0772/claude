#!/usr/bin/env tsx
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { templateMetas } from "../lib/template-meta.js";
/**
 * يولّد عيّنة مصغّرة لكل قالب في public/previews/<id>.mp4، وهي ما تعرضه
 * شاشة الاختيار. تُعاد بعد أي تعديل يمسّ شكل قالب.
 */
const OUT_DIR = "public/previews";
mkdirSync(OUT_DIR, { recursive: true });
const only = process.argv[2];
const wanted = only
  ? templateMetas.filter((t) => t.id === only)
  : templateMetas;
if (wanted.length === 0) {
  console.error(`لا يوجد قالب بالمعرّف "${only}"`);
  process.exit(1);
}
/**
 * تُولَّد كل عيّنة بصيغتين ويعرضهما <video> معاً عبر <source>:
 *
 * - mp4/H.264 هو الأوسع دعماً عموماً، وهو الوحيد الذي يعمل على سفاري.
 * - webm/VP8 لأن H.264 ترميز احتكاري تفتقده بعض بُنى Chromium على لينكس
 *   (بينها المستخدمة في اختبارنا)، فتظهر العيّنات فارغة بلا أي خطأ شبكة.
 *
 * الصيغتان معاً تكلفان بضع مئات الكيلوبايتات وتغطيان الحالتين.
 */
const FORMATS = [
  { ext: "mp4", codec: "h264" },
  { ext: "webm", codec: "vp8" },
];
for (const t of wanted) {
  process.stderr.write(`رندر ${t.id} … `);
  for (const { ext, codec } of FORMATS) {
    execFileSync(
      "npx",
      [
        "remotion",
        "render",
        t.id,
        `${OUT_DIR}/${t.id}.${ext}`,
        `--codec=${codec}`,
        // نصف الأبعاد: العيّنة تُعرض في بطاقة صغيرة، والحجم أهم من الدقة هنا
        "--scale=0.5",
        "--log=error",
      ],
      { stdio: ["ignore", "ignore", "inherit"] },
    );
    process.stderr.write(`${ext} `);
  }
  process.stderr.write("تم\n");
}
