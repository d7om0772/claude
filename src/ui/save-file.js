/**
 * تسليم ملف للمستخدم عبر المسارين الممكنين.
 *
 * داخل صفحة artifact منشورة: بيئة العرض تمنع الصفحة من بدء تنزيل بنفسها،
 * والطريق الوحيد هو صلاحية downloads التي تعرض على المشاهد تأكيداً.
 * وخارجها (تشغيل محلي): رابط تنزيل عادي.
 */

const MAX_BYTES = 16 * 1024 * 1024;

export class SaveError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const viaDownloadsCapability = async (filename, blob) => {
  const claude = globalThis.claude;
  // لا وجود لـ claude.use يعني أننا خارج بيئة artifact — التنزيل العادي يعمل
  if (!claude?.use) return false;

  const downloads = await claude.use("downloads");
  if (!downloads) {
    // داخل بيئة artifact بلا الصلاحية: رابط التنزيل العادي معطّل هناك، فلو
    // سقطنا عليه لظهرت رسالة نجاح بلا ملف. نفشل بوضوح بدل أن نُضلّل.
    throw new SaveError(
      "unavailable",
      "الحفظ غير متاح في هذه النسخة المنشورة. صلاحية التنزيل لا تعمل مع artifact مشارك علناً — أوقف المشاركة العلنية ثم أعد النشر.",
    );
  }

  if (blob.size > MAX_BYTES) {
    throw new SaveError(
      "too_large",
      `الملف ${(blob.size / 1024 / 1024).toFixed(1)} م.ب ويتجاوز حد التنزيل (١٦ م.ب). قصّر المقطع أو خفّض الجودة.`,
    );
  }

  await downloads.save({ filename, data: blob });
  return true;
};

const viaAnchor = (filename, blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // الإبطال بعد مهلة قصيرة: الإبطال الفوري يلغي التنزيل في بعض المتصفحات
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/** يعيد نصاً يصف ما حدث، أو يرمي SaveError. */
export const saveFile = async (filename, blob) => {
  try {
    if (await viaDownloadsCapability(filename, blob)) {
      return "تم الحفظ";
    }
  } catch (err) {
    if (err instanceof SaveError) throw err;
    const code = err?.code ?? "unknown";
    if (code === "declined") throw new SaveError(code, "أُلغي الحفظ.");
    if (code === "too_large")
      throw new SaveError(code, "الملف يتجاوز حد التنزيل (١٦ م.ب).");
    if (code === "rate_limited")
      throw new SaveError(code, "فيه طلب حفظ مفتوح — أغلقه ثم أعد المحاولة.");
    throw new SaveError(code, err?.message ?? "تعذّر الحفظ.");
  }

  viaAnchor(filename, blob);
  return "بدأ التنزيل";
};
