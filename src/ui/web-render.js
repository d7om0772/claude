import { canRenderMediaOnWeb, renderMediaOnWeb } from "@remotion/web-renderer";

/**
 * الرندر داخل المتصفح عبر WebCodecs.
 *
 * لا خادم ولا شبكة: الفريمات تُرسم في الصفحة نفسها وتُرمَّز محلياً. أبطأ من
 * الرندر الخادمي ويشغل تبويب المستخدم، لكنه الطريق الوحيد حين لا يكون خلف
 * الصفحة خادم — كالنسخة المنشورة.
 */

/**
 * mp4/h264 هو الأوسع قبولاً، لكن ترميزه احتكاري وتفتقده بعض بُنى المتصفحات.
 * نجرّب الأفضل أولاً وننزل، فيحصل المستخدم على أفضل ما يدعمه متصفحه بدل
 * رسالة فشل.
 */
const PREFERENCES = [
  { container: "mp4", videoCodec: "h264" },
  { container: "webm", videoCodec: "vp9" },
  { container: "webm", videoCodec: "vp8" },
];

/** أول تركيبة يدعمها هذا المتصفح لهذا المقاس، أو null إن تعذّر الرندر. */
export const pickOutputFormat = async ({ width, height, muted }) => {
  for (const choice of PREFERENCES) {
    const result = await canRenderMediaOnWeb({
      ...choice,
      width,
      height,
      muted: Boolean(muted),
    });
    if (result.canRender) {
      return { ...choice, issues: result.issues };
    }
  }
  return null;
};

/**
 * مهلة الفريم الواحد أثناء الرندر.
 *
 * ‏renderMediaOnWeb ينتظر عند كل فريم أن تُحلّ كل نداءات delayRender، ومهلته
 * الافتراضية ٣٠ ثانية. هذه المهلة مستقلة تماماً عن
 * delayRenderTimeoutInMilliseconds الموضوعة على <Video>: تلك تحكم متى يستسلم
 * المكوّن نفسه، وهذه تحكم متى يستسلم الرندر — فرفع الأولى وحدها لا يغيّر شيئاً،
 * والرندر يسقط عند ٣٠ ثانية برسالة «Extracting frame at time … from blob:…».
 *
 * استخراج أول فريم من مقطع طويل أو عالي الدقة (تحميل الرأس، ثم الفكّ من أقرب
 * إطار مفتاحي) يتجاوز ٣٠ ثانية على أجهزة كثيرة، فنمنحه دقيقتين.
 */
const FRAME_TIMEOUT_MS = 120000;

/**
 * سقف ذاكرة الفريمات المفكوكة.
 *
 * محرّك الوسائط يحتفظ بالفريمات المفكوكة في الذاكرة ليتجنّب إعادة الفكّ،
 * وسقفه الافتراضي هنا **غيغابايت كامل** — لأنه يقيسه من ذاكرة النظام حين
 * تكون معلومة، ولا يمرّرها الرندر في المتصفح فيقع على قيمته القصوى.
 *
 * والفريم من مقطع عمودي 1080×1920 يشغل نحو ثلاثة ميغابايت مفكوكاً، فالسقف
 * يعني ثلاثمئة فريم محفوظة في تبويب يحمل معها طابور الترميز والناتج نفسه.
 * على جهاز يشتغل عليه المستخدم بأشياء أخرى، هذا ضغطٌ لا داعي له.
 *
 * والرندر يمشي على الفريمات إلى الأمام، فلا يحتاج إلا ما بين آخر إطار
 * مفتاحي والفريم الحالي. والتضييق آمن: تجاوز السقف يُسقط أقدم المخزون فقط،
 * ولا يمنع إنشاء مخزون جديد ولا يُخرج فريماً فارغاً.
 */
const MEDIA_CACHE_BYTES = 400 * 1024 * 1024;

export const renderInBrowser = async ({
  template,
  props,
  format,
  onProgress,
  signal,
}) => {
  const { meta, component, schema, defaultProps, calculateMetadata } = template;

  const result = await renderMediaOnWeb({
    composition: {
      id: meta.id,
      component,
      width: meta.width,
      height: meta.height,
      fps: meta.fps,
      durationInFrames: meta.defaultDurationInFrames,
      calculateMetadata,
      defaultProps,
    },
    schema,
    inputProps: props,
    container: format.container,
    videoCodec: format.videoCodec,
    onProgress: onProgress ?? null,
    signal: signal ?? null,
    delayRenderTimeoutInMilliseconds: FRAME_TIMEOUT_MS,
    mediaCacheSizeInBytes: MEDIA_CACHE_BYTES,
  });

  return {
    blob: await result.getBlob(),
    extension: format.container === "mp4" ? "mp4" : "webm",
  };
};
