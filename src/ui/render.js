/**
 * عميل خادم الرندر.
 *
 * الواجهة تعمل بلا خادم أيضاً (نسخة الملف الواحد للمعاينة فقط)، فكل ما يخصّ
 * الرندر يمرّ من هنا ويُفحص توفّره أولاً بدل افتراضه.
 */
export const API = "/api";
export const checkServer = async () => {
  try {
    const res = await fetch(`${API}/health`);
    return res.ok;
  } catch {
    return false;
  }
};
const uploadFile = async (file) => {
  const res = await fetch(`${API}/assets`, {
    method: "POST",
    headers: { "x-file-name": encodeURIComponent(file.name) },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`تعذّر رفع ${file.name}`);
  }
  const { path } = await res.json();
  return path;
};
/**
 * الملفات المرفوعة تعيش في المتصفح كـ blob URL لا يعرفه الخادم، فتُرفع أولاً
 * ويُستبدل مسارها في الـ props قبل إرسال المهمة.
 */
export const submitRender = async (templateId, props, picked) => {
  const resolved = { ...props };
  for (const [field, pick] of Object.entries(picked)) {
    if (!pick.file) continue;
    resolved[field] = await uploadFile(pick.file);
  }
  const res = await fetch(`${API}/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ templateId, props: resolved }),
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error ?? "تعذّر إنشاء المهمة");
  }
  const { id } = await res.json();
  return id;
};
export const fetchJobs = async () => {
  const res = await fetch(`${API}/jobs`);
  return res.ok ? await res.json() : [];
};
export const downloadUrl = (id) => `${API}/jobs/${id}/file`;
