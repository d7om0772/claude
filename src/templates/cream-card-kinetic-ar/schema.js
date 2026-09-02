import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { contentDurationInFrames } from "../../lib/duration.js";

/**
 * كل نص في .describe() يظهر للمستخدم داخل واجهة Remotion Studio.
 * القيم الرقمية كلها بوحدات لوحة التصميم الأساسية (1080×1920)
 * ويعاد تحجيمها تلقائياً حسب مقاس التركيبة الفعلي.
 */

/* -------------------------------------------------------------------------- */
/*                                  الكابشن                                    */
/* -------------------------------------------------------------------------- */

export const captionCueSchema = z.object({
  text: z
    .string()
    .max(70)
    .describe("نص السطر كما يظهر على الشاشة — يُقسم تلقائياً كلمة كلمة"),
  startMs: z
    .number()
    .int()
    .min(0)
    .describe("بداية السطر بالملي ثانية (من ملف SRT)"),
  endMs: z
    .number()
    .int()
    .min(0)
    .describe("نهاية السطر بالملي ثانية (من ملف SRT)"),
  wordStartsMs: z
    .array(z.number().min(0))
    .optional()
    .describe(
      "لحظة ظهور كل كلمة. حين توجد تُستعمل كما هي — وهي ما يكتبه محرّر الكلمات وما تتبعه نقرات الصوت — وإلا وُزّعت كلمات السطر على مدّته",
    ),
});

/* -------------------------------------------------------------------------- */
/*                                  المشاهد                                    */
/* -------------------------------------------------------------------------- */

/** مشهد الكرت: المقطع داخل كرت بحواف دائرية + سطر كابشن */
export const mediaCaptionSceneSchema = z.object({
  type: z.literal("mediaCaption"),
  durationInFrames: z.number().int().min(1).describe("طول المشهد بالفريمات"),
  captionPlacement: z
    .enum(["above", "inside"])
    .describe(
      "مكان الكابشن: above = فوق الكرت بلون داكن، inside = داخل الصورة بلون أبيض",
    ),
});

/** مشهد الكلمات المتراكمة: كلمة تحت كلمة في منتصف الشاشة */
export const wordStackSceneSchema = z.object({
  type: z.literal("wordStack"),
  durationInFrames: z.number().int().min(1).describe("طول المشهد بالفريمات"),
  text: z
    .string()
    .max(48)
    .optional()
    .describe(
      "الكلمات مفصولة بمسافات — إذا تُرك فارغاً يستخدم العنوان الرئيسي",
    ),
});

/** مشهد الكرت الملوّن: كرت كامل يطلع بأثر حركة (echo trail) */
export const colorCardSceneSchema = z.object({
  type: z.literal("colorCard"),
  durationInFrames: z.number().int().min(1).describe("طول المشهد بالفريمات"),
  text: z
    .string()
    .max(60)
    .optional()
    .describe("نص الكرت — إذا تُرك فارغاً يستخدم العنوان الثانوي"),
});

/** مشهد الكلمة المظللة: سطر قصير، كلمة واحدة فيه بمربع ذهبي */
export const highlightWordSceneSchema = z.object({
  type: z.literal("highlightWord"),
  durationInFrames: z.number().int().min(1).describe("طول المشهد بالفريمات"),
  text: z
    .string()
    .max(40)
    .optional()
    .describe("السطر مفصول بمسافات — إذا تُرك فارغاً يستخدم العنوان الثانوي"),
  highlightIndex: z
    .number()
    .int()
    .min(0)
    .describe("ترتيب الكلمة المظللة داخل السطر، تبدأ من صفر"),
});

export const sceneSchema = z.discriminatedUnion("type", [
  mediaCaptionSceneSchema,
  wordStackSceneSchema,
  colorCardSceneSchema,
  highlightWordSceneSchema,
]);

/* -------------------------------------------------------------------------- */
/*                              مخطط القالب الكامل                             */
/* -------------------------------------------------------------------------- */

export const templateSchema = z.object({
  /* ------------------------------- الألوان ------------------------------- */
  backgroundColor: zColor().describe("لون الخلفية الكريمي الثابت خلف كل شيء"),
  fontColor: zColor().describe("لون النص الأساسي الداكن (الكلمة النشطة)"),
  mutedFontColor: zColor().describe(
    "لون النص الخافت قبل أن يدفأ السطر وللكلمات السابقة",
  ),
  accentColor: zColor().describe(
    "اللون الذهبي: الخط تحت الكلمة النشطة والمربع خلف الكلمة المظللة",
  ),
  cardPlaceholderColor: zColor().describe(
    "لون الكرت حين لا يوجد مقطع مرفوع (البديل المؤقت)",
  ),
  colorCardBackground: zColor().describe("لون الكرت الملوّن في مشهد السؤال"),
  colorCardTextColor: zColor().describe("لون النص داخل الكرت الملوّن"),
  captionInsideColor: zColor().describe(
    "لون الكابشن حين يكون داخل الصورة (أبيض في الأصل)",
  ),

  /* ------------------------------- المحتوى ------------------------------- */
  headline: z
    .string()
    .max(48)
    .describe("العنوان الرئيسي — يظهر ككلمات متراكمة، كلمة في كل سطر"),
  subheadline: z
    .string()
    .max(60)
    .optional()
    .describe("العنوان الثانوي — النص الافتراضي للكرت الملوّن ومشهد الختام"),
  logo: z
    .string()
    .nullable()
    .optional()
    .describe("مسار صورة الشعار داخل مجلد public (اختياري)"),
  logoWidth: z
    .number()
    .min(40)
    .max(400)
    .describe("عرض الشعار بوحدات لوحة 1080 عرضاً"),
  media: z
    .string()
    .nullable()
    .optional()
    .describe(
      "مقطع أو صورة داخل مجلد public تظهر داخل الكرت (mp4 / mov / webm / jpg / png)",
    ),
  mediaFit: z
    .enum(["cover", "contain"])
    .describe("cover يملأ الكرت ويقص الزوائد، contain يُظهر الوسيط كاملاً"),
  mediaMuted: z
    .boolean()
    .describe(
      "كتم صوت المقطع المرفق داخل الكرت — يُفضّل تركه مفعّلاً مع التعليق الصوتي",
    ),
  voiceover: z
    .string()
    .nullable()
    .optional()
    .describe("ملف الصوت المرجعي داخل مجلد public — يحدّد طول الفيديو"),
  clickSfx: z
    .string()
    .nullable()
    .describe("صوت نقرة يشتغل مع كل كلمة تظهر. فارغ يوقفه"),
  clickVolume: z.number().min(0).max(1).describe("مستوى صوت النقرة"),
  captions: z
    .array(captionCueSchema)
    .describe("أسطر الكابشن المستخرجة من ملف SRT"),

  /* ------------------------------- التخطيط ------------------------------- */
  cardWidthRatio: z
    .number()
    .min(0.4)
    .max(1)
    .describe("عرض كرت المقطع كنسبة من عرض الشاشة (0.799 في الأصل)"),
  cardAspectRatio: z
    .number()
    .min(0.3)
    .max(2)
    .describe("نسبة عرض الكرت إلى ارتفاعه (0.578 في الأصل ≈ 9:15.6)"),
  cardCornerRadius: z
    .number()
    .min(0)
    .max(200)
    .describe("انحناء زوايا الكرت بوحدات لوحة 1080"),
  captionFontSize: z
    .number()
    .min(20)
    .max(120)
    .describe("حجم خط الكابشن فوق الكرت"),
  captionInsideFontSize: z
    .number()
    .min(20)
    .max(140)
    .describe("حجم خط الكابشن داخل الصورة"),
  headlineFontSize: z
    .number()
    .min(40)
    .max(220)
    .describe("حجم خط الكلمات المتراكمة"),
  colorCardFontSize: z
    .number()
    .min(30)
    .max(180)
    .describe("حجم خط النص داخل الكرت الملوّن"),
  highlightFontSize: z
    .number()
    .min(30)
    .max(180)
    .describe("حجم خط مشهد الكلمة المظللة"),

  /* ------------------------------- الحركة -------------------------------- */
  motionSpeed: z
    .number()
    .min(0.4)
    .max(2.5)
    .describe("معامل سرعة كل حركات الدخول: 1 = التوقيت الأصلي، أكبر = أسرع"),
  colorCardEnterFrom: z
    .enum(["bottom", "top", "start", "end"])
    .describe("اتجاه دخول الكرت الملوّن (start/end حسب اتجاه القراءة)"),
  trailIntensity: z
    .number()
    .min(0)
    .max(1)
    .describe("شدة أثر الحركة خلف نص الكرت الملوّن — 0 يلغيه تماماً"),
  captionUnderline: z
    .boolean()
    .describe("إظهار الخط الذهبي الذي يمسح تحت الكلمة النشطة"),
  wordRevealShare: z
    .number()
    .min(0.3)
    .max(1)
    .describe(
      "نسبة مدة السطر التي تُوزّع عليها الكلمات — الباقي وقت قراءة ثابت",
    ),

  /* ------------------------------- التسلسل ------------------------------- */
  scenes: z
    .array(sceneSchema)
    .min(1)
    .describe(
      "ترتيب المشاهد ومددها — آخر مشهد يتمدد تلقائياً ليغطي بقية طول الصوت",
    ),
});

/* -------------------------------------------------------------------------- */
/*                          الثوابت والقيم الافتراضية                          */
/* -------------------------------------------------------------------------- */

/** لوحة التصميم الأساسية — كل الأرقام أعلاه منسوبة لها */
export const BASE_WIDTH = 1080;
export const BASE_HEIGHT = 1920;

/** معدل الفريمات المعتمد للقالب، تستخدمه calculateMetadata أيضاً */
export const TEMPLATE_FPS = 30;

export const defaultProps = {
  backgroundColor: "#EAE6DA",
  fontColor: "#292313",
  mutedFontColor: "#B4AE9F",
  accentColor: "#D49F3C",
  cardPlaceholderColor: "#C7C1B0",
  colorCardBackground: "#B28D7B",
  colorCardTextColor: "#EDE4D8",
  captionInsideColor: "#FFFFFF",

  headline: "تعال خلني أعلمك",
  subheadline: "وسؤالنا لك ؟",
  logo: undefined,
  logoWidth: 130,
  media: undefined,
  mediaFit: "cover",
  mediaMuted: true,
  voiceover: undefined,
  clickSfx: "klova/click.wav",
  clickVolume: 0.7,
  captions: [
    { text: "ما راح يصير نفسه", startMs: 300, endMs: 4200 },
    { text: "لأن الشاشة تضيء من الداخل", startMs: 6400, endMs: 9800 },
    { text: "بعكس القماش اللي يمتص الضوء", startMs: 10200, endMs: 13200 },
  ],

  cardWidthRatio: 0.799, // 863 ÷ 1080 — مقاس الكرت في الفيديو المرجعي
  cardAspectRatio: 0.578, // 863 ÷ 1493
  cardCornerRadius: 52,
  captionFontSize: 44,
  captionInsideFontSize: 52,
  headlineFontSize: 100,
  colorCardFontSize: 78,
  highlightFontSize: 70,

  motionSpeed: 1,
  colorCardEnterFrom: "bottom",
  trailIntensity: 1,
  captionUnderline: true,
  wordRevealShare: 0.72,

  scenes: [
    { type: "mediaCaption", durationInFrames: 132, captionPlacement: "above" },
    { type: "wordStack", durationInFrames: 54 },
    { type: "mediaCaption", durationInFrames: 114, captionPlacement: "inside" },
    { type: "mediaCaption", durationInFrames: 102, captionPlacement: "above" },
    { type: "colorCard", durationInFrames: 78 },
    { type: "highlightWord", durationInFrames: 66, highlightIndex: 1 },
  ],
};

/**
 * مجموع مدد المشاهد الافتراضية = 546 فريم = 18.2 ثانية عند 30fps.
 * تُستخدم كقيمة احتياطية إن لم يوجد صوت ولا كابشن.
 */
export const DEFAULT_DURATION_IN_FRAMES = defaultProps.scenes.reduce(
  (total, scene) => total + scene.durationInFrames,
  0,
);

/**
 * طول الفيديو: أطول ما أُرفق — التعليق الصوتي، أو المقطع، أو آخر كابشن —
 * وبحدٍّ أدنى مجموع مدد المشاهد. آخر مشهد يتمدّد ليغطّي الفارق.
 */
export const calculateMetadata = async ({ props }) => {
  const scenesFrames = props.scenes.reduce(
    (total, scene) => total + scene.durationInFrames,
    0,
  );
  const attached = await contentDurationInFrames({
    fps: TEMPLATE_FPS,
    voiceover: props.voiceover ?? null,
    media: props.media ?? null,
    captions: props.captions,
    fallbackInFrames: scenesFrames,
  });
  return {
    durationInFrames: Math.max(scenesFrames, attached, 1),
    fps: TEMPLATE_FPS,
  };
};
