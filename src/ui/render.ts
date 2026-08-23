import type { AssetPick } from "./form/Fields";

/**
 * عميل خادم الرندر.
 *
 * الواجهة تعمل بلا خادم أيضاً (نسخة الملف الواحد للمعاينة فقط)، فكل ما يخصّ
 * الرندر يمرّ من هنا ويُفحص توفّره أولاً بدل افتراضه.
 */

export const API = "/api";

export type JobStatus = "queued" | "rendering" | "done" | "failed";

export type Job = {
  readonly id: string;
  readonly templateId: string;
  readonly templateName: string;
  readonly status: JobStatus;
  readonly progress: number;
  readonly createdAt: number;
  readonly finishedAt?: number;
  readonly error?: string;
};

export const checkServer = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API}/health`);
    return res.ok;
  } catch {
    return false;
  }
};

const uploadFile = async (file: File): Promise<string> => {
  const res = await fetch(`${API}/assets`, {
    method: "POST",
    headers: { "x-file-name": encodeURIComponent(file.name) },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`تعذّر رفع ${file.name}`);
  }
  const { path } = (await res.json()) as { path: string };
  return path;
};

/**
 * الملفات المرفوعة تعيش في المتصفح كـ blob URL لا يعرفه الخادم، فتُرفع أولاً
 * ويُستبدل مسارها في الـ props قبل إرسال المهمة.
 */
export const submitRender = async (
  templateId: string,
  props: Record<string, unknown>,
  picked: Record<string, AssetPick>,
): Promise<string> => {
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
    const { error } = (await res.json()) as { error?: string };
    throw new Error(error ?? "تعذّر إنشاء المهمة");
  }
  const { id } = (await res.json()) as { id: string };
  return id;
};

export const fetchJobs = async (): Promise<Job[]> => {
  const res = await fetch(`${API}/jobs`);
  return res.ok ? ((await res.json()) as Job[]) : [];
};

export const downloadUrl = (id: string): string => `${API}/jobs/${id}/file`;
