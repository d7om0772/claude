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
