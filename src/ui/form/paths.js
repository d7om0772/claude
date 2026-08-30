/**
 * مسارات الحقول المتداخلة.
 *
 * قالب الريل يضع الوسائط داخل كائن داخل مصفوفة (`scenes.2.media.src`)، فما
 * عاد اسم الحقل وحده كافياً لتعريفه: الواجهة تحتاج مفتاحاً فريداً لكل ملف
 * مرفوع، والخادم يحتاج أن يضع المسار المرفوع في موضعه بالضبط.
 */

export const joinPath = (prefix, key) =>
  prefix === undefined || prefix === "" ? String(key) : `${prefix}.${key}`;

/** نسخة جديدة من `target` بعد وضع `value` في `path` — بلا تعديل الأصل. */
export const setIn = (target, path, value) => {
  const [head, ...rest] = Array.isArray(path) ? path : String(path).split(".");
  if (head === undefined) return value;
  if (Array.isArray(target)) {
    const index = Number(head);
    if (!Number.isInteger(index)) return target;
    const copy = target.slice();
    copy[index] = setIn(target[index], rest, value);
    return copy;
  }
  const base = target !== null && typeof target === "object" ? target : {};
  return { ...base, [head]: setIn(base[head], rest, value) };
};
