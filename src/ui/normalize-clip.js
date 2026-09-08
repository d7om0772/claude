/**
 * تجهيز المقطع المرفق قبل أن يصل إلى الرندر.
 *
 * العطل الذي يعالجه: الرندر داخل المتصفح يقف عند فريم بعينه من مقطع مرفق ولا
 * يعود منه — لا خطأ ولا نهاية، فتنقضي المهلة ويسقط الرندر. والوقوف في مفكّك
 * المتصفح نفسه: يبتلع العيّنات ولا يخرج فريماً. وقياساً على الحالات المبلّغة،
 * يقع هذا مع ملفات h264 نازلة من تطبيقات الجوال على أجهزة بعينها، بينما
 * تشتغل المعاينة — لأن المعاينة تفكّ أول الملف فقط.
 *
 * ولا حيلة لنا في المفكّك ذاته: ليس في يدنا اختيار مساره ولا مقاطعته. لكن في
 * يدنا ألّا نسلّمه ذلك الملف: نعيد كتابته هنا مرة واحدة عند إرفاقه إلى webm/vp9
 * — ترميز آخر، ومسار فكّ آخر في المتصفح، وحاوية كتبها المتصفح نفسه للتوّ.
 *
 * والفكّ أثناء التجهيز تسلسلي من أول الملف إلى آخره، لا قفزٌ متكرّر. فإن وقف
 * المفكّك وقف هنا — عند الإرفاق، حيث نمهله ثم نخبر المستخدم بالسبب — لا بعد
 * دقيقتين من رندر يسقط بلا تفسير.
 *
 * وإن تعذّر التجهيز رجعنا إلى الملف الأصلي: التجهيز تحسينٌ لا شرط، ولا يصح أن
 * يمنع المستخدم من إرفاق مقطعه.
 */

import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Output,
  QUALITY_MEDIUM,
  WebMOutputFormat,
  canEncodeVideo,
} from "mediabunny";

/**
 * إطار مفتاحي كل ثانيتين.
 *
 * قِسنا أثر التباعد: مقطع إطاره المفتاحي كل عشر ثوانٍ رُندر في ٤٨ ثانية،
 * ونسخته المجهّزة في ٥٢ — فالتباعد لا يكلّف شيئاً هنا، لأن الرندر يمشي على
 * الفريمات إلى الأمام فيفكّ كل إطار مرة واحدة. فلا داعي لإغراق الملف
 * بالإطارات المفتاحية وتضخيم حجمه؛ ثانيتان تكفيان لأي قفزة عارضة.
 */
const KEYFRAME_INTERVAL_SECONDS = 2;

/**
 * سقف المقاس.
 *
 * البطاقة في القالب أضيق من الإطار، فمقطع 4K يُفكّ بأربعة أضعاف ما يُعرض منه
 * فعلاً. نحدّه بمقاس الإطار: لا تكبير لمقطع أصغر، وتصغير لما زاد.
 */
const MAX_WIDTH = 1080;
const MAX_HEIGHT = 1920;

/**
 * حدّ التوقّف: هذه المدّة بلا أي تقدّم تعني أن المفكّك وقف ولن يعود.
 *
 * القياس لا الساعة هو الحكم: التجهيز يبلّغ تقدّمه باستمرار، فبطء الجهاز يظهر
 * تقدّماً بطيئاً لا انقطاعاً. أما الانقطاع التام فهو العطل نفسه الذي نطارده،
 * ووقوعه هنا مكسب: يظهر عند الإرفاق بسبب معلوم بدل أن يظهر بعد دقيقتين من
 * رندر ساقط.
 */
const STALL_MS = 45000;

/** ترميز الفيديو: الأول الذي يرمّزه هذا المتصفح، وvp9 أعلاهما جودةً لحجمه. */
const VIDEO_CODECS = ["vp9", "vp8"];

const pickCodec = async () => {
  for (const codec of VIDEO_CODECS) {
    if (await canEncodeVideo(codec)) return codec;
  }
  return null;
};

/** المقاس بعد الاحتواء داخل السقف، أو null إن كان المقطع أصغر منه أصلاً. */
const containedSize = (width, height) => {
  if (!width || !height) return null;
  const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height, 1);
  if (scale === 1) return null;
  // أبعاد زوجية: المرمّزات تشترطها
  const even = (value) => Math.max(2, Math.round((value * scale) / 2) * 2);
  return { width: even(width), height: even(height) };
};

/** يميّز التوقّف عن سائر أسباب الفشل، فرسالته للمستخدم مختلفة */
export const isStalledClipError = (err) => err?.clipStalled === true;

/**
 * يعيد نسخة مجهّزة من المقطع، أو null إن تعذّر التجهيز.
 *
 * @param {File|Blob} file الملف كما اختاره المستخدم
 * @param {(progress: number) => void} [onProgress] تقدّم من ٠ إلى ١
 * @param {AbortSignal} [signal] لإلغاء التجهيز إن استبدل المستخدم الملف
 */
export const normalizeClip = async (file, { onProgress, signal } = {}) => {
  const codec = await pickCodec();
  if (!codec) return null;

  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });

  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) return null;

    const size = containedSize(
      videoTrack.displayWidth,
      videoTrack.displayHeight,
    );

    const conversion = await Conversion.init({
      input,
      output: new Output({
        format: new WebMOutputFormat(),
        target: new BufferTarget(),
      }),
      video: {
        codec,
        keyFrameInterval: KEYFRAME_INTERVAL_SECONDS,
        // جودة متوسطة: الناتج وسيطٌ داخل بطاقة أصغر من الإطار، لا ملفاً نهائياً
        quality: QUALITY_MEDIUM,
        ...(size ?? {}),
        /* التجهيز بلا فائدة إن نُسخت العيّنات كما هي: الإطارات المفتاحية
           تبقى على تباعدها الأصلي، والحاوية تبقى حاوية الملف الأصلي */
        forceTranscode: true,
      },
      /* الصوت يمرّ كما هو إن وُجد: القالب قد يكتمه وقد لا يكتمه، وإسقاطه هنا
         يسلب المستخدم خياراً لا علاقة له بالعطل */
    });

    if (!conversion.isValid) return null;

    let lastProgressAt = Date.now();
    conversion.onProgress = (progress) => {
      lastProgressAt = Date.now();
      onProgress?.(progress);
    };

    const onAbort = () => void conversion.cancel();
    signal?.addEventListener("abort", onAbort, { once: true });
    /**
     * الحارس يسابق التجهيز ولا يكتفي بإلغائه: المفكّك الواقف قد لا يستجيب
     * للإلغاء أصلاً، فلو انتظرنا `execute` وحده لعلّقنا معه بلا نهاية.
     */
    let watchdog = null;
    const stalled = new Promise((_, reject) => {
      watchdog = setInterval(() => {
        if (Date.now() - lastProgressAt < STALL_MS) return;
        const error = new Error("توقّف فكّ ترميز المقطع");
        error.clipStalled = true;
        reject(error);
        void conversion.cancel();
      }, 2000);
    });
    try {
      await Promise.race([conversion.execute(), stalled]);
    } finally {
      if (watchdog !== null) clearInterval(watchdog);
      signal?.removeEventListener("abort", onAbort);
    }

    const buffer = conversion.output.target.buffer;
    if (!buffer) return null;

    return {
      blob: new Blob([buffer], { type: "video/webm" }),
      codec,
      width: size?.width ?? videoTrack.displayWidth,
      height: size?.height ?? videoTrack.displayHeight,
    };
  } finally {
    await input.dispose();
  }
};
