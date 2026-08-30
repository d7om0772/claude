import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { getAudioDurationInSeconds } from "@remotion/media-utils";

/**
 * ملاحظة على وحدة القياس:
 * كل الأرقام البصرية في هذا الملف بوحدة "بكسل التصميم" على لوحة مرجعية
 * مقاسها 1080x1920. المكوّن يعيد تحجيمها تلقائياً لأي مقاس آخر،
 * فما تحتاج تعدّلها لو غيّرت width/height.
 */

/** أنماط الكابشن الثلاثة المستخرجة من التصميم الأصلي. */
export const captionStyleSchema = z
  .enum(["over", "above", "full"])
  .describe(
    "نمط عرض الكابشن: over = أبيض داخل بطاقة الفيديو | above = غامق فوق بطاقة أفقية | full = غامق في وسط شاشة فاضية",
  );

/** نسبة أبعاد بطاقة الوسائط. */
export const aspectSchema = z
  .enum(["9:16", "16:9", "1:1", "4:5"])
  .describe(
    "نسبة أبعاد بطاقة الوسائط — تحدّد ارتفاع البطاقة، والعرض ثابت دائماً",
  );

export const mediaSchema = z
  .object({
    src: z
      .string()
      .describe("مسار الصورة أو الفيديو (استخدم staticFile أو رابط محلي)"),
    aspect: aspectSchema.default("9:16"),
    startFromMs: z
      .number()
      .min(0)
      .default(0)
      .describe(
        "من أي لحظة يبدأ تشغيل الفيديو بالميلي ثانية (يُتجاهل مع الصور)",
      ),
    muted: z.boolean().default(true).describe("كتم صوت مقطع الفيديو"),
  })
  .describe("وسائط بطاقة واحدة: صورة أو فيديو");

export const sceneSchema = z
  .object({
    startMs: z.number().min(0).describe("بداية المشهد بالميلي ثانية"),
    endMs: z.number().min(0).describe("نهاية المشهد بالميلي ثانية"),
    media: mediaSchema
      .nullable()
      .default(null)
      .describe(
        "وسائط هذا المشهد. اتركه فارغاً عشان يصير مشهد نص على خلفية بيج فاضية",
      ),
    placeholderLabel: z
      .string()
      .max(28)
      .default("")
      .describe(
        "نص يظهر داخل البطاقة النائبة لما ما يكون فيه وسائط — للتخطيط فقط",
      ),
  })
  .describe("مشهد واحد في التايم لاين");

export const captionCueSchema = z
  .object({
    text: z
      .string()
      .max(60)
      .describe("نص الكابشن — يُقسَّم لكلمات وتظهر كلمة كلمة"),
    startMs: z.number().min(0).describe("لحظة ظهور أول كلمة بالميلي ثانية"),
    endMs: z.number().min(0).describe("لحظة اختفاء الكابشن بالميلي ثانية"),
    style: captionStyleSchema.default("full"),
    wordStartsMs: z
      .array(z.number().min(0))
      .default([])
      .describe(
        "توقيت ظهور كل كلمة بالميلي ثانية. اتركه فارغاً وبتتوزّع الكلمات بالتساوي بين startMs و endMs",
      ),
    maxWidthPx: z
      .number()
      .min(120)
      .max(940)
      .default(640)
      .describe("أقصى عرض للسطر بوحدة بكسل التصميم — يتحكم في مكان كسر السطر"),
  })
  .describe("مقطع كابشن واحد (يقابل سطر واحد في ملف SRT)");

export const templateSchema = z.object({
  // ---------------------------------------------------------------- الهوية
  backgroundColor: zColor().describe("لون خلفية الفيديو — بيج الهوية"),
  fontColor: zColor().describe("لون الكلمة اللي ظهرت للتو (الكلمة النشطة)"),
  mutedFontColor: zColor().describe(
    "لون الكلمات اللي ظهرت قبل — أفتح من اللون النشط",
  ),
  overlayFontColor: zColor().describe(
    "لون الكابشن اللي فوق الفيديو مباشرة (أبيض عادةً)",
  ),
  accentColor: zColor().describe("لون الشعار والبطاقة النائبة — نحاسي الهوية"),
  placeholderFillColor: zColor().describe(
    "لون تعبئة البطاقة النائبة لما ما يكون فيه وسائط",
  ),

  // ---------------------------------------------------------------- الشعار
  logo: z
    .string()
    .nullable()
    .describe("مسار صورة الشعار (PNG بخلفية شفافة). اتركه null لإخفائه"),
  logoWidthPx: z
    .number()
    .min(40)
    .max(400)
    .describe("عرض الشعار بوحدة بكسل التصميم"),
  logoTopPx: z
    .number()
    .min(0)
    .max(400)
    .describe("بعد الشعار عن أعلى الشاشة بوحدة بكسل التصميم"),

  // ---------------------------------------------------------------- النصوص
  headline: z
    .string()
    .max(48)
    .describe(
      "النص الرئيسي. يظهر فقط لو ما فيه كابشن — بديل احتياطي عشان القالب يشتغل من غير ما تعبّي شي",
    ),
  subheadline: z
    .string()
    .max(48)
    .describe(
      "نص ثانوي تحت الرئيسي. يظهر فقط لو ما فيه كابشن. اتركه فاضي لإخفائه",
    ),

  // ---------------------------------------------------------------- المحتوى
  media: mediaSchema
    .nullable()
    .describe("وسائط افتراضية تُستخدم في أي مشهد ما حدّدت له وسائط خاصة"),
  scenes: z.array(sceneSchema).describe("تقسيم التايم لاين لمشاهد"),
  captions: z
    .array(captionCueSchema)
    .describe("مصفوفة الكابشن — عادةً محوّلة من ملف SRT"),

  // ---------------------------------------------------------------- الصوت
  voiceover: z
    .string()
    .nullable()
    .describe("مسار ملف التعليق الصوتي. المدة تُحسب منه تلقائياً"),
  voiceoverVolume: z
    .number()
    .min(0)
    .max(1)
    .describe("مستوى صوت التعليق من 0 إلى 1"),
  clickSfx: z
    .string()
    .nullable()
    .describe("مسار صوت النقرة اللي يشتغل مع كل كلمة تظهر. null يوقفه"),
  clickVolume: z.number().min(0).max(1).describe("مستوى صوت النقرة من 0 إلى 1"),

  // ---------------------------------------------------------------- البطاقة
  cardWidthPx: z
    .number()
    .min(300)
    .max(1040)
    .describe("عرض بطاقة الوسائط بوحدة بكسل التصميم"),
  cardRadiusPx: z.number().min(0).max(120).describe("نصف قطر زوايا البطاقة"),

  // ---------------------------------------------------------------- الحركة
  wordPopFrames: z
    .number()
    .min(1)
    .max(20)
    .describe("عدد الفريمات اللي تاخذها الكلمة عشان تظهر كاملة — 4 في الأصل"),
  wordPopRisePx: z
    .number()
    .min(0)
    .max(40)
    .describe("مقدار ارتفاع الكلمة وهي تظهر بوحدة بكسل التصميم. 0 يوقف الحركة"),
  wordPopStartOpacity: z
    .number()
    .min(0)
    .max(1)
    .describe("شفافية الكلمة في أول فريم من ظهورها"),
  cardEnterFrames: z
    .number()
    .min(0)
    .max(30)
    .describe(
      "عدد فريمات دخول البطاقة (تلاشي + تكبير خفيف). 0 يخليها تظهر فجأة",
    ),

  // ---------------------------------------------------------------- الخط
  captionFontSizes: z
    .object({
      over: z.number().min(20).max(200).describe("حجم خط الكابشن فوق الفيديو"),
      above: z
        .number()
        .min(20)
        .max(200)
        .describe("حجم خط الكابشن فوق البطاقة الأفقية"),
      full: z
        .number()
        .min(20)
        .max(200)
        .describe("حجم خط الكابشن في وسط الشاشة"),
    })
    .describe("أحجام الخط بوحدة بكسل التصميم لكل نمط كابشن"),
});

/* -------------------------------------------------------------------------- */
/*                             القيم الافتراضية                                */
/* -------------------------------------------------------------------------- */

/**
 * التوقيتات أدناه مستخرجة من الفيديو المرجعي بدقة الإطار (30 فريم/ث)
 * عن طريق رصد القفزات في كثافة بكسلات النص بين كل إطار والذي قبله.
 * لا تعدّلها إلا لو غيّرت التعليق الصوتي.
 */
export const defaultProps = {
  backgroundColor: "#EBE9DC",
  fontColor: "#2A2112",
  mutedFontColor: "#6A6256",
  overlayFontColor: "#FFFFFF",
  accentColor: "#C6A089",
  placeholderFillColor: "#4A443C",

  logo: "klova/logo.png",
  logoWidthPx: 130,
  logoTopPx: 29,

  headline: "في كلوفا شلنا عنك هذا التعب",
  subheadline: "",

  media: null,

  scenes: [
    {
      startMs: 0,
      endMs: 4000,
      media: null,
      placeholderLabel: "لقطة ١ — المتحدث",
    },
    { startMs: 4000, endMs: 6400, media: null, placeholderLabel: "" },
    { startMs: 6400, endMs: 10500, media: null, placeholderLabel: "لقطة ٢" },
    { startMs: 10500, endMs: 13700, media: null, placeholderLabel: "لقطة ٣" },
    { startMs: 13700, endMs: 16500, media: null, placeholderLabel: "" },
    {
      startMs: 16500,
      endMs: 20800,
      media: null,
      placeholderLabel: "لقطة ٤ — أفقي",
    },
    { startMs: 20800, endMs: 23030, media: null, placeholderLabel: "" },
  ],

  captions: [
    {
      text: "تدري إن أكثر شي",
      startMs: 67,
      endMs: 1360,
      style: "over",
      wordStartsMs: [67, 500, 733, 1133],
      maxWidthPx: 790,
    },
    {
      text: "يوقف الناس عن الشراء",
      startMs: 1367,
      endMs: 3130,
      style: "over",
      wordStartsMs: [1367, 1800, 2300, 2567],
      maxWidthPx: 400,
    },
    {
      text: "مو السعر،",
      startMs: 3167,
      endMs: 4000,
      style: "over",
      wordStartsMs: [3167, 3400],
      maxWidthPx: 790,
    },
    {
      text: "هو إنه يحس ان في شي ناقص",
      startMs: 4000,
      endMs: 6400,
      style: "full",
      wordStartsMs: [4000, 4267, 4600, 5100, 5267, 5467, 5700],
      maxWidthPx: 640,
    },
    {
      text: "او تيشيرت خامة فخمة",
      startMs: 10567,
      endMs: 12200,
      style: "over",
      wordStartsMs: [10567, 10800, 11400, 11833],
      maxWidthPx: 480,
    },
    {
      text: "لكن السعر غالي",
      startMs: 12233,
      endMs: 13700,
      style: "over",
      wordStartsMs: [12233, 12567, 13033],
      maxWidthPx: 420,
    },
    {
      text: "في كلوفا شلنا عنك هذا التعب",
      startMs: 13733,
      endMs: 16500,
      style: "full",
      wordStartsMs: [13733, 14000, 14633, 15033, 15400, 15700],
      maxWidthPx: 620,
    },
    {
      text: "ثلاث تيشيرتات بمية وتسعة",
      startMs: 16567,
      endMs: 18600,
      style: "above",
      wordStartsMs: [16567, 16933, 17700, 18133],
      maxWidthPx: 440,
    },
    {
      text: "وتسعين والشحن مجاني",
      startMs: 18667,
      endMs: 20800,
      style: "above",
      wordStartsMs: [18667, 19233, 19833],
      maxWidthPx: 440,
    },
    {
      text: "وعندنا اغلب طرق الدفع",
      startMs: 20800,
      endMs: 23030,
      style: "full",
      wordStartsMs: [20800, 21600, 22000, 22367],
      maxWidthPx: 620,
    },
  ],

  voiceover: null,
  voiceoverVolume: 1,
  clickSfx: "klova/click.wav",
  clickVolume: 0.85,

  cardWidthPx: 860,
  cardRadiusPx: 28,

  // 4 فريمات = 133 ملي ثانية، وهو طول تدرّج ظهور الكلمة المقاس من الفيديو الأصلي
  wordPopFrames: 4,
  wordPopRisePx: 6,
  wordPopStartOpacity: 0.15,
  // صفر: البطاقة ظاهرة من الفريم الأول كالنص. أي قيمة أكبر تبدأ بشفافية صفر
  // فتتأخّر البطاقة عن أول كلمة، وهو تنافر واضح في أول ثانية.
  cardEnterFrames: 0,

  captionFontSizes: { over: 77, above: 77, full: 89 },
};

/* -------------------------------------------------------------------------- */
/*                              حساب مدة الفيديو                               */
/* -------------------------------------------------------------------------- */

/** آخر لحظة فيها محتوى، بالميلي ثانية. */
const lastContentMs = (props) => {
  const sceneEnd = props.scenes.reduce((m, s) => Math.max(m, s.endMs), 0);
  const capEnd = props.captions.reduce((m, c) => Math.max(m, c.endMs), 0);
  return Math.max(sceneEnd, capEnd);
};

/**
 * المدة تُشتق من التعليق الصوتي لو كان موجوداً، وإلا من آخر مشهد/كابشن.
 * وإذا ما فيه ولا واحد منهم، ترجع 3 ثواني عشان القالب ما يطلع فاضي.
 */
export const calculateMetadata = async ({ props, defaultProps: fallback }) => {
  const fps = 30;
  let durationMs = lastContentMs(props);

  if (props.voiceover !== null && props.voiceover.length > 0) {
    try {
      const seconds = await getAudioDurationInSeconds(props.voiceover);
      durationMs = Math.max(durationMs, seconds * 1000);
    } catch {
      // لو تعذّر قراءة الصوت نكمل بمدة المحتوى بدل ما نفشل الرندر
    }
  }

  if (durationMs <= 0) {
    durationMs = lastContentMs(fallback) || 3000;
  }

  return {
    durationInFrames: Math.max(1, Math.ceil((durationMs / 1000) * fps)),
    fps,
  };
};
