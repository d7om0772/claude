import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { contentDurationInFrames } from "../../lib/duration.js";

/* -------------------------------------------------------------------------- */
/*  أنواع فرعية                                                                */
/* -------------------------------------------------------------------------- */

/**
 * كابشن واحد. يجي جاهز من تحويل ملف SRT خارج القالب.
 * القالب يختار الكابشن النشط حسب: startMs <= currentMs < endMs
 */
export const captionCueSchema = z.object({
  text: z
    .string()
    .describe("نص الكابشن كما هو في ملف الـ SRT. يُعرض كما وصل بدون أي تعديل."),
  startMs: z
    .number()
    .min(0)
    .describe("لحظة ظهور الكابشن بالميلي ثانية، محسوبة من بداية الفيديو."),
  endMs: z
    .number()
    .min(0)
    .describe("لحظة اختفاء الكابشن بالميلي ثانية، محسوبة من بداية الفيديو."),
  wordStartsMs: z
    .array(z.number().min(0))
    .optional()
    .describe(
      "توقيت ظهور كل كلمة حين يأتي الكابشن من ملف SRT على مستوى الكلمة. تقود نقرات الصوت، والفارغ يوزّع كلمات المقطع على مدّته.",
    ),
});

/** الوسيط اللي يعبّي كرت المشهد الأول (صورة أو فيديو) */
export const mediaAssetSchema = z.object({
  src: z
    .string()
    .describe(
      "مسار الصورة أو الفيديو. المسار النسبي يُقرأ من مجلد public عبر staticFile — مثال: media/shirt.mp4",
    ),
  kind: z
    .enum(["image", "video"])
    .describe("نوع الوسيط: صورة ثابتة أو مقطع فيديو."),
  fit: z
    .enum(["cover", "contain"])
    .describe(
      "cover يملأ الكرت كامل ويقص الزوائد (الوضع الأصلي في القالب)، contain يُظهر الوسيط كامل مع فراغ.",
    ),
  muted: z
    .boolean()
    .describe("كتم صوت الفيديو. يُفضّل تركه مفعّل لأن التعليق الصوتي منفصل."),
});

/** اتجاه دخول الكرت للشاشة */
export const slideDirectionSchema = z.enum(["bottom", "top", "left", "right"]);

/* -------------------------------------------------------------------------- */
/*  السكيما الرئيسية                                                           */
/* -------------------------------------------------------------------------- */

export const templateSchema = z.object({
  /* ----- الهوية اللونية ----- */
  backgroundColor: zColor().describe(
    "لون خلفية الفيديو كامل. اللون الأصلي للقالب كريمي دافئ #EDE9DD.",
  ),
  cardColor: zColor().describe(
    "لون الكرت المستطيل ذو الزوايا الدائرية. اللون الأصلي وردي طيني #B9917D.",
  ),
  cardTextColor: zColor().describe(
    "لون النص المكتوب فوق الكرت. اللون الأصلي كريمي فاتح #F0E6D9.",
  ),
  fontColor: zColor().describe(
    "لون الكابشن المكتوب فوق الخلفية (خارج الكرت). اللون الأصلي بني داكن #4A423A.",
  ),

  /* ----- اللوقو ----- */
  logo: z
    .string()
    .nullable()
    .describe(
      "مسار صورة اللوقو المعروض أعلى الفيديو. اترك القيمة فاضية (null) عشان يختفي اللوقو تماماً.",
    ),
  logoWidthRatio: z
    .number()
    .min(0.04)
    .max(0.5)
    .describe(
      "عرض اللوقو كنسبة من عرض الفيديو. 0.16 يعني أن اللوقو يأخذ 16% من العرض.",
    ),
  logoTopRatio: z
    .number()
    .min(0)
    .max(0.4)
    .describe("بُعد أعلى اللوقو عن حافة الفيديو العلوية كنسبة من الارتفاع."),

  /* ----- نصوص كرت الصدى ----- */
  headline: z
    .string()
    .min(1)
    .max(24)
    .describe(
      "النص الرئيسي المكرر داخل الكرت. الحد الأقصى 24 حرف عشان يبقى في سطر واحد بدون ما يصغر الخط.",
    ),
  subheadline: z
    .string()
    .max(60)
    .nullable()
    .describe(
      "نص ثانوي صغير يظهر تحت كتلة النص المكرر داخل الكرت. اتركه فاضي (null) لإخفائه.",
    ),

  /* ----- إعدادات تكرار النص (جوهر القالب) ----- */
  echoScene: z
    .object({
      repeatCount: z
        .number()
        .int()
        .min(1)
        .max(6)
        .describe(
          "عدد مرات تكرار النص الرئيسي داخل الكرت. القيمة الأصلية في القالب 3.",
        ),
      staggerFrames: z
        .number()
        .int()
        .min(0)
        .max(12)
        .describe(
          "فارق التأخير بالفريمات بين ظهور كل سطر والسطر اللي بعده. 0 يعني كل الأسطر تظهر بنفس اللحظة (السلوك الأصلي).",
        ),
      opacityFalloff: z
        .number()
        .min(0)
        .max(0.5)
        .describe(
          "مقدار خفوت كل سطر عن السطر اللي فوقه لعمل إحساس الصدى. 0 يعني كل الأسطر بنفس الوضوح (السلوك الأصلي).",
        ),
      durationInFrames: z
        .number()
        .int()
        .min(12)
        .describe(
          "طول مشهد كرت الصدى بالفريمات، من بداية الانزلاق إلى القطع الحاد. القيمة الأصلية 49 فريم (1.63 ثانية على 30fps).",
        ),
      startFrame: z
        .number()
        .int()
        .min(0)
        .nullable()
        .describe(
          "فريم بداية كرت الصدى. اتركه فاضي (null) عشان ينحسب تلقائياً بحيث يكون آخر مشهد في الفيديو.",
        ),
    })
    .describe("إعدادات مشهد كرت الصدى — النص المكرر داخل الكرت الوردي."),

  /* ----- إعدادات مشهد الوسائط ----- */
  media: mediaAssetSchema
    .nullable()
    .describe(
      "الصورة أو الفيديو اللي يعبّي كرت المشهد الأول. اتركه فاضي (null) عشان يبدأ الفيديو مباشرة بكرت الصدى.",
    ),
  mediaScene: z
    .object({
      minDurationInFrames: z
        .number()
        .int()
        .min(1)
        .describe(
          "أقل طول لمشهد الوسائط بالفريمات، يُستخدم فقط لو ما فيه تعليق صوتي ولا كابشن يحدد المدة.",
        ),
    })
    .describe("إعدادات مشهد الوسائط — الكرت اللي يعرض الصورة أو الفيديو."),

  /* ----- الحركة ----- */
  motion: z
    .object({
      slideDurationInFrames: z
        .number()
        .int()
        .min(1)
        .max(60)
        .describe(
          "طول حركة انزلاق الكرت للداخل بالفريمات. القيمة الأصلية 12 فريم = 0.4 ثانية على 30fps.",
        ),
      slideDirection: slideDirectionSchema.describe(
        "اتجاه دخول الكرت. الاتجاه الأصلي bottom (يطلع من أسفل الشاشة).",
      ),
      textDelayFrames: z
        .number()
        .int()
        .min(0)
        .max(60)
        .describe(
          "عدد الفريمات بين بداية انزلاق الكرت وبداية ظهور النص. القيمة الأصلية 10 — يعني النص يظهر بالضبط لما يبدأ الكرت يستقر.",
        ),
      textFadeFrames: z
        .number()
        .int()
        .min(1)
        .max(30)
        .describe(
          "طول ظهور النص بالفريمات. القيمة الأصلية 2 فريم — ظهور خاطف يعطي إحساس أن النص انطبع على الكرت.",
        ),
      cornerRadius: z
        .number()
        .min(0)
        .max(200)
        .describe(
          "انحناء زوايا الكرت بوحدة بكسل على مقاس مرجعي 1080×1920 (يتقاس تلقائياً لأي مقاس ثاني). القيمة الأصلية 48.",
        ),
      shadowOpacity: z
        .number()
        .min(0)
        .max(1)
        .describe(
          "شدة الظل تحت الكرت. القيمة الأصلية 0.35 — ظل ناعم بالكاد يبين.",
        ),
    })
    .describe("إعدادات الحركة والتوقيت المشتركة بين كل الكروت."),

  /* ----- الصوت والكابشن ----- */
  voiceover: z
    .string()
    .nullable()
    .describe(
      "مسار ملف التعليق الصوتي. لو انحط، طول الفيديو ينحسب تلقائياً من طول الصوت. اتركه فاضي (null) لفيديو بدون صوت.",
    ),
  clickSfx: z
    .string()
    .nullable()
    .describe("صوت نقرة يشتغل مع كل كلمة تظهر. فارغ يوقفه"),
  clickVolume: z.number().min(0).max(1).describe("مستوى صوت النقرة"),
  captions: z
    .array(captionCueSchema)
    .describe(
      "مصفوفة الكابشن المحوّلة من ملف SRT. القالب يتكفّل بالتنسيق والحركة، وأنت توفّر النص والتوقيت فقط.",
    ),
  captionStyle: z
    .object({
      placement: z
        .enum(["onBackground", "overCard"])
        .describe(
          "موضع الكابشن: onBackground نص كبير على الخلفية الكريمية، overCard نص صغير أعلى يمين الكرت.",
        ),
      yRatio: z
        .number()
        .min(0)
        .max(1)
        .describe(
          "الموضع الرأسي لمركز الكابشن كنسبة من ارتفاع الفيديو. يُستخدم فقط مع onBackground.",
        ),
      enterFrames: z
        .number()
        .int()
        .min(1)
        .max(20)
        .describe("طول حركة ظهور كل كابشن بالفريمات. القيمة الأصلية 3."),
      showDuringEchoScene: z
        .boolean()
        .describe(
          "إظهار الكابشن فوق كرت الصدى. مطفي في القالب الأصلي لأن نص الكرت هو الرسالة.",
        ),
    })
    .describe(
      "إعدادات موضع وحركة الكابشن. أما الخط واللون فجزء من هوية القالب.",
    ),
});

/* -------------------------------------------------------------------------- */
/*  القيم الافتراضية — تنتج اللقطة الأصلية حرفياً                              */
/* -------------------------------------------------------------------------- */

export const defaultProps = {
  backgroundColor: "#EDE9DD",
  cardColor: "#B9917D",
  cardTextColor: "#F0E6D9",
  fontColor: "#4A423A",

  logo: null,
  logoWidthRatio: 0.16,
  logoTopRatio: 0.018,

  headline: "وسؤالنا لك ؟",
  subheadline: null,

  echoScene: {
    repeatCount: 3,
    staggerFrames: 0,
    opacityFalloff: 0,
    durationInFrames: 49,
    startFrame: null,
  },

  media: null,
  mediaScene: {
    minDurationInFrames: 90,
  },

  motion: {
    slideDurationInFrames: 12,
    slideDirection: "bottom",
    textDelayFrames: 10,
    textFadeFrames: 2,
    cornerRadius: 48,
    shadowOpacity: 0.35,
  },

  voiceover: null,
  clickSfx: "klova/click.wav",
  clickVolume: 0.7,
  captions: [],
  captionStyle: {
    placement: "onBackground",
    yRatio: 0.62,
    enterFrames: 3,
    showDuringEchoScene: false,
  },
};

/* -------------------------------------------------------------------------- */
/*  حساب الميتاداتا — طول الفيديو يتبع المحتوى                                 */
/* -------------------------------------------------------------------------- */

/**
 * ترتيب الأولوية في تحديد طول الفيديو — كما وثّقه القالب الأصلي:
 *   1. طول التعليق الصوتي، لأنه هو من يقود الإيقاع، وكرت الصدى يقع في آخره.
 *   2. آخر كابشن (أو طول المقطع المرفق) + طول مشهد كرت الصدى بعده.
 *   3. أقل طول لمشهد الوسائط + طول كرت الصدى.
 *   4. كرت الصدى وحده.
 *
 * الفرق الوحيد عن الأصل أن طول المقطع المرفق صار يدخل الحساب أيضاً: قاعدة
 * المشروع أن ما يرفعه المستخدم لا يُقتطع بصمت.
 */
export const calculateMetadata = async ({ props }) => {
  const fps = 30;
  const echoFrames = props.echoScene.durationInFrames;
  const hasVoiceover = Boolean(props.voiceover);
  const hasContent =
    hasVoiceover || props.captions.length > 0 || props.media !== null;

  const attached = await contentDurationInFrames({
    fps,
    voiceover: props.voiceover,
    media: props.media ? props.media.src : null,
    captions: props.captions,
    fallbackInFrames: props.media ? props.mediaScene.minDurationInFrames : 1,
  });

  // مع تعليق صوتي يغطي الفيديو كله فكرت الصدى داخله لا بعده
  const total = !hasContent
    ? echoFrames
    : hasVoiceover
      ? attached
      : attached + echoFrames;

  return { durationInFrames: Math.max(total, echoFrames), fps };
};
