/**
 * خريطة الأصول للنسخة المكتفية بذاتها (ملف HTML واحد).
 *
 * في التشغيل العادي — سواء استوديو Remotion أو خادم Vite أو الرندر — تُخدَم
 * الأصول من مجلد public بمساراتها الطبيعية، فتعيد هذه الدالة المسار كما هو.
 *
 * أما نسخة الملف الواحد فلا خادم معها: يحقن مُولّدها خريطةً تربط كل مسار
 * بـ data: URI، فتعيد الدالة القيمة المضمّنة. لا ترقيع لـ fetch ولا لأي
 * واجهة متصفح — الاستبدال يمر من نقطة واحدة معروفة.
 */

declare global {
  // eslint-disable-next-line no-var
  var __ASSET_MAP__: Record<string, string> | undefined;
}

export const assetUrl = (path: string): string => {
  if (typeof globalThis === "undefined") return path;
  return globalThis.__ASSET_MAP__?.[path] ?? path;
};

/**
 * يحوّل مرجع أصل إلى رابط صالح للتشغيل.
 *
 * المطلق يمرّ كما هو — وهذا يشمل blob: الذي تنتجه الواجهة عند رفع ملف،
 * وdata: و http(s): والمسارات الجذرية. وما عداه مسار نسبي داخل public
 * فيمرّ على staticFile.
 *
 * كان كل قالب يكتب نسخته من هذا الشرط، وثلاثة منها أغفلت blob: فكان أي
 * ملف يرفعه المستخدم يُمرَّر إلى staticFile فينكسر مساره.
 */
export const resolveAsset = (
  path: string,
  staticFile: (p: string) => string,
): string =>
  /^(https?:|data:|blob:)/iu.test(path) || path.startsWith("/")
    ? assetUrl(path)
    : assetUrl(staticFile(path));
