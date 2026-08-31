// schema.ts
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { staticFile } from "remotion";
import { contentDurationInFrames } from "../../lib/duration.js";
import { resolveAsset } from "../../lib/asset-url.js";
export const captionSchema = z.object({
  text: z.string().max(24).describe("نص الكلمة كما تُنطق"),
  startMs: z.number().min(0).describe("لحظة بدء نطق الكلمة بالمللي ثانية"),
  endMs: z.number().min(0).describe("لحظة انتهاء نطق الكلمة بالمللي ثانية"),
});
export const templateSchema = z.object({
  /* ---------- الألوان ---------- */
  backgroundColor: zColor().describe(
    "لون خلفية الكادر المحيط بالبطاقة — الكريمي هو لون هوية القالب",
  ),
  cardColor: zColor().describe(
    "لون بطاقة الفيديو، يظهر فقط حين لا توجد وسائط مرفقة",
  ),
  fontColor: zColor().describe("لون نص الترجمة داخل البطاقة"),
  placeholderColor: zColor().describe("لون النص التوضيحي داخل البطاقة الفارغة"),
  /* ---------- المحتوى ---------- */
  logo: z
    .string()
    .optional()
    .describe(
      "مسار صورة الشعار داخل مجلد public — اتركه فارغاً لإخفاء الشعار وتوسيط البطاقة",
    ),
  headline: z
    .string()
    .max(42)
    .describe(
      "النص الرئيسي، يظهر فقط حين لا توجد ترجمة — حد أقصى ٤٢ حرفاً ليتسع في سطرين",
    ),
  subheadline: z
    .string()
    .max(70)
    .optional()
    .describe("نص ثانوي أصغر أسفل النص الرئيسي — حد أقصى ٧٠ حرفاً"),
  media: z
    .string()
    .optional()
    .describe(
      "مسار الصورة أو الفيديو داخل البطاقة — يُفضّل بنسبة ٩:١٦ لأن البطاقة رأسية",
    ),
  voiceover: z
    .string()
    .optional()
    .describe(
      "مسار ملف التعليق الصوتي — عند إرفاقه تُحسب مدة الفيديو من طوله تلقائياً",
    ),
  captions: z
    .array(captionSchema)
    .describe(
      "كلمات الترجمة مع توقيتاتها، مستخرجة من ملف SRT — كل عنصر كلمة واحدة لا جملة",
    ),
  clickSfx: z
    .string()
    .nullable()
    .describe("صوت نقرة يشتغل مع كل كلمة تظهر. فارغ يوقفه"),
  clickVolume: z.number().min(0).max(1).describe("مستوى صوت النقرة"),
  placeholderText: z
    .string()
    .max(30)
    .describe("النص الذي يظهر داخل البطاقة حين لا توجد وسائط"),
  /* ---------- الخط ---------- */
  // اسم العائلة ومساراتها مركزية في src/lib/fonts.ts — كل القوالب تشترك فيها
  /* ---------- تخطيط البطاقة ---------- */
  cardInsetXRatio: z
    .number()
    .min(0)
    .max(0.4)
    .describe("هامش البطاقة الجانبي كنسبة من عرض الكادر"),
  cardInsetYRatio: z
    .number()
    .min(0)
    .max(0.4)
    .describe("الهامش العلوي والسفلي للبطاقة حين لا يوجد شعار"),
  cardInsetTopWithLogoRatio: z
    .number()
    .min(0)
    .max(0.5)
    .describe("الهامش العلوي للبطاقة حين يوجد شعار"),
  cardInsetBottomWithLogoRatio: z
    .number()
    .min(0)
    .max(0.5)
    .describe("الهامش السفلي للبطاقة حين يوجد شعار"),
  cardRadiusRatio: z
    .number()
    .min(0)
    .max(0.2)
    .describe("نصف قطر حواف البطاقة كنسبة من عرض الكادر"),
  mediaAspect: z
    .number()
    .min(0.1)
    .max(10)
    .nullable()
    .describe(
      "نسبة عرض المقطع إلى ارتفاعه. تُقاس تلقائياً عند رفع الملف من الواجهة، وبدونها يملأ المقطع البطاقة",
    ),
  mediaFreeSize: z
    .boolean()
    .describe(
      "الفيديو المرفق يأخذ نسبته الطبيعية بدل أن يُقصّ على مقاس البطاقة. أطفئه ليملأ البطاقة كما كان",
    ),
  mediaScale: z
    .number()
    .min(0.2)
    .max(2)
    .describe(
      "حجم الفيديو نسبةً إلى مساحة البطاقة. أكبر من ١ يتجاوز حدود البطاقة",
    ),
  mediaCenterXRatio: z
    .number()
    .min(0)
    .max(1)
    .describe("مركز الفيديو أفقياً كنسبة من عرض الإطار"),
  mediaCenterYRatio: z
    .number()
    .min(0)
    .max(1)
    .describe("مركز الفيديو رأسياً كنسبة من ارتفاع الإطار"),
  mediaRadiusRatio: z
    .number()
    .min(0)
    .max(0.2)
    .describe("نصف قطر زوايا الفيديو نفسه كنسبة من عرض الإطار"),
  logoTopRatio: z
    .number()
    .min(0)
    .max(0.3)
    .describe("المسافة من أعلى الكادر إلى الشعار كنسبة من الارتفاع"),
  logoHeightRatio: z
    .number()
    .min(0.01)
    .max(0.2)
    .describe("ارتفاع الشعار كنسبة من ارتفاع الكادر"),
  /* ---------- تخطيط الترجمة ---------- */
  captionTopRatio: z
    .number()
    .min(0)
    .max(0.9)
    .describe("موضع الترجمة من أعلى البطاقة كنسبة من ارتفاعها"),
  captionRightRatio: z
    .number()
    .min(0)
    .max(0.4)
    .describe("هامش الترجمة من يمين البطاقة كنسبة من عرضها"),
  captionLeftRatio: z
    .number()
    .min(0)
    .max(0.6)
    .describe("هامش الترجمة من يسار البطاقة — يتحكم في موضع كسر السطر"),
  captionFontSizeRatio: z
    .number()
    .min(0.02)
    .max(0.2)
    .describe("حجم خط الترجمة كنسبة من عرض الكادر"),
  captionLineHeight: z
    .number()
    .min(0.9)
    .max(2.5)
    .describe("تباعد أسطر الترجمة"),
  wordGapRatio: z
    .number()
    .min(0)
    .max(0.1)
    .describe("المسافة بين الكلمات كنسبة من عرض الكادر"),
  shadowOpacity: z
    .number()
    .min(0)
    .max(1)
    .describe("شدة الظل خلف نص الترجمة — يرفع وضوحه فوق اللقطات الفاتحة"),
  /* ---------- الحركة والتوقيت ---------- */
  wordsPerLine: z
    .number()
    .int()
    .min(1)
    .max(4)
    .describe("عدد الكلمات في سطر الترجمة الواحد"),
  linesPerCue: z
    .number()
    .int()
    .min(1)
    .max(3)
    .describe("عدد الأسطر التي تظهر معاً على الشاشة"),
  cueHoldMs: z
    .number()
    .min(0)
    .max(4000)
    .describe("مدة بقاء آخر مقطع ظاهراً بعد انتهاء نطق كلمته الأخيرة"),
  popDurationInFrames: z
    .number()
    .min(1)
    .max(30)
    .describe("مدة أنيميشن دخول الكلمة بالفريمات — دخول فقط بلا خروج"),
  popRiseRatio: z
    .number()
    .min(0)
    .max(0.6)
    .describe("مقدار صعود الكلمة عند الدخول كنسبة من حجم الخط"),
  popStartScale: z
    .number()
    .min(0.5)
    .max(1)
    .describe("حجم الكلمة عند بداية الدخول قبل أن تصل لحجمها الكامل"),
  tailInFrames: z
    .number()
    .int()
    .min(0)
    .max(150)
    .describe("فريمات إضافية بعد نهاية الصوت أو آخر كلمة"),
});
/* ------------------------------------------------------------------ *
 * القيم الافتراضية — القالب يعمل ويعرض نتيجة كاملة دون أي إدخال
 * التوقيتات مأخوذة من اللقطة الأصلية: 0.30s / 0.95s / 1.75s / 2.40s
 * ------------------------------------------------------------------ */
export const defaultProps = {
  backgroundColor: "#EEEADE",
  cardColor: "#4A4038",
  fontColor: "#FFFFFF",
  placeholderColor: "#B9AEA4",
  logo: undefined,
  headline: "وقفنا نفكّر..",
  subheadline: "ليش نجرّب",
  media: undefined,
  voiceover: undefined,
  captions: [
    { text: "وقفنا", startMs: 300, endMs: 720 },
    { text: "نفكّر..", startMs: 950, endMs: 1480 },
    { text: "ليش", startMs: 1750, endMs: 2100 },
    { text: "نجرّب", startMs: 2400, endMs: 2950 },
  ],
  clickSfx: "klova/click.wav",
  clickVolume: 0.7,
  placeholderText: "لقطتك هنا",
  // «وقفنا» تنتهي بألف و«نفكّر..» تنتهي براء، وكلاهما بلا بديل ممتد في الخط،
  // فالسطر الأول لا يقبل أحرفاً مرسلة أصلاً. الكلمة ٣ «نجرّب» تنتهي بباء
  // ولها بديل، وهي غير متجاورة مع أي كلمة مفعّلة أخرى.
  cardInsetXRatio: 0.102,
  cardInsetYRatio: 0.11,
  cardInsetTopWithLogoRatio: 0.17,
  cardInsetBottomWithLogoRatio: 0.044,
  cardRadiusRatio: 0.0333,
  mediaAspect: null,
  mediaFreeSize: true,
  mediaScale: 1,
  mediaCenterXRatio: 0.5,
  mediaCenterYRatio: 0.5,
  mediaRadiusRatio: 0.0333,
  logoTopRatio: 0.055,
  logoHeightRatio: 0.045,
  captionTopRatio: 0.05,
  captionRightRatio: 0.04,
  captionLeftRatio: 0.06,
  captionFontSizeRatio: 0.0722,
  captionLineHeight: 1.45,
  wordGapRatio: 0.0204,
  shadowOpacity: 0.75,
  wordsPerLine: 2,
  linesPerCue: 2,
  cueHoldMs: 450,
  popDurationInFrames: 5,
  popRiseRatio: 0.28,
  popStartScale: 0.9,
  tailInFrames: 30,
};
/* ------------------------------------------------------------------ *
 * حساب المدة: أولوية للصوت، ثم لآخر كلمة، ثم للمدة الافتراضية
 * ------------------------------------------------------------------ */
export const calculateMetadata = async ({ props }) => {
  const fps = 30;
  return {
    fps,
    durationInFrames: await contentDurationInFrames({
      fps,
      voiceover: props.voiceover
        ? resolveAsset(props.voiceover, staticFile)
        : null,
      media: props.media ? resolveAsset(props.media, staticFile) : null,
      captions: props.captions,
      // cueHoldMs جزء من زمن المحتوى فيُدوَّر مع نهاية الكابشن،
      // وtailInFrames ذيل على مستوى اللقطة فيُضاف بعد التدوير
      captionTailMs: props.cueHoldMs,
      captionTailFrames: props.tailInFrames,
      fallbackInFrames: 150,
    }),
  };
};
