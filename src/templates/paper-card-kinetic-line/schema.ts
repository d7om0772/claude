import { z } from "zod";
import { zColor } from "@remotion/zod-types";

/**
 * كل ما يمكن تعديله في قالب «الكرت الورقي». لا توجد أي قيمة مكتوبة داخل
 * Template.tsx — كل شيء يمرّ من هنا.
 */

export const captionSchema = z.object({
  text: z.string().describe("نص المقطع كما يظهر على الشاشة"),
  startMs: z.number().min(0).describe("بداية المقطع بالملي ثانية"),
  endMs: z.number().min(0).describe("نهاية المقطع بالملي ثانية"),
});

export type Caption = z.infer<typeof captionSchema>;

export const templateSchema = z.object({
  // ───────────────────────── الألوان والهوية ─────────────────────────
  backgroundColor: zColor().describe(
    "لون الخلفية خلف الكرت (الخشب الداكن في التصميم الأصلي)",
  ),
  cardColor: zColor().describe("لون الكرت الورقي نفسه"),
  fontColor: zColor().describe("لون كل النصوص داخل الكرت"),

  // ───────────────────────── المحتوى ─────────────────────────
  headline: z
    .string()
    .min(1)
    .max(28)
    .describe(
      "السطر الضخم الزاحف. كل كلمة تحصل على محطة وقوف — الأفضل من ٢ إلى ٤ كلمات",
    ),
  subheadline: z
    .string()
    .max(28)
    .optional()
    .describe("السطر الصغير الذي يُبنى كلمة كلمة بعد اختفاء السطر الضخم"),
  logo: z
    .string()
    .optional()
    .describe("شعار يظهر أعلى الكرت (مسار صورة عبر staticFile). اتركه فارغاً لإخفائه"),
  media: z
    .string()
    .optional()
    .describe(
      "صورة أو فيديو يملأ الكرت خلف النص (mp4 / webm / jpg / png). النسبة المتوقعة 9:16",
    ),
  voiceover: z
    .string()
    .optional()
    .describe("ملف صوت التعليق. إذا وُجد تُحسب مدة الفيديو من طوله"),
  captions: z
    .array(captionSchema)
    .describe("مقاطع الكابشن القادمة من ملف SRT — تظهر أسفل الكرت"),

  // ───────────────────────── هندسة الكرت ─────────────────────────
  cardWidthRatio: z
    .number()
    .min(0.3)
    .max(1)
    .describe("عرض الكرت كنسبة من عرض الفيديو"),
  cardHeightRatio: z
    .number()
    .min(0.3)
    .max(1)
    .describe("ارتفاع الكرت كنسبة من ارتفاع الفيديو"),
  cardRadiusRatio: z
    .number()
    .min(0)
    .max(0.3)
    .describe("نصف قطر زوايا الكرت كنسبة من عرض الفيديو"),
  cardDriftRotation: z
    .number()
    .describe("مقدار دوران الكرت بالدرجات من بداية اللقطة إلى نهايتها"),
  cardDriftScale: z
    .number()
    .describe("مقدار تكبير الكرت من بداية اللقطة إلى نهايتها (0.028 = ‎%2.8)"),
  cardDriftX: z
    .number()
    .describe("انزياح الكرت الأفقي بالبكسل من البداية إلى النهاية"),

  // ───────────────────────── السطر الضخم ─────────────────────────
  headlineSizeRatio: z
    .number()
    .min(0.05)
    .max(0.5)
    .describe("حجم خط السطر الضخم كنسبة من عرض الفيديو"),
  headlineYRatio: z
    .number()
    .min(0)
    .max(1)
    .describe("موضع مركز السطر الضخم رأسياً كنسبة من ارتفاع الفيديو"),
  headlineDirection: z
    .enum(["rtl", "ltr"])
    .describe(
      "اتجاه الزحف: rtl يكشف الكلمات بترتيب القراءة العربية، ltr يعكسه",
    ),
  headlineStartInset: z
    .number()
    .describe("كم بكسل تدخل الكلمة الأولى داخل حافة الكرت في الوقفة الأولى"),
  headlineEndInset: z
    .number()
    .describe("كم بكسل تدخل الكلمة الأخيرة داخل الحافة المقابلة في الوقفة الأخيرة"),
  headlineWordSpacing: z
    .number()
    .describe("المسافة بين كلمات السطر الضخم كنسبة من حجم الخط"),
  headlineStopFrames: z
    .array(z.number().min(0))
    .describe(
      "الفريم الذي تبدأ عنده كل نقلة. عددها = عدد الكلمات ناقص واحد. مثال [6, 17]",
    ),
  headlineMoveFrames: z
    .number()
    .min(1)
    .describe("عدد فريمات النقلة الواحدة — كلما قلّ صارت النقلة أعنف"),
  headlineCutFrame: z
    .number()
    .min(1)
    .describe("الفريم الذي يختفي عنده السطر الضخم بقطع نظيف بلا موشن بلر"),
  motionBlurAmount: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "شدة الموشن بلر الأفقي أثناء النقلات (0 = بلا بلور، 0.22 = التصميم الأصلي)",
    ),

  // ───────────────────────── السطر الصغير ─────────────────────────
  subheadlineSizeRatio: z
    .number()
    .min(0.02)
    .max(0.25)
    .describe("حجم خط السطر الصغير كنسبة من عرض الفيديو"),
  subheadlineYRatio: z
    .number()
    .min(0)
    .max(1)
    .describe("موضع مركز السطر الصغير رأسياً كنسبة من ارتفاع الفيديو"),
  subheadlineStartFrame: z
    .number()
    .min(0)
    .describe("فريم ظهور أول كلمة من السطر الصغير"),
  subheadlineStrideFrames: z
    .number()
    .min(1)
    .describe("عدد الفريمات بين ظهور كلمة والتي بعدها"),
  subheadlineFadeFrames: z
    .number()
    .min(1)
    .describe("عدد فريمات ظهور الكلمة الواحدة"),

  // ───────────────────────── الكابشن ─────────────────────────
  captionSizeRatio: z
    .number()
    .min(0.02)
    .max(0.2)
    .describe("حجم خط الكابشن كنسبة من عرض الفيديو"),
  captionYRatio: z
    .number()
    .min(0)
    .max(1)
    .describe("موضع الكابشن رأسياً كنسبة من ارتفاع الفيديو"),
  captionFadeFrames: z
    .number()
    .min(1)
    .describe("عدد فريمات ظهور واختفاء الكابشن"),

  // ───────────────────────── المعالجة البصرية ─────────────────────────
  showTexture: z
    .boolean()
    .describe("إظهار حبيبات الورق وعروق الخشب (جزء من مزاج التصميم الأصلي)"),
  vignetteStrength: z
    .number()
    .min(0)
    .max(1)
    .describe("شدة تعتيم أطراف الخلفية"),
  fallbackDurationInFrames: z
    .number()
    .min(1)
    .describe("مدة الفيديو عند غياب الصوت والكابشن"),
});

export type TemplateProps = z.infer<typeof templateSchema>;

/**
 * قيم افتراضية مطابقة للّقطة الأصلية: ١٠٨٠×١٩٢٠ عند ٣٠ إطاراً، ٦١ فريم.
 */
export const defaultProps: TemplateProps = {
  backgroundColor: "#3D3126",
  cardColor: "#E4D4C5",
  fontColor: "#34422D",

  headline: "لكن انك تعرف",
  subheadline: "ان في احد",
  logo: undefined,
  media: undefined,
  voiceover: undefined,
  captions: [],

  cardWidthRatio: 0.7111,
  cardHeightRatio: 0.7177,
  cardRadiusRatio: 0.0519,
  cardDriftRotation: 0.85,
  cardDriftScale: 0.028,
  cardDriftX: -16,

  headlineSizeRatio: 0.2222,
  headlineYRatio: 0.4167,
  headlineDirection: "rtl",
  headlineStartInset: 30,
  headlineEndInset: 40,
  headlineWordSpacing: 0.3,
  headlineStopFrames: [6, 17],
  headlineMoveFrames: 4,
  headlineCutFrame: 35,
  motionBlurAmount: 0.22,

  subheadlineSizeRatio: 0.0852,
  subheadlineYRatio: 0.4958,
  subheadlineStartFrame: 39,
  subheadlineStrideFrames: 3,
  subheadlineFadeFrames: 2,

  captionSizeRatio: 0.045,
  captionYRatio: 0.78,
  captionFadeFrames: 3,

  showTexture: true,
  vignetteStrength: 0.62,
  fallbackDurationInFrames: 61,
};
