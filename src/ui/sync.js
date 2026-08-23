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
export const runChecks = (meta, captions, audioSeconds) => {
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
  const avg = averageWords(captions);
  if (wantsWordLevel(meta) && avg > 1.6) {
    checks.push({
      severity: "bad",
      text: `هذا القالب يعرض كلمة بكلمة، لكن مقاطع الـ SRT فيها ${avg.toFixed(1)} كلمة وسطياً. استخرج التوقيتات على مستوى الكلمة (Whisper بخيار word_timestamps) وإلا ظهرت الجملة دفعة واحدة.`,
    });
  } else if (!wantsWordLevel(meta) && avg < 1.4 && captions.length > 3) {
    checks.push({
      severity: "warn",
      text: "الـ SRT مقطّع على مستوى الكلمة، وهذا القالب يتوقع جملاً — قد يظهر النص متقطّعاً.",
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
