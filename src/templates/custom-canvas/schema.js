import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { contentDurationInFrames } from "../../lib/duration.js";
import { FONT_STYLES, FONT_STYLE_IDS } from "../../lib/fonts.js";

/**
 * لوحة حرّة: القالب لا يفرض تخطيطاً، بل يعطي طبقتين — مقطع ونص — يضعهما
 * المستخدم بالماوس. لذلك كل موضع هنا نسبة من الإطار لا رقماً مطلقاً: نفس
 * القيم تعمل على أي مقاس فيديو.
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/* يُعرَّف قبل المقاطع لأن لكل سطر ستايله الخاص */
export const textStyleSchema = z
  .enum([
    "karaoke",
    "pop",
    "kinetic",
    "boxed",
    "highlight",
    "underline",
    "slide",
    "stack",
    "oneWord",
    "gradient",
  ])
  .describe(
    "ستايل كشف الكلمات: تراكم | قفزة | سطر متحرك | شريط | تظليل | تسطير | انزلاق | تراص عمودي | كلمة واحدة | تدرّج لوني",
  );

export const captionCueSchema = z.object({
  text: z.string().describe("نص المقطع — يُقسَّم كلمات وتظهر كلمة كلمة"),
  startMs: z.number().min(0).describe("لحظة ظهور أول كلمة بالملي ثانية"),
  endMs: z.number().min(0).describe("لحظة اختفاء المقطع بالملي ثانية"),
  wordStartsMs: z
    .array(z.number().min(0))
    .describe("توقيت ظهور كل كلمة. الفارغ يوزّع الكلمات بالتساوي"),
  style: textStyleSchema
    .nullable()
    .optional()
    .describe("ستايل هذا السطر وحده. فارغ يعني ستايل القالب العام"),
  yRatio: z
    .number()
    .min(0)
    .max(1)
    .nullable()
    .optional()
    .describe("موضع هذا السطر رأسياً كنسبة من الارتفاع. فارغ يعني موضع القالب"),
});

export const revealModeSchema = z
  .enum(["word", "cue"])
  .describe(
    "طريقة الكشف: word كلمة بعد كلمة داخل المقطع | cue الجملة كاملة تظهر دفعة واحدة، فتتحكم بتوقيت كل جملة وحدها",
  );

export const mediaStyleSchema = z
  .enum([
    "plain",
    "shadow",
    "frame",
    "polaroid",
    "tilt",
    "offset",
    "circle",
    "zoom",
  ])
  .describe(
    "ستايل المقطع: بلا زخرفة | ظل | إطار ملوّن | بولارويد | ميلان | بطاقة مزاحة خلفه | دائرة | تكبير بطيء",
  );

export const templateSchema = z.object({
  /* ---------------------------------------------------------- اللوحة */
  backgroundColor: zColor().describe("لون خلفية الإطار"),

  /* ---------------------------------------------------------- المقطع */
  media: z
    .string()
    .nullable()
    .describe("مسار الصورة أو الفيديو. اتركه فارغاً للنص وحده"),
  mediaAspect: z
    .number()
    .min(0.1)
    .max(10)
    .nullable()
    .describe("نسبة عرض المقطع إلى ارتفاعه — تُقاس تلقائياً عند الرفع"),
  mediaCenterXRatio: z
    .number()
    .min(-0.5)
    .max(1.5)
    .describe("مركز المقطع أفقياً كنسبة من العرض — يُحرَّك بالماوس"),
  mediaCenterYRatio: z
    .number()
    .min(-0.5)
    .max(1.5)
    .describe("مركز المقطع رأسياً كنسبة من الارتفاع — يُحرَّك بالماوس"),
  mediaScale: z
    .number()
    .min(0.1)
    .max(2)
    .describe("عرض المقطع كنسبة من عرض الإطار — يُغيَّر بمقبض الزاوية"),
  mediaRadiusRatio: z
    .number()
    .min(0)
    .max(0.5)
    .describe("نصف قطر زوايا المقطع كنسبة من عرضه"),
  mediaMuted: z.boolean().describe("كتم صوت المقطع"),
  mediaStyle: mediaStyleSchema,
  /**
   * نافذة ظهور المقطع.
   *
   * قبلها لا يُعرض المقطع أصلاً — وهذه هي «لحظة ظهوره» التي تُعلَّق عليها
   * النقرة. وبدون نافذة يكون المقطع حاضراً من أول فريم إلى آخره، فلا لحظة
   * ظهورٍ فيه تُسمع.
   */
  mediaStartMs: z
    .number()
    .min(0)
    .describe("لحظة ظهور المقطع بالملي ثانية — صفر يعني من البداية"),
  mediaEndMs: z
    .number()
    .min(0)
    .nullable()
    .describe("لحظة اختفاء المقطع بالملي ثانية — فارغ يعني حتى نهاية الفيديو"),

  /* ------------------------------------------------------------ النص */
  fontStyle: z
    .enum(FONT_STYLE_IDS)
    .describe("أسلوب الخط — يسري على كل النصوص في اللوحة")
    .meta({
      labels: Object.fromEntries(FONT_STYLES.map((s) => [s.id, s.label])),
    }),
  textStyle: textStyleSchema,
  revealMode: revealModeSchema,
  captions: z.array(captionCueSchema).describe("مقاطع الكلمات — عادةً من SRT"),
  headline: z
    .string()
    .max(80)
    .describe("نص يظهر حين تكون المقاطع فارغة — لتجربة الستايل"),
  textCenterXRatio: z
    .number()
    .min(0)
    .max(1)
    .describe("مركز كتلة النص أفقياً — تُحرَّك بالماوس"),
  textCenterYRatio: z
    .number()
    .min(0)
    .max(1)
    .describe("مركز كتلة النص رأسياً — تُحرَّك بالماوس"),
  textWidthRatio: z
    .number()
    .min(0.2)
    .max(1)
    .describe("عرض كتلة النص كنسبة من عرض الإطار — يتحكم في مكان كسر السطر"),
  fontSizeRatio: z
    .number()
    .min(0.02)
    .max(0.2)
    .describe("حجم الخط كنسبة من عرض الإطار"),
  fontColor: zColor().describe("لون الكلمة النشطة"),
  mutedFontColor: zColor().describe("لون الكلمات التي ظهرت قبلها"),
  accentColor: zColor().describe("لون الشريط في ستايل boxed"),
  wordEnterFrames: z
    .number()
    .min(0)
    .max(20)
    .describe("عدد فريمات ظهور الكلمة. صفر يجعلها تظهر فجأة"),

  /* ----------------------------------------------------------- الصوت */
  voiceover: z.string().nullable().describe("مسار التعليق الصوتي"),
  voiceoverVolume: z.number().min(0).max(1).describe("مستوى التعليق"),
  clickSfx: z
    .string()
    .nullable()
    .describe("ملف صوت النقرة. فارغ يوقف النقرات كلها مهما كانت مشغّلاتها"),
  clickVolume: z.number().min(0).max(1).describe("مستوى النقرة"),
  /**
   * مشغّلات النقرة — ثلاثة مستقلّة تُجمع كما يشاء المستخدم.
   *
   * فُصلت أعلاماً ثلاثة لا قائمةَ اختيارٍ واحدة لأنها تجتمع: نقرة مع كل كلمة
   * ونقرة أقوى عند ظهور المقطع معاً أمرٌ مطلوب، ولا تعبّر عنه قائمة تختار
   * واحداً.
   *
   * وكانت النقرة قبل هذا تتبع `revealMode` ضمناً — كلمةً في وضع الكلمة
   * وجملةً في وضع الجملة — فلا يملك المستخدم فصلها عن طريقة الكشف. صارت
   * مستقلّة: يكشف كلمةً كلمة وينقر مع الجملة إن شاء.
   */
  clickOnWord: z.boolean().describe("نقرة مع ظهور كل كلمة"),
  clickOnLine: z.boolean().describe("نقرة مع بداية كل سطر"),
  clickOnMedia: z.boolean().describe("نقرة مع ظهور المقطع أو الصورة"),
  tailDurationInFrames: z
    .number()
    .min(0)
    .max(120)
    .describe("فريمات إضافية بعد آخر كلمة"),
});

export const defaultProps = {
  backgroundColor: "#EEEADE",

  media: null,
  mediaAspect: null,
  mediaCenterXRatio: 0.5,
  mediaCenterYRatio: 0.42,
  mediaScale: 0.8,
  mediaRadiusRatio: 0.035,
  mediaMuted: true,
  mediaStyle: "shadow",
  mediaStartMs: 0,
  mediaEndMs: null,

  fontStyle: "thmanyah",
  textStyle: "karaoke",
  revealMode: "word",
  captions: [],
  headline: "اكتب نصك هنا ثم حرّكه بالماوس",
  textCenterXRatio: 0.5,
  textCenterYRatio: 0.82,
  textWidthRatio: 0.78,
  fontSizeRatio: 0.075,
  fontColor: "#2A2112",
  mutedFontColor: "#6C6354",
  accentColor: "#D9A441",
  wordEnterFrames: 4,

  voiceover: null,
  voiceoverVolume: 1,
  clickSfx: "klova/click.wav",
  clickVolume: 0.7,
  clickOnWord: true,
  clickOnLine: false,
  clickOnMedia: false,
  tailDurationInFrames: 12,
};

export const calculateMetadata = async ({ props }) => ({
  durationInFrames: await contentDurationInFrames({
    fps: FPS,
    voiceover: props.voiceover,
    media: props.media,
    captions: props.captions,
    captionTailFrames: props.tailDurationInFrames,
    fallbackInFrames: 90,
  }),
  fps: FPS,
});
