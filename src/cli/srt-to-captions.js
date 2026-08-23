#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "node:fs";
import { srtToCaptions } from "../lib/srt.js";
/**
 * الاستخدام:
 *   npm run srt -- input.srt                 # يطبع الـ JSON
 *   npm run srt -- input.srt out.json        # يكتبه في ملف
 *   npm run srt -- input.srt --props props.json   # يحقنه داخل ملف props موجود
 */
const [, , input, second, third] = process.argv;
if (!input) {
  console.error(
    "الاستخدام: npm run srt -- <ملف.srt> [<مخرج.json> | --props <props.json>]",
  );
  process.exit(1);
}
const captions = srtToCaptions(readFileSync(input, "utf8"));
if (second === "--props") {
  if (!third) {
    console.error("‏--props تحتاج مسار ملف props.");
    process.exit(1);
  }
  const props = JSON.parse(readFileSync(third, "utf8"));
  writeFileSync(
    third,
    `${JSON.stringify({ ...props, captions }, null, 2)}\n`,
    "utf8",
  );
  console.error(`تم حقن ${captions.length} مقطعاً في ${third}`);
} else if (second) {
  writeFileSync(second, `${JSON.stringify(captions, null, 2)}\n`, "utf8");
  console.error(`تم كتابة ${captions.length} مقطعاً في ${second}`);
} else {
  console.log(JSON.stringify(captions, null, 2));
}
