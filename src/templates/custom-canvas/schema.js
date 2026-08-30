import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { contentDurationInFrames } from "../../lib/duration.js";

/**
 * لوحة حرّة: القالب لا يفرض تخطيطاً، بل يعطي طبقتين — مقطع ونص — يضعهما
 * المستخدم بالماوس. لذلك كل موضع هنا نسبة من الإطار لا رقماً مطلقاً: نفس
 * القيم تعمل على أي مقاس فيديو.
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const captionCueSchema = z.object({
  text: z.string().describe("نص المقطع — يُقسَّم كلمات وتظهر كلمة كلمة"),
  startMs: z.number().min(0).describe("لحظة ظهور أول كلمة بالملي ثانية"),
  endMs: z.number().min(0).describe("لحظة اختفاء المقطع بالملي ثانية"),
  wordStartsMs: z
    .array(z.number().min(0))
    .describe("توقيت ظهور كل كلمة. الفارغ يوزّع الكلمات بالتساوي"),
});

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

  /* ------------------------------------------------------------ النص */
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
    .describe("صوت نقرة يشتغل مع كل كلمة تظهر. فارغ يوقفه"),
  clickVolume: z.number().min(0).max(1).describe("مستوى النقرة"),
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
