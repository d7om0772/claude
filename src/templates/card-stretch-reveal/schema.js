import { z } from "zod";
import { zColor } from "@remotion/zod-types";
/**
 * Schema قالب "Card Stretch Reveal".
 * كل قيمة بصرية أو زمنية في القالب تمر من هنا — لا يوجد أي رقم أو لون مكتوب داخل Template.tsx.
 */
export const captionSchema = z.object({
  text: z.string().describe("نص الكابشن كما سيظهر على الشاشة"),
  startMs: z
    .number()
    .min(0)
    .describe("لحظة ظهور الكابشن بالملي ثانية من بداية الفيديو"),
  endMs: z
    .number()
    .min(0)
    .describe("لحظة اختفاء الكابشن بالملي ثانية من بداية الفيديو"),
});
export const templateSchema = z.object({
  /* ---------- الهوية اللونية ---------- */
  backgroundColor: zColor().describe(
    "لون خلفية المشهد خلف الكرت. في التصميم الأصلي خشب داكن — أي لون داكن يعطي نفس الإحساس",
  ),
  cardColor: zColor().describe("لون الكرت البيج الذي يحتضن المحتوى"),
  fontColor: zColor().describe("لون النص الرئيسي والثانوي داخل الكرت"),
  captionColor: zColor().describe("لون نص الكابشن"),
  captionBackgroundColor: zColor().describe(
    "لون الشريط خلف الكابشن. استخدم لوناً بشفافية (rgba) لو أردته خفيفاً",
  ),
  /* ---------- المحتوى ---------- */
  logo: z
    .string()
    .optional()
    .describe("مسار اللوقو داخل مجلد public — اتركه فارغاً لإخفاء اللوقو"),
  headline: z
    .string()
    .max(38)
    .describe("النص الرئيسي أسفل المقطع — حتى ٣٨ حرفاً حتى لا ينكسر السطر"),
  subheadline: z
    .string()
    .max(70)
    .optional()
    .describe("نص ثانوي أصغر أسفل النص الرئيسي — حتى ٧٠ حرفاً"),
  media: z
    .string()
    .optional()
    .describe(
      "مسار المقطع (mp4/webm) الذي يظهر داخل الكرت. مكان المقطع محجوز — اترك الحقل فارغاً ليظهر Placeholder",
    ),
  mediaIsImage: z
    .boolean()
    .describe("فعّله فقط لو كان الملف المرفوع صورة ثابتة بدلاً من مقطع فيديو"),
  mediaStartFromSeconds: z
    .number()
    .min(0)
    .describe("من أي ثانية داخل المقطع تبدأ المشاهدة (trim من البداية)"),
  mediaVolume: z
    .number()
    .min(0)
    .max(1)
    .describe("مستوى صوت المقطع نفسه — صفر يعني كتم"),
  /* ---------- الصوت والكابشن ---------- */
  voiceover: z
    .string()
    .optional()
    .describe(
      "مسار التعليق الصوتي — لو وُجد فمدة الفيديو تُحسب من طوله تلقائياً",
    ),
  voiceoverVolume: z.number().min(0).max(1).describe("مستوى التعليق الصوتي"),
  captions: z
    .array(captionSchema)
    .describe("الكابشن جاهزاً كمصفوفة — يُولَّد من ملف SRT خارج القالب"),
  showCaptions: z.boolean().describe("إظهار أو إخفاء الكابشن بالكامل"),
  /* ---------- الحركة ---------- */
  revealDelayInFrames: z
    .number()
    .min(0)
    .describe(
      "عدد الفريمات قبل أن يبدأ المقطع بالتمدد (وقفة تنفّس في البداية)",
    ),
  revealDurationInFrames: z
    .number()
    .min(2)
    .describe(
      "طول حركة التمدد بالفريمات — الأصل ٨ فريمات، كلما قلّت صارت أعنف",
    ),
  revealDirection: z
    .enum(["vertical", "horizontal"])
    .describe(
      "اتجاه التمدد: vertical يفتح من شريط أفقي، horizontal يفتح من شريط عمودي",
    ),
  revealStartScaleMinor: z
    .number()
    .min(0.01)
    .max(1)
    .describe("سماكة الشريط عند بداية الحركة — ٠.٠٥ يعني ٥٪ من الحجم النهائي"),
  revealStartScaleMajor: z
    .number()
    .min(0.1)
    .max(1)
    .describe("طول الشريط عند بداية الحركة — ٠.٧١ في التصميم الأصلي"),
  revealAnchor: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "نقطة الارتكاز من أعلى المقطع — ٠.٤٢ تجعل الحافة السفلية تنزل أكثر مما تصعد العلوية",
    ),
  textDelayInFrames: z
    .number()
    .min(0)
    .describe("كم فريماً بعد انتهاء التمدد يبدأ النص بالظهور"),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .describe("شدة التوهج/الظل أسفل الكرت والمقطع — صفر يلغيه تماماً"),
  /* ---------- الشكل ---------- */
  cardRadiusRatio: z
    .number()
    .min(0)
    .max(0.3)
    .describe("نصف قطر زوايا الكرت كنسبة من العرض المرجعي"),
  mediaRadiusRatio: z
    .number()
    .min(0)
    .max(0.3)
    .describe("نصف قطر زوايا المقطع كنسبة من العرض المرجعي"),
  /* ---------- التايبوغرافي ---------- */
  saltWordIndices: z
    .array(z.number().int().min(0))
    .describe(
      "أرقام كلمات النص الرئيسي (تبدأ من ٠) التي تُفعَّل عليها «الأحرف المرسلة» salt. " +
        "تُصفّى تلقائياً وفق دليل ثمانية: لا في نص طويل، ولا في كلمتين متجاورتين، " +
        "ولا بكثرة، ولا على كلمة لا بديل ممتد لحرفها الأخير. اتركها فارغة لتعطيلها",
    ),
});
/**
 * قيم افتراضية مطابقة للتصميم الأصلي — القالب يعمل ويظهر بشكل جميل دون تعبئة أي حقل.
 */
export const defaultProps = {
  backgroundColor: "#2A211B",
  cardColor: "#E4D4C4",
  fontColor: "#5B4A3C",
  captionColor: "#FFFFFF",
  captionBackgroundColor: "rgba(24, 18, 14, 0.72)",
  logo: undefined,
  headline: "الأمور القانونية",
  subheadline: "نتولى إجراءاتك من أول ورقة إلى آخر توقيع",
  media: undefined,
  mediaIsImage: false,
  mediaStartFromSeconds: 0,
  mediaVolume: 0,
  voiceover: undefined,
  voiceoverVolume: 1,
  captions: [],
  showCaptions: true,
  // ٩ فريمات ≈ ٠.٣ ثانية وقفة، ثم ٨ فريمات ≈ ٠.٢٥ ثانية تمدد — مقيسة من المرجع
  revealDelayInFrames: 9,
  revealDurationInFrames: 8,
  revealDirection: "vertical",
  revealStartScaleMinor: 0.05,
  revealStartScaleMajor: 0.71,
  revealAnchor: 0.42,
  textDelayInFrames: 4,
  glowIntensity: 0.45,
  cardRadiusRatio: 0.0667, // 72 / 1080
  mediaRadiusRatio: 0.0278, // 30 / 1080
  // معطّلة افتراضياً: الأحرف المرسلة قرار تصميمي لكل نص، لا سلوك تلقائي
  saltWordIndices: [],
};
