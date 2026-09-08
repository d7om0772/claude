/**
 * تجهيز المقطع على خادم FFmpeg Micro — المخرج حين يقف تجهيز المتصفح.
 *
 * التجهيز المحلي (normalize-clip.js) يعيد ترميز المقطع داخل الصفحة، وهو
 * الأسرع والأرخص ويكفي أكثر الملفات. لكنه يفكّ الترميز بمفكّك المتصفح نفسه —
 * وهو الذي يقف على بعض الملفات. فحين يقف، لا فائدة من إعادة المحاولة بنفس
 * المفكّك: نرسل الملف إلى ffmpeg حقيقي على خادم، ويعود مقطعاً كتبه ffmpeg
 * بترميز vp9، فلا يمرّ على مفكّك h264 في المتصفح أصلاً.
 *
 * حدود ما تصلح له هذه الخدمة: هي محوّل ترميز لا مركّب مشاهد — لا تدعم
 * filter_complex، فلا يمكنها رسم كابشن القالب ولا حركته ولا بطاقته. الرندر
 * يبقى في المتصفح؛ الخدمة تُصلح المُدخل فقط.
 *
 * المسار: توقيع رابط رفع من الوسيط → رفع الملف إلى التخزين مباشرة → تأكيد →
 * إنشاء مهمة → استطلاع → تنزيل. والرفع والتنزيل من المتصفح إلى التخزين
 * مباشرة لأن الوسيط لا يحتمل حجم المقطع.
 */

/** مسار الوسيط — دالة نتليفاي تحمل المفتاح، لا الصفحة */
const ENDPOINT = "/api/clip-prep";

/** مهلة انتظار المهمة على الخادم: الطابور قد يطول، والوقوف يجب أن ينتهي */
const JOB_TIMEOUT_MS = 300000;
const POLL_INTERVAL_MS = 3000;

/** أقصى حجم نرسله: فوقه الرفع وحده يستغرق أكثر مما يحتمله المستخدم */
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

const call = async (search, init) => {
  const response = await fetch(`${ENDPOINT}?${search}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(
      body.message || `تعذّر الاتصال (${response.status})`,
    );
    // ٥٠٣ تعني «لا مفتاح مضبوط»: لا خدمة أصلاً، فلا تُعرض كعطل
    error.notConfigured = response.status === 503;
    throw error;
  }
  return response.json();
};

/** هل الخدمة مهيّأة خلف هذه الصفحة أصلاً؟ يُسأل مرة ويُحفظ الجواب. */
let availability = null;
export const remotePrepAvailable = async () => {
  if (availability !== null) return availability;
  try {
    const response = await fetch(`${ENDPOINT}?action=status&id=`, {
      method: "GET",
    });
    // ٤٠٠ يعني أن الدالة موجودة وردّت على طلب ناقص — وهذا هو المطلوب إثباته
    availability = response.status !== 404 && response.status !== 503;
  } catch {
    availability = false;
  }
  return availability;
};

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * يرفع المقطع ويعيد نسخة webm/vp9 جهّزها ffmpeg على الخادم.
 *
 * @param {File|Blob} file الملف كما أرفقه المستخدم
 * @param {object} options
 * @param {(stage: string, progress: number) => void} [options.onProgress]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{blob: Blob}>}
 */
export const prepareOnServer = async (file, { onProgress, signal } = {}) => {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("المقطع أكبر من أن يُرفع للتجهيز على الخادم");
  }
  const report = (stage, progress) => onProgress?.(stage, progress);

  report("upload", 0);
  const { uploadUrl, filename, input } = await call("action=presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: file.name || "clip.mp4",
      contentType: file.type || "video/mp4",
      fileSize: file.size,
    }),
  });
  if (!uploadUrl || !input) {
    throw new Error("لم يعد الخادم برابط رفع صالح");
  }

  /**
   * الرفع بـ XMLHttpRequest لا fetch: fetch لا يبلّغ تقدّم الرفع، ورفع عشرين
   * ميغابايت بلا مؤشّر يبدو للمستخدم توقّفاً.
   */
  await new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    if (file.type) request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) report("upload", event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`فشل رفع المقطع (${request.status})`));
    /* الفشل هنا غالباً منع CORS من التخزين، ولا يبلّغه المتصفح بتفصيل */
    request.onerror = () =>
      reject(new Error("تعذّر رفع المقطع إلى التخزين من المتصفح"));
    request.onabort = () => reject(new Error("أُلغي الرفع"));
    signal?.addEventListener("abort", () => request.abort(), { once: true });
    request.send(file);
  });

  await call("action=confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename, fileSize: file.size }),
  });

  report("queue", 0);
  const { id } = await call("action=transcode", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input,
      /* vp9 لا h264: تفادي مفكّك h264 في المتصفح هو الغرض كله */
      outputFormat: "webm",
      preset: { quality: "medium", resolution: "1080p" },
    }),
  });
  if (!id) throw new Error("لم يعد الخادم برقم مهمة");

  const startedAt = Date.now();
  for (;;) {
    if (signal?.aborted) throw new Error("أُلغي التجهيز");
    if (Date.now() - startedAt > JOB_TIMEOUT_MS) {
      throw new Error("طالت المهمة على الخادم دون أن تنتهي");
    }
    await wait(POLL_INTERVAL_MS);
    const state = await call(`action=status&id=${encodeURIComponent(id)}`);
    if (state.status === "completed") break;
    if (state.status === "failed" || state.status === "error") {
      throw new Error(state.error || "فشلت المهمة على الخادم");
    }
    report("queue", state.status === "processing" ? 0.5 : 0.1);
  }

  report("download", 0);
  const { url } = await call(`action=download&id=${encodeURIComponent(id)}`);
  if (!url) throw new Error("لم يعد الخادم برابط تنزيل");

  const output = await fetch(url, { signal });
  if (!output.ok) throw new Error(`تعذّر تنزيل الناتج (${output.status})`);
  const blob = await output.blob();
  report("download", 1);

  return { blob: new Blob([blob], { type: "video/webm" }) };
};
