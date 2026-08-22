import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

/**
 * ============================================================================
 * قالب: كابشن كاريوكي كلمة-بكلمة على خلفية ورقية
 * ============================================================================
 * كل قيمة في التصميم الأصلي مُشتقّة بالقياس من اللقطة المرجعية (1080×1920).
 * النِسب أدناه محفوظة كنِسب مئوية من عرض/ارتفاع الإطار، فالقالب يشتغل على أي
 * مقاس (9:16، 1:1، 16:9) بدون ما تنكسر العلاقات بين العناصر.
 */

/** كابشن واحد = كلمة واحدة. يجي من تحويل ملف SRT خارج القالب. */
export const captionSchema = z.object({
  text: z.string().describe('نص الكلمة كما تُعرض على الشاشة'),
  startMs: z
    .number()
    .min(0)
    .describe('وقت ظهور الكلمة بالملي ثانية من بداية المقطع'),
  endMs: z
    .number()
    .min(0)
    .describe('وقت انتهاء نطق الكلمة بالملي ثانية (تصير بعده كلمة سابقة)'),
});

export type Caption = z.infer<typeof captionSchema>;

/** طريقة دخول الكلمة على الشاشة. */
export const enterStyleSchema = z
  .enum(['cut', 'fade', 'rise'])
  .describe(
    'أسلوب ظهور الكلمة: cut = قطع فوري بلا انتقال (هوية القالب الأصلية)، ' +
      'fade = تلاشٍ للداخل، rise = صعود من تحت مع تلاشٍ',
  );

/** طريقة احتواء الوسائط داخل الإطار. */
export const mediaFitSchema = z
  .enum(['cover', 'contain'])
  .describe(
    'طريقة ملء الوسائط للإطار: cover = تغطية كاملة مع قص، contain = احتواء كامل بلا قص',
  );

export const templateSchema = z.object({
  /* ---------------------------------------------------------------- الألوان */
  backgroundColor: zColor().describe(
    'لون الخلفية. الافتراضي كريمي ورقي — هذا اللون جزء من هوية القالب',
  ),
  fontColor: zColor().describe(
    'لون الكلمة المنطوقة حالياً (الكلمة النشطة، بوزن Black)',
  ),
  pastWordColor: zColor().describe(
    'لون الكلمات اللي انقالت خلاص (بوزن Medium وأفتح من النشطة)',
  ),

  /* ----------------------------------------------------------------- الشعار */
  logo: z
    .string()
    .nullable()
    .describe(
      'مسار صورة الشعار داخل مجلد public (مثال: logo.png). اتركه فارغاً لإخفاء الشعار',
    ),
  logoWidthRatio: z
    .number()
    .min(0.05)
    .max(0.8)
    .describe('عرض الشعار كنسبة من عرض الإطار (0.337 = 364 بكسل في إطار 1080)'),
  logoCenterYRatio: z
    .number()
    .min(0)
    .max(1)
    .describe('ارتفاع مركز الشعار كنسبة من ارتفاع الإطار'),

  /* ------------------------------------------------------------------ النص */
  headline: z
    .string()
    .max(80)
    .describe(
      'النص الرئيسي. يُستخدم فقط لو مصفوفة captions فاضية — ينقسم كلمات وتظهر بإيقاع ثابت. الحد 80 حرف (≈8 كلمات)',
    ),
  subheadline: z
    .string()
    .max(60)
    .nullable()
    .describe('سطر ثانوي صغير تحت الكابشن، يظهر طول المقطع. اتركه فارغاً لإخفائه'),

  /* --------------------------------------------------------------- الكابشن */
  captions: z
    .array(captionSchema)
    .describe(
      'مصفوفة الكلمات مع توقيتاتها، مصدرها ملف SRT. لو فاضية يرجع القالب لـ headline',
    ),
  fallbackWordIntervalMs: z
    .number()
    .min(50)
    .max(5000)
    .describe('المدة بين كلمة وكلمة بالملي ثانية لما نستخدم headline بدل captions'),
  saltWordIndices: z
    .array(z.number().int().min(0))
    .describe(
      'أرقام الكلمات (تبدأ من 0) اللي تتفعّل عليها «الأحرف المرسلة» salt. ' +
        'دليل ثمانية: لا تُستخدم بكثرة في الجملة الواحدة ولا في كلمتين متجاورتين',
    ),

  /* ------------------------------------------------------- تنضيد وتموضع النص */
  fontSizeRatio: z
    .number()
    .min(0.01)
    .max(0.2)
    .describe('حجم الخط كنسبة من ارتفاع الإطار (0.0474 = 91 بكسل في إطار 1920)'),
  lineHeightRatio: z
    .number()
    .min(1)
    .max(3)
    .describe('المسافة بين السطور كمضاعف لحجم الخط (1.9011 = 173 بكسل)'),
  captionTopRatio: z
    .number()
    .min(0)
    .max(1)
    .describe('أعلى كتلة النص كنسبة من ارتفاع الإطار'),
  maxTextWidthRatio: z
    .number()
    .min(0.2)
    .max(1)
    .describe(
      'أقصى عرض لكتلة النص كنسبة من عرض الإطار — هو اللي يقرّر مكان كسر السطر',
    ),
  wordGapEm: z
    .number()
    .min(0)
    .max(1)
    .describe('المسافة بين الكلمات بوحدة em (0.25 = عرض المسافة الأصلي في الخط)'),

  /* ---------------------------------------------------------------- الحركة */
  enterStyle: enterStyleSchema,
  enterDurationInFrames: z
    .number()
    .int()
    .min(0)
    .max(60)
    .describe('عدد فريمات حركة دخول الكلمة (يُتجاهل مع cut)'),
  riseDistanceRatio: z
    .number()
    .min(0)
    .max(0.2)
    .describe('مسافة صعود الكلمة كنسبة من ارتفاع الإطار (مع rise فقط)'),
  glowStrength: z
    .number()
    .min(0)
    .max(1)
    .describe('شدة توهّج الكلمة النشطة. 0 = بلا توهّج (الافتراضي الأصلي)'),

  /* --------------------------------------------------------------- الوسائط */
  media: z
    .string()
    .nullable()
    .describe(
      'مسار صورة أو فيديو داخل public يظهر كطبقة خلف النص. اتركه فارغاً للخلفية اللونية الصافية',
    ),
  mediaFit: mediaFitSchema,
  mediaOpacity: z
    .number()
    .min(0)
    .max(1)
    .describe('شفافية طبقة الوسائط. الأقل يخلي النص أوضح'),

  /* ----------------------------------------------------------------- الصوت */
  voiceover: z
    .string()
    .nullable()
    .describe(
      'مسار ملف التعليق الصوتي داخل public. لو موجود تُحسب مدة المقطع من طوله',
    ),
  voiceoverVolume: z
    .number()
    .min(0)
    .max(1)
    .describe('مستوى صوت التعليق الصوتي'),

  /* ------------------------------------------------------------------ المدة */
  tailDurationInFrames: z
    .number()
    .int()
    .min(0)
    .max(300)
    .describe('عدد الفريمات اللي تبقى بعد آخر كلمة قبل نهاية المقطع'),
});

export type TemplateProps = z.infer<typeof templateSchema>;

/** إعدادات المقطع الأساسية — مشتركة بين template.json و calculateMetadata. */
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/**
 * القيم الافتراضية = اللقطة المرجعية بالضبط.
 * التوقيتات مقاسة كادراً بكادر من الفيديو الأصلي (قطع فوري، بلا تلاشٍ).
 */
export const defaultProps: TemplateProps = {
  backgroundColor: '#EEE9DD',
  fontColor: '#2E2110',
  pastWordColor: '#6C6354',

  logo: null,
  logoWidthRatio: 0.337,
  logoCenterYRatio: 0.112,

  headline: 'ارحب البقى انت من اي منطقة',
  subheadline: null,

  captions: [
    { text: 'ارحب', startMs: 0, endMs: 450 },
    { text: 'البقى', startMs: 450, endMs: 900 },
    { text: 'انت', startMs: 900, endMs: 1200 },
    { text: 'من', startMs: 1200, endMs: 1450 },
    { text: 'اي', startMs: 1450, endMs: 1750 },
    { text: 'منطقة', startMs: 1750, endMs: 2400 },
  ],
  fallbackWordIntervalMs: 380,
  saltWordIndices: [2],

  fontSizeRatio: 0.0474,
  lineHeightRatio: 1.9011,
  captionTopRatio: 0.41689,
  maxTextWidthRatio: 0.62,
  wordGapEm: 0.25,

  enterStyle: 'cut',
  enterDurationInFrames: 0,
  riseDistanceRatio: 0.02,
  glowStrength: 0,

  media: null,
  mediaFit: 'cover',
  mediaOpacity: 1,

  voiceover: null,
  voiceoverVolume: 1,

  tailDurationInFrames: 9,
};
