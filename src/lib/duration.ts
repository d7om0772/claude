import { getAudioDurationInSeconds, getVideoMetadata } from "@remotion/media-utils";

/**
 * حساب مدة اللقطة من محتواها — منطق مشترك بين كل القوالب.
 *
 * القاعدة: **أطول ما أُرفق**. كل أصل يرفعه المستخدم محتوىً أراد رؤيته أو
 * سماعه كاملاً، فاقتطاع أيٍّ منه بصمت خللٌ لا ميزة. حين يُرفق أصل واحد فقط
 * تساوي المدة مدّته بالضبط.
 *
 * كان كل قالب يكرّر هذا المنطق بترتيب أولويات مختلف قليلاً، وكان الفيديو
 * المرفق غائباً عن الحساب في الخمسة جميعاً.
 */

/** الامتدادات التي تُعدّ فيديو. اللاحقة #.mp4 على blob URL تمرّ أيضاً. */
const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|mkv|m4v)(\?[^#]*)?(#.*)?$/iu;

export const isVideoSource = (src: string): boolean =>
  VIDEO_EXTENSIONS.test(src);

const seconds = (ms: number): number => ms / 1000;

export type DurationInputs = {
  readonly fps: number;
  /** ملف التعليق الصوتي إن وُجد */
  readonly voiceover?: string | null;
  /** الوسائط المرفقة — تُحتسب فقط إن كانت فيديو */
  readonly media?: string | null;
  /** الفريم الذي يبدأ عنده عرض الوسائط داخل اللقطة */
  readonly mediaStartFrame?: number;
  readonly captions?: readonly { readonly endMs: number }[];
  /**
   * سكون بعد آخر كابشن. يُقاس بالملي ثانية حين يكون جزءاً من زمن المحتوى
   * (مثل مدة تثبيت آخر مقطع) فيُدوَّر مع نهاية الكابشن مرة واحدة، وبالفريمات
   * حين يكون ذيلاً على مستوى اللقطة. التدوير على مرحلتين يزيد فريماً.
   */
  readonly captionTailMs?: number;
  readonly captionTailFrames?: number;
  /** المدة حين لا يُرفق شيء */
  readonly fallbackInFrames: number;
};

/**
 * لا نترك خطأ قراءة أصل يُسقط الرندر كله: أصل تالف أو غير مقروء يعني
 * أن مساهمته في المدة صفر، ويظهر ذلك في المعاينة بدل رسالة غامضة.
 */
const safely = async (read: () => Promise<number>): Promise<number> => {
  try {
    return await read();
  } catch {
    return 0;
  }
};

export const contentDurationInFrames = async ({
  fps,
  voiceover,
  media,
  mediaStartFrame = 0,
  captions,
  captionTailMs = 0,
  captionTailFrames = 0,
  fallbackInFrames,
}: DurationInputs): Promise<number> => {
  const candidates: number[] = [];

  if (voiceover) {
    const s = await safely(() => getAudioDurationInSeconds(voiceover));
    if (s > 0) candidates.push(Math.ceil(s * fps));
  }

  if (media && isVideoSource(media)) {
    const s = await safely(async () => {
      const meta = await getVideoMetadata(media);
      return meta.durationInSeconds;
    });
    // المدة تُقاس من لحظة بدء عرض المقطع، لا من بداية اللقطة: في القوالب
    // التي يظهر فيها المقطع بعد قطع، الفريمات السابقة لا تعرض منه شيئاً.
    if (s > 0) candidates.push(mediaStartFrame + Math.ceil(s * fps));
  }

  if (captions && captions.length > 0) {
    const lastMs = captions.reduce((max, c) => Math.max(max, c.endMs), 0);
    candidates.push(
      Math.ceil(seconds(lastMs + captionTailMs) * fps) + captionTailFrames,
    );
  }

  const longest = candidates.reduce((max, n) => Math.max(max, n), 0);
  return Math.max(1, longest > 0 ? longest : fallbackInFrames);
};
