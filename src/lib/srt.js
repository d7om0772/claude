/**
 * محوّل SRT → captions.
 *
 * القالب لا يعرف شيئاً عن SRT إطلاقاً — يستقبل مصفوفة
 * { text, startMs, endMs } جاهزة. كل التحويل يحصل هنا، خارج القالب،
 * حتى يبقى القالب نقياً ويشتغل مع أي مصدر كابشن (SRT، VTT، تفريغ آلي).
 */
/** `00:00:02,030` أو `00:00:02.030` → ملي ثانية */
const timecodeToMs = (tc) => {
  const match = /^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/u.exec(tc.trim());
  if (!match) {
    throw new Error(`طابع زمني غير صالح في ملف SRT: "${tc}"`);
  }
  const [, h, m, s, ms] = match;
  return (
    Number(h) * 3_600_000 +
    Number(m) * 60_000 +
    Number(s) * 1000 +
    Number(ms.padEnd(3, "0"))
  );
};
export const parseSrt = (raw) => {
  const text = raw
    .replace(/^﻿/u, "") // شطب BOM
    .replace(/\r\n?/gu, "\n") // توحيد نهايات الأسطر
    .trim();
  if (text.length === 0) {
    return [];
  }
  const captions = [];
  for (const block of text.split(/\n{2,}/u)) {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      continue;
    }
    // السطر الأول قد يكون رقم المقطع، وقد يُحذف في بعض الملفات
    const arrowIndex = lines.findIndex((l) => l.includes("-->"));
    if (arrowIndex === -1) {
      continue;
    }
    const [from, to] = lines[arrowIndex].split("-->");
    if (from === undefined || to === undefined) {
      continue;
    }
    const body = lines
      .slice(arrowIndex + 1)
      .join(" ")
      .replace(/<[^>]+>/gu, "") // شطب وسوم التنسيق <i> <b> <font>
      .replace(/\s+/gu, " ")
      .trim();
    if (body.length === 0) {
      continue;
    }
    captions.push({
      text: body,
      startMs: timecodeToMs(from),
      // ما بعد الطابع الثاني قد يحمل إحداثيات موضع (X1:… Y1:…) فنقصّها
      endMs: timecodeToMs(to.trim().split(/\s+/u)[0] ?? to),
    });
  }
  return captions.sort((a, b) => a.startMs - b.startMs);
};
/**
 * يمنع تداخل المقاطع: القالب يختار أول مقطع يطابق الفريم الحالي،
 * فتداخل مقطعين يعني اختفاء الثاني بلا سبب ظاهر.
 */
export const normalizeCaptions = (captions) =>
  captions.map((c, i) => {
    const next = captions[i + 1];
    return next !== undefined && c.endMs > next.startMs
      ? { ...c, endMs: next.startMs }
      : { ...c };
  });
export const srtToCaptions = (raw) => normalizeCaptions(parseSrt(raw));
