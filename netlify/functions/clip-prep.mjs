/**
 * وسيط بين الصفحة وخدمة FFmpeg Micro لتجهيز المقاطع.
 *
 * لماذا وسيط ولا نناديها من الصفحة مباشرة: المفتاح. الصفحة المنشورة ملفٌ
 * ثابت يقرأه كل زائر، فأي مفتاح فيها مفتاحٌ مكشوف يستنزفه من شاء. المفتاح
 * هنا متغيّر بيئة على نتليفاي لا يغادر الخادم، والصفحة تنادي هذه الدالة
 * فتنادي هي الخدمة.
 *
 * ولماذا الرفع والتنزيل خارج الوسيط: دوال نتليفاي محدودة الجسم (٦ ميغابايت
 * تقريباً)، ومقطع واحد يتجاوزها. فالملف يصعد من المتصفح إلى التخزين مباشرة
 * برابط موقّع، وينزل منه مباشرة كذلك؛ ولا يمرّ بالوسيط إلا الأمر والخبر.
 *
 * والمسارات المسموحة معدودة هنا صراحةً: الوسيط ليس نفقاً مفتوحاً إلى الخدمة.
 */

const API_BASE = "https://api.ffmpeg-micro.com";

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

/**
 * اسم الحاوية من الرابط الموقّع.
 *
 * الخدمة تطلب مدخلاً بصيغة gs://<bucket>/<file> ولا تعيد اسم الحاوية، لكنه
 * ظاهر في الرابط الموقّع الذي أعادته للتوّ — فنقرأه منه بدل أن نطلب من
 * المستخدم ضبط متغيّر آخر يخطئ فيه.
 */
const bucketFromUploadUrl = (uploadUrl) => {
  try {
    const url = new URL(uploadUrl);
    if (url.hostname === "storage.googleapis.com") {
      const first = url.pathname.split("/").filter(Boolean)[0];
      return first ?? null;
    }
    // نمط النطاق الفرعي: <bucket>.storage.googleapis.com
    const dot = url.hostname.indexOf(".storage.googleapis.com");
    return dot > 0 ? url.hostname.slice(0, dot) : null;
  } catch {
    return null;
  }
};

const callApi = async (key, path, init = {}) => {
  const response = await fetch(API_BASE + path, {
    ...init,
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return { ok: response.ok, status: response.status, body: parsed, text };
};

/** رسالة الخطأ من الخدمة بلا تسريب شيء من الطلب الذي حملناه إليها */
const upstreamError = (result) =>
  json(502, {
    error: "upstream",
    status: result.status,
    message:
      result.body?.message ??
      result.body?.error ??
      result.text.slice(0, 300) ??
      "",
  });

export default async (req) => {
  const key = process.env.FFMPEG_MICRO_API_KEY;
  /* بلا مفتاح لا خدمة — والصفحة تفهم هذا الردّ فترجع إلى التجهيز المحلي بدل
     أن تعطب */
  if (!key) return json(503, { error: "not-configured" });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    if (action === "presign") {
      if (req.method !== "POST") return json(405, { error: "method" });
      const { filename, contentType, fileSize } = await req.json();
      if (typeof filename !== "string" || typeof fileSize !== "number") {
        return json(400, { error: "bad-request" });
      }
      const result = await callApi(key, "/v1/upload/presigned-url", {
        method: "POST",
        body: JSON.stringify({ filename, contentType, fileSize }),
      });
      if (!result.ok) return upstreamError(result);
      const payload = result.body?.result ?? result.body ?? {};
      const bucket = bucketFromUploadUrl(payload.uploadUrl ?? "");
      return json(200, {
        uploadUrl: payload.uploadUrl,
        filename: payload.filename,
        input: bucket ? `gs://${bucket}/${payload.filename}` : null,
      });
    }

    if (action === "confirm") {
      if (req.method !== "POST") return json(405, { error: "method" });
      const { filename, fileSize } = await req.json();
      const result = await callApi(key, "/v1/upload/confirm", {
        method: "POST",
        body: JSON.stringify({ filename, fileSize }),
      });
      if (!result.ok) return upstreamError(result);
      return json(200, { ok: true });
    }

    if (action === "transcode") {
      if (req.method !== "POST") return json(405, { error: "method" });
      const { input, outputFormat, preset } = await req.json();
      if (typeof input !== "string") return json(400, { error: "bad-request" });
      const result = await callApi(key, "/v1/transcodes", {
        method: "POST",
        body: JSON.stringify({
          inputs: [{ url: input }],
          outputFormat: outputFormat ?? "webm",
          preset: preset ?? { quality: "medium", resolution: "1080p" },
        }),
      });
      if (!result.ok) return upstreamError(result);
      return json(200, { id: result.body?.id ?? result.body?.jobId ?? null });
    }

    if (action === "status") {
      const id = url.searchParams.get("id");
      if (!id) return json(400, { error: "bad-request" });
      const result = await callApi(key, `/v1/transcodes/${encodeURIComponent(id)}`);
      if (!result.ok) return upstreamError(result);
      return json(200, {
        status: result.body?.status ?? null,
        queuePosition: result.body?.queue_position ?? null,
        error: result.body?.error ?? null,
      });
    }

    if (action === "download") {
      const id = url.searchParams.get("id");
      if (!id) return json(400, { error: "bad-request" });
      const result = await callApi(
        key,
        `/v1/transcodes/${encodeURIComponent(id)}/download`,
      );
      if (!result.ok) return upstreamError(result);
      return json(200, { url: result.body?.url ?? null });
    }

    return json(404, { error: "unknown-action" });
  } catch (err) {
    return json(500, { error: "proxy", message: String(err).slice(0, 300) });
  }
};

export const config = { path: "/api/clip-prep" };
