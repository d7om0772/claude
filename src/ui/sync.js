/**
 * القوالب التي تعرض كلمة بكلمة تحتاج SRT على مستوى الكلمة، وغيرها على مستوى
 * الجملة. الوسم word-by-word في template.json هو مصدر هذا التمييز.
 */
export const wantsWordLevel = (meta) => meta.tags.includes("word-by-word");
const averageWords = (captions) =>
  captions.length === 0
    ? 0
    : captions.reduce(
        (sum, c) => sum + c.text.split(/\s+/u).filter(Boolean).length,
        0,
      ) / captions.length;
export const runChecks = (
  meta,
  captions,
  audioSeconds,
  srtKind = null,
  wordTimed = false,
) => {
  const checks = [];
  if (captions.length === 0) {
    return checks;
  }
  const lastMs = captions.reduce((m, c) => Math.max(m, c.endMs), 0);
  if (audioSeconds !== null) {
    const audioMs = audioSeconds * 1000;
    const driftMs = Math.round(lastMs - audioMs);
    const absSec = Math.abs(driftMs) / 1000;
    if (absSec <= 0.35) {
      checks.push({
        severity: "good",
        text: `الكابشن ينتهي مع الصوت (فرق ${absSec.toFixed(2)} ثانية).`,
      });
    } else if (driftMs > 0) {
      checks.push({
        severity: "bad",
        text: `آخر كابشن يتجاوز نهاية الصوت بـ ${absSec.toFixed(2)} ثانية — سيُقتطع عند الرندر لأن المدة تُشتقّ من الصوت.`,
      });
    } else {
      checks.push({
        severity: "warn",
        text: `الصوت أطول من آخر كابشن بـ ${absSec.toFixed(2)} ثانية — ستبقى نهاية المقطع بلا نص.`,
      });
    }
  }
  /*
   * التقطيع: القديم كان يقيس متوسط الكلمات في المقطع ويحذّر إن تجاوز كلمة —
   * وكان صحيحاً يوم كان كل مقطع يظهر دفعة واحدة. الآن يحمل المقطع توقيتاً لكل
   * كلمة وتظهر كلمةً كلمة، فمتوسط ٣ كلمات هو الناتج المقصود لا خلل.
   * السؤال الباقي: هل توقيتات الكلمات مقيسة من الملف أم موزّعة بالتساوي؟
   */
  if (srtKind === "word") {
    checks.push({
      severity: "good",
      text: "الملف يحمل توقيتاً لكل كلمة — التزامن مأخوذ منه كما هو.",
    });
  } else if (srtKind === "sentence" && wordTimed) {
    checks.push({
      severity: "warn",
      text:
        "الملف على مستوى الجملة: وُزّعت كلمات كل مقطع على مدّته بالتساوي، " +
        "فالتزامن تقريبي وقد تسبق الكلمة الصوت أو تتأخر عنه. للتزامن الدقيق " +
        "صدّر التفريغ بتوقيت الكلمة (Whisper بخيار word_timestamps).",
    });
  } else if (
    srtKind === null &&
    wantsWordLevel(meta) &&
    averageWords(captions) > 1.6
  ) {
    checks.push({
      severity: "warn",
      text: "هذا القالب يكشف الكلمات واحدةً واحدة، والمقاطع الحالية بلا توقيت لكل كلمة — ستُوزَّع بالتساوي.",
    });
  }

  const overlapping = captions.some((c, i) => {
    const next = captions[i + 1];
    return next !== undefined && c.endMs > next.startMs;
  });
  if (overlapping) {
    checks.push({
      severity: "warn",
      text: "توجد مقاطع متداخلة زمنياً — قُصّت تلقائياً عند التحويل حتى لا يختفي مقطع بلا سبب.",
    });
  }
  return checks;
};
/** يقرأ طول ملف صوتي من blob URL دون تشغيله. */
export const readAudioDuration = (url) =>
  new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => reject(new Error("تعذّر قراءة ملف الصوت"));
    audio.src = url;
  });

/**
 * يقرأ نسبة العرض إلى الارتفاع لملف مرفوع.
 *
 * القياس هنا لا داخل القالب: القالب دالةٌ نقية من props إلى صورة، وأي قراءة
 * غير متزامنة داخله تعني delayRender في كل فريم وسلوكاً مختلفاً بين المعاينة
 * والرندر. الواجهة تقيسها مرة وتمرّرها قيمةً في props.
 *
 * الجزء بعد # يُلحق برابط blob لتعريف الامتداد، وعنصر <video> لا يجد الـ blob
 * إن بقي — فيُنزع قبل القياس.
 */
export const readMediaAspect = (raw) =>
  new Promise((resolve, reject) => {
    const url = String(raw).split("#")[0];
    const isVideo = /\.(mp4|mov|webm|mkv|m4v)(\?[^#]*)?$/iu.test(
      String(raw).split("#")[1] ?? String(raw),
    );
    if (isVideo) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.onloadedmetadata = () =>
        resolve(video.videoWidth / Math.max(1, video.videoHeight));
      video.onerror = () => reject(new Error("تعذّر قراءة أبعاد المقطع"));
      video.src = url;
      return;
    }
    const image = new Image();
    image.onload = () =>
      resolve(image.naturalWidth / Math.max(1, image.naturalHeight));
    image.onerror = () => reject(new Error("تعذّر قراءة أبعاد الصورة"));
    image.src = url;
  });
