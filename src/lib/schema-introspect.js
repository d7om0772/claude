/**
 * استنطاق الـ schema لتوليد حقول الواجهة تلقائياً.
 *
 * هذه هي القطعة التي تجعل عقد القالب مُجدياً: لا واجهة مكتوبة يدوياً لكل قالب،
 * بل حقول تُشتقّ من schema.ts. إضافة حقل إلى قالب تُظهره في الواجهة بلا أي
 * تعديل هنا.
 */
const defOf = (node) => node?._zod?.def ?? {};
const descriptionOf = (node) => node?.description ?? "";
/** يفكّ optional / nullable / default للوصول إلى النوع الفعلي. */
const unwrap = (node) => {
  let current = node;
  let optional = false;
  for (let depth = 0; depth < 8; depth++) {
    const def = defOf(current);
    if (
      def.type === "optional" ||
      def.type === "nullable" ||
      def.type === "default"
    ) {
      optional = true;
      current = def.innerType;
      continue;
    }
    break;
  }
  return { inner: current, optional };
};
const numericBounds = (node) => {
  const out = {};
  for (const check of defOf(node).checks ?? []) {
    const cd = check?._zod?.def;
    if (cd?.minimum !== undefined) out.min = cd.minimum;
    if (cd?.maximum !== undefined) out.max = cd.maximum;
  }
  return out;
};
const hasCustomCheck = (node) =>
  (defOf(node).checks ?? []).some((c) => c?._zod?.def?.check === "custom");
/** حقول تمثّل ملفاً يرفعه المستخدم، مع نوع الملف المقبول. */
const ASSET_ACCEPT = {
  logo: "image/*",
  media: "image/*,video/*",
  src: "image/*,video/*",
  voiceover: "audio/*",
  clickSfx: "audio/*",
};
const isCaptionArray = (element) => {
  const shape = defOf(element).shape;
  return Boolean(
    shape && "text" in shape && "startMs" in shape && "endMs" in shape,
  );
};
const classify = (name, node) => {
  const def = defOf(node);
  const accept = ASSET_ACCEPT[name];
  // الاسم وحده لا يكفي: في قالب الريل حقل media كائن {src, aspect, …} لا
  // مساراً، فلو صنّفناه ملفاً لكتبت الواجهة نصاً مكان كائن وانكسر القالب.
  if (accept !== undefined && def.type === "string") {
    return { kind: "asset", accept };
  }
  switch (def.type) {
    case "string": {
      // zColor من @remotion/zod-types نصٌّ يحمل فحصاً مخصّصاً، بخلاف النصوص
      // العادية التي تحمل min_length / max_length أو لا تحمل شيئاً.
      if (hasCustomCheck(node) || /color$/i.test(name)) {
        return { kind: "color" };
      }
      const max = (def.checks ?? []).reduce((acc, c) => {
        const m = c?._zod?.def?.maximum;
        return m === undefined ? acc : m;
      }, undefined);
      return {
        kind: max !== undefined && max > 40 ? "textarea" : "text",
        maxLength: max,
      };
    }
    case "number": {
      const { min, max } = numericBounds(node);
      // النِسب تحتاج خطوة دقيقة؛ الفريمات والأعداد الصحيحة لا
      const fractional = max !== undefined && max <= 3;
      return { kind: "number", min, max, step: fractional ? 0.001 : 1 };
    }
    case "boolean":
      return { kind: "boolean" };
    case "enum":
      return { kind: "enum", options: Object.values(def.entries ?? {}) };
    case "object": {
      // كائن متداخل: نفس منطق الاشتقاق، والواجهة تعرضه كمجموعة فرعية
      const shape = def.shape;
      return shape
        ? { kind: "object", itemFields: fieldsOfShape(shape) }
        : { kind: "unsupported" };
    }
    case "array": {
      const element = def.element;
      if (isCaptionArray(element)) return { kind: "captions" };
      if (defOf(element).type === "number") return { kind: "numberList" };
      // مصفوفة كائنات: نشتقّ حقول العنصر بنفس المنطق تكرارياً بدل معالجة
      // كل قالب كحالة خاصة.
      const itemShape = defOf(element).shape;
      if (itemShape) {
        return { kind: "objectList", itemFields: fieldsOfShape(itemShape) };
      }
      return { kind: "unsupported" };
    }
    default:
      return { kind: "unsupported" };
  }
};
/** أول جملة من الوصف — عنوان الحقل في الواجهة. */
const labelFrom = (description, name) => {
  if (description.length === 0) return name;
  const firstSentence = description.split(/[.،]|—/u)[0] ?? description;
  return firstSentence.trim().slice(0, 70);
};
function fieldsOfShape(shape) {
  return Object.entries(shape).map(([name, node]) => {
    const { inner, optional } = unwrap(node);
    const description = descriptionOf(node) || descriptionOf(inner);
    return {
      name,
      optional,
      label: labelFrom(description, name),
      // الوصف كاملاً: العنوان يقتطع أول جملة، وكثير من الأوصاف تحمل بعدها
      // شرطاً يغيّر سلوك الحقل — رميُه يجعل الحقل يبدو معطّلاً بلا تفسير.
      description,
      ...classify(name, inner),
    };
  });
}
/**
 * يقبل unknown عن قصد: الدالة استنطاق بنيوي محض لا تعتمد على نوع zod بعينه،
 * والسجلّ يمرّر AnyZodObject من remotion وهو اتحاد بنيوي لا يطابق ZodTypeAny.
 */
export const describeSchema = (schema) => {
  const shape = schema.shape;
  return shape ? fieldsOfShape(shape) : [];
};
