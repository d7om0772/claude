/**
 * تقديم ملفات المستخدم للمرمّز دون أي طلب شبكة.
 *
 * سياسة الأمان في الصفحة المنشورة تمنع fetch على blob: وdata: (connect-src
 * لا يشمل هذين المخططين، و'self' لا يطابقهما). ومحرّك الوسائط في Remotion
 * يقرأ الفيديو والصوت عبر fetch مع ترويسة Range، فكان أي ملف يرفعه المستخدم
 * يفشل بـ «Network error … possibly CORS» مهما كان المكوّن المستعمل.
 *
 * الحل: الملف أصلاً في الذاكرة (كائن File جاء من <input type="file">)، فلا
 * حاجة لأي شبكة. نسجّله هنا، ونلتقط طلبات fetch الموجّهة إلى رابطه فنردّ
 * من الذاكرة مباشرة. لا يمرّ شيء على الشبكة، فلا تُستشار السياسة أصلاً.
 *
 * النطاق مقصور على الروابط المسجَّلة في هذه الصفحة: أي رابط آخر يُمرَّر إلى
 * fetch الأصلي بلا تغيير.
 */

/** الجزء بعد # ليس من هوية الـ blob؛ الواجهة تضيف «#.mp4» ليُعرف الامتداد. */
const keyOf = (url) => String(url).split("#")[0];

/** @type {Map<string, Blob>} */
const registry = new Map();

export const registerBlob = (url, blob) => {
  if (url) registry.set(keyOf(url), blob);
};

export const unregisterBlob = (url) => {
  if (url) registry.delete(keyOf(url));
};

/** يحوّل data: URI إلى Blob بلا fetch. */
const dataUriToBlob = (uri) => {
  const comma = uri.indexOf(",");
  const head = uri.slice(0, comma);
  const payload = uri.slice(comma + 1);
  const type = head.slice(5).split(";")[0] || "application/octet-stream";
  if (!head.includes(";base64")) {
    return new Blob([new TextEncoder().encode(decodeURIComponent(payload))], {
      type,
    });
  }
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
};

/**
 * يبني ردًّا من Blob، ويحترم Range لأن قارئ الوسائط يطلب مقاطع لا الملف كله.
 * بلا 206 يعيد القارئ قراءة الملف كاملاً في كل طلب، أو يفشل تحليله.
 */
const respondFromBlob = (blob, { method = "GET", range } = {}) => {
  const total = blob.size;
  const headers = {
    "content-type": blob.type || "application/octet-stream",
    "accept-ranges": "bytes",
  };
  const match = /^bytes=(\d*)-(\d*)$/u.exec(range ?? "");
  if (match) {
    const [, rawStart, rawEnd] = match;
    // «bytes=-500» يعني آخر ٥٠٠ بايت، لا البداية
    const start =
      rawStart === "" ? Math.max(0, total - Number(rawEnd)) : Number(rawStart);
    const end =
      rawStart === "" || rawEnd === ""
        ? total - 1
        : Math.min(Number(rawEnd), total - 1);
    if (start >= total || start > end) {
      return new Response(null, {
        status: 416,
        headers: { ...headers, "content-range": `bytes */${total}` },
      });
    }
    const slice = blob.slice(start, end + 1);
    return new Response(method === "HEAD" ? null : slice, {
      status: 206,
      headers: {
        ...headers,
        "content-range": `bytes ${start}-${end}/${total}`,
        "content-length": String(end - start + 1),
      },
    });
  }
  return new Response(method === "HEAD" ? null : blob, {
    status: 200,
    headers: { ...headers, "content-length": String(total) },
  });
};

let installed = false;

/** يُركَّب مرة واحدة عند إقلاع الواجهة، قبل أي معاينة أو رندر. */
export const installBlobFetchShim = () => {
  if (installed || typeof globalThis.fetch !== "function") return;
  installed = true;
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    const request = input instanceof Request ? input : null;
    const url = request ? request.url : String(input);
    const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
    const range =
      init?.headers instanceof Headers
        ? init.headers.get("range")
        : (init?.headers?.Range ??
          init?.headers?.range ??
          request?.headers.get("range") ??
          null);
    if (url.startsWith("blob:")) {
      const blob = registry.get(keyOf(url));
      if (blob)
        return Promise.resolve(respondFromBlob(blob, { method, range }));
    }
    if (url.startsWith("data:")) {
      try {
        return Promise.resolve(
          respondFromBlob(dataUriToBlob(url), { method, range }),
        );
      } catch {
        // مسار تالف: يكمل إلى fetch الأصلي فيعطي خطأه المعتاد
      }
    }
    return original(input, init);
  };
};
