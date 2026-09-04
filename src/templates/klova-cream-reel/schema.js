import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { contentDurationInFrames } from "../../lib/duration.js";

/**
 * ريل كلوفا الكريمي — مقاس من الفيديو المرجعي (1080×1920).
 *
 * كل رقم هنا نسبةٌ من الإطار لا بكسلاً مطلقاً، فالقالب يصمد على أي مقاس.
 * النِسب مقيسة من الفيديو: البطاقة x[115,974] y[561,1707]، والكابشن سطرٌ
 * أو سطران في أعلى الإطار، واللوقو في الزاوية العليا.
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const captionCueSchema = z.object({
  text: z.string().describe("نص السطر — يُقسَّم كلمات تظهر واحدةً تلو الأخرى"),
  startMs: z.number().min(0).describe("بداية السطر بالملي ثانية"),
  endMs: z.number().min(0).describe("نهاية السطر بالملي ثانية"),
  wordStartsMs: z
    .array(z.number().min(0))
    .optional()
    .describe(
      "لحظة ظهور كل كلمة. حين توجد تُستعمل كما هي — وهي ما يكتبه محرّر الكلمات وما تتبعه نقرات الصوت — وإلا وُزّعت كلمات السطر على مدّته",
    ),
});

/**
 * المشاهد تغيّر ما خلف الكابشن فقط: الكابشن نفسه يجري بالتوقيت من أوله إلى
 * آخره كما في الفيديو المرجعي.
 */
export const sceneSchema = z.object({
  type: z
    .enum(["media", "empty", "stack", "echo"])
    .describe(
      "media = بطاقة المقطع، empty = كريمي فاضٍ والكابشن وحده، stack = كلمات ضخمة كلٌّ في سطر، echo = بطاقة ملوّنة يتكرّر نصّها",
    ),
  durationInFrames: z.number().int().min(1).describe("طول المشهد بالفريمات"),
  text: z
    .string()
    .max(60)
    .optional()
    .describe("نص مشهدَي stack و echo. الفارغ يأخذ العنوان الرئيسي"),
});

export const templateSchema = z.object({
  /* ----------------------------------------------------------- الألوان */
  backgroundColor: zColor().describe("لون الخلفية الكريمية الثابتة"),
  fontColor: zColor().describe("لون الكلمة النشطة — أغمق ما في الكادر"),
  mutedFontColor: zColor().describe("لون الكلمات التي ظهرت قبلها"),
  accentColor: zColor().describe("لون الخط الذهبي تحت الكلمة النشطة"),
  cardPlaceholderColor: zColor().describe("لون البطاقة حين لا يوجد مقطع"),
  echoCardColor: zColor().describe("لون البطاقة الملوّنة في مشهد echo"),
  echoTextColor: zColor().describe("لون النص داخل البطاقة الملوّنة"),

  /* ---------------------------------------------------------- المحتوى */
  headline: z.string().max(60).describe("النص الافتراضي لمشهدَي stack و echo"),
  logo: z
    .string()
    .nullable()
    .optional()
    .describe("مسار الشعار داخل public — يظهر في الزاوية العليا"),
  logoWidthRatio: z
    .number()
    .min(0.05)
    .max(0.4)
    .describe("عرض الشعار كنسبة من عرض الإطار"),
  media: z.string().nullable().optional().describe("مقطع أو صورة داخل البطاقة"),
  mediaFit: z
    .enum(["cover", "contain"])
    .describe("cover يملأ البطاقة ويقصّ، contain يُظهر المقطع كاملاً"),
  mediaMuted: z.boolean().describe("كتم صوت المقطع المرفق داخل البطاقة"),
  captions: z.array(captionCueSchema).describe("أسطر الكابشن — عادةً من SRT"),

  /* --------------------------------------------------------- التخطيط */
  cardWidthRatio: z
    .number()
    .min(0.4)
    .max(1)
    .describe("عرض البطاقة كنسبة من عرض الإطار (0.796 في المرجع)"),
  cardAspect: z
    .number()
    .min(0.3)
    .max(2)
    .describe("نسبة عرض البطاقة إلى ارتفاعها (0.75 في المرجع)"),
  cardCenterYRatio: z
    .number()
    .min(0.2)
    .max(0.9)
    .describe("مركز البطاقة رأسياً كنسبة من الارتفاع (0.591 في المرجع)"),
  cardRadiusRatio: z
    .number()
    .min(0)
    .max(0.2)
    .describe("نصف قطر زوايا البطاقة كنسبة من عرضها"),
  captionBottomRatio: z
    .number()
    .min(0.1)
    .max(0.7)
    .describe(
      "أسفل كتلة الكابشن كنسبة من الارتفاع. الكتلة مثبّتة من أسفلها كما في المرجع، فتنمو لأعلى حين يصير السطر سطرين ولا تزحف على البطاقة",
    ),
  captionWidthRatio: z
    .number()
    .min(0.4)
    .max(1)
    .describe("عرض كتلة الكابشن — يحدّد مكان كسر السطر"),
  captionFontRatio: z
    .number()
    .min(0.03)
    .max(0.12)
    .describe("حجم خط الكابشن كنسبة من عرض الإطار"),
  stackFontRatio: z
    .number()
    .min(0.05)
    .max(0.25)
    .describe("حجم خط الكلمات الضخمة في مشهد stack"),
  echoFontRatio: z
    .number()
    .min(0.03)
    .max(0.15)
    .describe("حجم خط النص داخل البطاقة الملوّنة"),
  echoRepeatCount: z
    .number()
    .int()
    .min(1)
    .max(6)
    .describe("عدد مرات تكرار النص داخل البطاقة الملوّنة"),

  /* ---------------------------------------------------------- الحركة */
  wordEnterFrames: z
    .number()
    .min(0)
    .max(20)
    .describe("عدد فريمات ظهور الكلمة الواحدة"),
  captionUnderline: z
    .boolean()
    .describe("الخط الذهبي الذي يمسح تحت الكلمة النشطة"),
  wordRevealShare: z
    .number()
    .min(0.3)
    .max(1)
    .describe("نسبة مدة السطر التي تُوزَّع عليها كلماته حين لا توقيت صريح"),

  /* ----------------------------------------------------------- الصوت */
  voiceover: z.string().nullable().optional().describe("مسار التعليق الصوتي"),
  voiceoverVolume: z.number().min(0).max(1).describe("مستوى التعليق"),
  clickSfx: z
    .string()
    .nullable()
    .describe("صوت نقرة يشتغل مع كل كلمة تظهر. فارغ يوقفه"),
  clickVolume: z.number().min(0).max(1).describe("مستوى صوت النقرة"),

  /* ---------------------------------------------------------- التسلسل */
  scenes: z
    .array(sceneSchema)
    .min(1)
    .describe("ترتيب المشاهد ومددها — آخر مشهد يتمدّد ليغطي بقية المدة"),
});

export const defaultProps = {
  backgroundColor: "#EBE9DC",
  fontColor: "#211D14",
  mutedFontColor: "#6E675A",
  accentColor: "#C3A656",
  cardPlaceholderColor: "#D3CEC0",
  echoCardColor: "#B98F7C",
  echoTextColor: "#F1E7DA",

  headline: "وسؤالنا لك ؟",
  logo: "klova/logo.png",
  logoWidthRatio: 0.137,
  media: null,
  mediaFit: "cover",
  mediaMuted: true,
  captions: [
    { text: "قد سألت نفسك", startMs: 200, endMs: 1800 },
    { text: "ليش التيشيرت يكون أخف بعد الغسيل ؟", startMs: 1900, endMs: 5200 },
  ],

  // النِسب مقيسة من الفيديو المرجعي: 860÷1080، و860÷1147، ومركز 1134÷1920
  cardWidthRatio: 0.796,
  cardAspect: 0.75,
  cardCenterYRatio: 0.591,
  cardRadiusRatio: 0.04,
  captionBottomRatio: 0.209,
  captionWidthRatio: 0.78,
  captionFontRatio: 0.067,
  stackFontRatio: 0.115,
  echoFontRatio: 0.052,
  echoRepeatCount: 3,

  wordEnterFrames: 4,
  captionUnderline: true,
  wordRevealShare: 0.78,

  voiceover: null,
  voiceoverVolume: 1,
  clickSfx: "klova/click.wav",
  clickVolume: 0.7,

  scenes: [
    { type: "media", durationInFrames: 150 },
    { type: "empty", durationInFrames: 60 },
    { type: "media", durationInFrames: 150 },
    { type: "stack", durationInFrames: 90, text: "القماش يفقد الكثير" },
    { type: "echo", durationInFrames: 60 },
    { type: "media", durationInFrames: 120 },
  ],
};

/**
 * طول الفيديو: أطول ما أُرفق — تعليق أو مقطع أو آخر كابشن — وبحدٍّ أدنى
 * مجموع مدد المشاهد، وآخر مشهد يتمدّد ليغطي الفارق.
 */
export const calculateMetadata = async ({ props }) => {
  const scenesFrames = props.scenes.reduce(
    (total, scene) => total + scene.durationInFrames,
    0,
  );
  const attached = await contentDurationInFrames({
    fps: FPS,
    voiceover: props.voiceover ?? null,
    media: props.media ?? null,
    captions: props.captions,
    fallbackInFrames: scenesFrames,
  });
  return { durationInFrames: Math.max(scenesFrames, attached, 1), fps: FPS };
};
