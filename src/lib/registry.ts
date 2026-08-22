import type { ComponentType } from "react";
import type { AnyZodObject, CalculateMetadataFunction } from "remotion";

import {
  Template as PaperCardTemplate,
  calculateTemplateMetadata as paperCardMetadata,
} from "../templates/paper-card-kinetic-line/Template";
import {
  templateSchema as paperCardSchema,
  defaultProps as paperCardDefaults,
} from "../templates/paper-card-kinetic-line/schema";
import paperCardMeta from "../templates/paper-card-kinetic-line/template.json";

/**
 * سجلّ القوالب.
 *
 * إضافة قالب جديد = مجلد جديد تحت templates/ + سطر واحد في المصفوفة أسفل.
 * لا شيء آخر في المشروع يحتاج تعديلاً — الـ Compositions وشاشة الاختيار
 * تُبنى من هذا السجلّ.
 */

export type TemplateMeta = {
  readonly id: string;
  readonly name: string;
  readonly nameAr: string;
  readonly description: string;
  readonly category: string;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly defaultDurationInFrames: number;
  readonly tags: readonly string[];
  readonly previewFile: string;
};

/** الشكل الممحيّ النوع الذي يستهلكه Root وأي واجهة لاحقاً. */
export type RegisteredTemplate = {
  readonly meta: TemplateMeta;
  readonly schema: AnyZodObject;
  readonly component: ComponentType<Record<string, unknown>>;
  readonly defaultProps: Record<string, unknown>;
  readonly calculateMetadata: CalculateMetadataFunction<Record<string, unknown>>;
};

/**
 * كل قالب له props مختلفة تماماً، فالسجلّ غير متجانس بطبيعته ولا يمكن تمثيله
 * بنوع واحد دقيق. هذه الدالة تتحقق من اتساق القالب داخلياً — أن props المكوّن
 * ونوع defaultProps ونوع calculateMetadata كلها نفس T — ثم تمحو النوع عند حدّ
 * السجلّ فقط. المحو محصور هنا في سطر واحد ولا يتسرّب إلى القوالب نفسها.
 */
const defineTemplate = <T extends Record<string, unknown>>(entry: {
  readonly meta: TemplateMeta;
  readonly schema: AnyZodObject;
  readonly component: ComponentType<T>;
  readonly defaultProps: T;
  readonly calculateMetadata: CalculateMetadataFunction<T>;
}): RegisteredTemplate => entry as unknown as RegisteredTemplate;

export const templates: readonly RegisteredTemplate[] = [
  defineTemplate({
    meta: paperCardMeta as TemplateMeta,
    schema: paperCardSchema,
    component: PaperCardTemplate,
    defaultProps: paperCardDefaults,
    calculateMetadata: paperCardMetadata,
  }),
];

export const getTemplate = (id: string): RegisteredTemplate | undefined =>
  templates.find((t) => t.meta.id === id);
