import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { staticFile } from "remotion";
import { contentDurationInFrames } from "../../lib/duration.js";
import { resolveAsset } from "../../lib/asset-url.js";
/**
 * قالب "لقطة البطاقة الورقية" — GLOWORA Paper Card
 * كل قيمة هنا قابلة للتعديل من الواجهة. الأرقام الافتراضية مقاسة
 * مباشرةً من فيديو المرجع الأصلي (تسجيل شاشة CapCut) ولا يجوز تغييرها
 * إلا بقصد، لأنها هي هوية القالب.
 */
/** سطر واحد داخل البطاقة النصية، مع تحكم مستقل بخصائص OpenType. */
export const headlineLineSchema = z.object({
  text: z
    .string()
    .max(24)
    .describe("نص السطر. حد أقصى ٢٤ حرفاً حتى لا يخرج عن عرض البطاقة."),
  kashida: z
    .boolean()
    .describe(
      "تفعيل الكشيدة المائلة لهذا السطر. حسب دليل جماليات خط ثمانية: لا تُفعَّل إلا في سطر واحد من الكتلة، ولا تتكرر داخل الكلمة الواحدة.",
    ),
});
/** كابشن واحد، يجي عادةً من تحويل ملف SRT خارج القالب. */
export const captionSchema = z.object({
  text: z.string().describe("نص الكابشن كما هو من ملف الـ SRT."),
  startMs: z.number().min(0).describe("بداية ظهور الكابشن بالملي ثانية."),
  endMs: z.number().min(0).describe("نهاية ظهور الكابشن بالملي ثانية."),
});
export const paperCardSchema = z.object({
  // ---------------- الألوان ----------------
  backgroundColor: zColor().describe(
    "لون الخلفية الورقية. اللون الأصلي كريمي فاتح، وتُبنى فوقه إضاءة نافذة مائلة وحُبيبات ورق تلقائياً.",
  ),
  fontColor: zColor().describe(
    "لون النص داخل البطاقة ولون الكابشن. البرتقالي الذهبي هو لون الهوية.",
  ),
  cardColor: zColor().describe(
    "لون البطاقة في المشهد الأول (قبل ظهور الوسائط). الأخضر الداكن هو لون الهوية.",
  ),
  brandColor: zColor().describe("لون الشعار والووردمارك أعلى الإطار."),
  captionStrokeColor: zColor().describe(
    "لون الحد الخارجي (الستروك) خلف الكابشن ليقرأ فوق أي مقطع.",
  ),
  // ---------------- الهوية ----------------
  logo: z
    .string()
    .optional()
    .describe(
      "مسار صورة الشعار عبر staticFile. لو تُرك فارغاً يُرسم شعار الزهرة الثمانية المتجهي الافتراضي.",
    ),
  brandName: z
    .string()
    .max(16)
    .describe(
      "الووردمارك تحت الشعار. حد أقصى ١٦ حرفاً حتى لا يزدحم أعلى الإطار.",
    ),
  brandLetterSpacing: z
    .number()
    .min(0)
    .max(0.6)
    .describe("تباعد حروف الووردمارك، بنسبة من حجم الخط."),
  // ---------------- محتوى البطاقة ----------------
  headline: z
    .array(headlineLineSchema)
    .min(1)
    .max(4)
    .describe(
      "أسطر النص داخل البطاقة الخضراء. من سطر إلى أربعة. أكثر من ذلك يكسر الإيقاع الرأسي للبطاقة.",
    ),
  subheadline: z
    .string()
    .max(28)
    .optional()
    .describe(
      "نص ثانوي صغير أسفل الأسطر الرئيسية داخل البطاقة الخضراء. اختياري.",
    ),
  // ---------------- الوسائط ----------------
  media: z
    .string()
    .optional()
    .describe(
      "صورة أو فيديو يظهر داخل نفس إطار البطاقة بعد القطع. نسبة مفضّلة ٩:١٦ (أو أي شيء أطول من ٤:٥ — يُقصّ بـ cover). لو تُرك فارغاً يبقى المشهد النصي طوال المدة.",
    ),
  mediaMuted: z
    .boolean()
    .describe("كتم صوت المقطع المرفق. يُفضّل الكتم عند وجود تعليق صوتي."),
  voiceover: z
    .string()
    .optional()
    .describe(
      "ملف تعليق صوتي. عند إرفاقه تُحسب مدة الفيديو تلقائياً من طول الصوت.",
    ),
  captions: z
    .array(captionSchema)
    .describe(
      "مصفوفة الكابشن الجاهزة من ملف SRT. تنسيقها جزء من هوية القالب، ونصّها فقط يأتي من هنا.",
    ),
  captionSwashWordIndex: z
    .number()
    .int()
    .min(-1)
    .describe(
      "ترتيب الكلمة التي تُفعَّل عليها الأحرف المرسلة داخل الكابشن (٠ = أول كلمة من اليمين). القيمة ‎-1 تعني لا حرف مرسل. الدليل يمنع تفعيلها على كلمتين متجاورتين، لذلك التحكم بكلمة واحدة فقط.",
    ),
  // ---------------- الهندسة ----------------
  cardWidthPct: z
    .number()
    .min(0.4)
    .max(0.96)
    .describe("عرض البطاقة كنسبة من عرض الإطار. الأصل ٠٫٨٠."),
  cardTopPct: z
    .number()
    .min(0.05)
    .max(0.6)
    .describe("أعلى البطاقة كنسبة من ارتفاع الإطار. الأصل ٠٫٢٢٦."),
  cardHeightPct: z
    .number()
    .min(0.2)
    .max(0.85)
    .describe("ارتفاع البطاقة كنسبة من ارتفاع الإطار. الأصل ٠٫٥٩٩."),
  cardRadiusPct: z
    .number()
    .min(0)
    .max(0.3)
    .describe("نصف قطر زوايا البطاقة كنسبة من عرض البطاقة. الأصل ٠٫٠٥٥."),
  // ---------------- الحركة ----------------
  slideStartSec: z
    .number()
    .min(0)
    .describe("اللحظة التي تبدأ عندها البطاقة بالصعود من أسفل الإطار."),
  slideDurationSec: z
    .number()
    .min(0.05)
    .describe("مدة صعود البطاقة حتى تستقر في مكانها."),
  slideDirection: z
    .enum(["up", "down", "left", "right"])
    .describe("اتجاه دخول البطاقة. الأصل صعود من الأسفل."),
  textFadeSec: z
    .number()
    .min(0)
    .describe("اللحظة التي يبدأ عندها النص بالظهور داخل البطاقة."),
  textFadeDurationSec: z.number().min(0.01).describe("مدة ظهور النص."),
  cutSec: z
    .number()
    .min(0)
    .describe(
      "لحظة القطع الحاد من البطاقة النصية إلى الوسائط. القطع مقصود أن يكون حاداً بلا انتقال.",
    ),
  // ---------------- الخامة ----------------
  grainOpacity: z
    .number()
    .min(0)
    .max(0.5)
    .describe("شدة حُبيبات الورق فوق الخلفية."),
  lightIntensity: z
    .number()
    .min(0)
    .max(1)
    .describe("شدة إضاءة النافذة المائلة على الخلفية."),
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .describe("شدة ظل البطاقة على الورق."),
});
export const paperCardDefaultProps = {
  backgroundColor: "#FCF8F5",
  fontColor: "#DFA04E",
  cardColor: "#2D4D48",
  brandColor: "#2D4D48",
  captionStrokeColor: "#1C1C1C",
  logo: undefined,
  brandName: "GLOWORA",
  brandLetterSpacing: 0.24,
  headline: [
    { text: "دقيقة !", kashida: false },
    { text: "دقيقة !", kashida: false },
    { text: "دقيقة !", kashida: true },
  ],
  subheadline: undefined,
  media: undefined,
  mediaMuted: true,
  voiceover: undefined,
  captions: [{ text: "تحس المكان مكتوم", startMs: 1250, endMs: 3000 }],
  captionSwashWordIndex: 1,
  cardWidthPct: 0.8,
  cardTopPct: 0.226,
  cardHeightPct: 0.599,
  cardRadiusPct: 0.055,
  slideStartSec: 0.1,
  slideDurationSec: 0.4,
  slideDirection: "up",
  textFadeSec: 0.34,
  textFadeDurationSec: 0.1,
  cutSec: 1.25,
  grainOpacity: 0.09,
  lightIntensity: 0.14,
  shadowIntensity: 0.42,
};
/* ------------------------------------------------------------------ *
 * حساب المدة من المحتوى
 *
 * لم تكن هذه الدالة موجودة في القالب رغم أن وصف حقل voiceover في الـ schema
 * ينص على أن «مدة الفيديو تُحسب تلقائياً من طول الصوت». أُضيفت لتحقيق ما
 * يَعِد به العقد، بنفس ترتيب أولويات بقية قوالب المشروع:
 * الصوت، ثم آخر كابشن، ثم المدة الافتراضية.
 * ------------------------------------------------------------------ */
const FPS = 30;
/** ذيل سكون بعد آخر كابشن — نصف ثانية، نفس عُرف القوالب الأخرى. */
const TAIL_FRAMES = Math.round(FPS * 0.5);
export const calculateMetadata = async ({ props }) => ({
  durationInFrames: await contentDurationInFrames({
    fps: FPS,
    voiceover: props.voiceover
      ? resolveAsset(props.voiceover, staticFile)
      : null,
    media: props.media ? resolveAsset(props.media, staticFile) : null,
    // المقطع هنا لا يظهر إلا بعد القطع، فمدّته تُضاف إلى لحظة القطع لا
    // إلى بداية اللقطة، وإلا اقتُطع آخره بمقدار زمن المشهد النصي.
    mediaStartFrame: Math.round(props.cutSec * FPS),
    captions: props.captions,
    captionTailFrames: TAIL_FRAMES,
    fallbackInFrames: Math.max(
      Math.ceil((props.cutSec + 1) * FPS),
      Math.round(FPS * 2.5),
    ),
  }),
});
