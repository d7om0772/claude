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

import {
  Template as KaraokeTemplate,
  calculateTemplateMetadata as karaokeMetadata,
} from "../templates/paper-karaoke-captions/Template";
import {
  templateSchema as karaokeSchema,
  defaultProps as karaokeDefaults,
} from "../templates/paper-karaoke-captions/schema";
import karaokeMeta from "../templates/paper-karaoke-captions/template.json";

import {
  Template as StretchTemplate,
  calculateMetadata as stretchMetadata,
} from "../templates/card-stretch-reveal/Template";
import {
  templateSchema as stretchSchema,
  defaultProps as stretchDefaults,
} from "../templates/card-stretch-reveal/schema";
import stretchMeta from "../templates/card-stretch-reveal/template.json";

import { Template as WordRevealTemplate } from "../templates/thmanyah-word-reveal-vertical/Template";
import {
  templateSchema as wordRevealSchema,
  defaultProps as wordRevealDefaults,
  calculateMetadata as wordRevealMetadata,
} from "../templates/thmanyah-word-reveal-vertical/schema";
import wordRevealMeta from "../templates/thmanyah-word-reveal-vertical/template.json";

import { PaperCardTemplate as PaperCardRevealTemplate } from "../templates/paper-card-reveal/Template";
import {
  paperCardSchema as paperCardRevealSchema,
  paperCardDefaultProps as paperCardRevealDefaults,
  calculateMetadata as paperCardRevealMetadata,
} from "../templates/paper-card-reveal/schema";
import paperCardRevealMeta from "../templates/paper-card-reveal/template.json";

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
  defineTemplate({
    meta: karaokeMeta as TemplateMeta,
    schema: karaokeSchema,
    component: KaraokeTemplate,
    defaultProps: karaokeDefaults,
    calculateMetadata: karaokeMetadata,
  }),
  defineTemplate({
    meta: stretchMeta as TemplateMeta,
    schema: stretchSchema,
    component: StretchTemplate,
    defaultProps: stretchDefaults,
    calculateMetadata: stretchMetadata,
  }),
  defineTemplate({
    meta: wordRevealMeta as TemplateMeta,
    schema: wordRevealSchema,
    component: WordRevealTemplate,
    defaultProps: wordRevealDefaults,
    calculateMetadata: wordRevealMetadata,
  }),
  defineTemplate({
    meta: paperCardRevealMeta as TemplateMeta,
    schema: paperCardRevealSchema,
    component: PaperCardRevealTemplate,
    defaultProps: paperCardRevealDefaults,
    calculateMetadata: paperCardRevealMetadata,
  }),
];

/**
 * حارس تكرار المعرّفات: معرّفان متطابقان يعنيان Composition واحداً يطغى على
 * الآخر بصمت، فيختفي قالب كامل بلا رسالة خطأ. يُفحص عند تحميل الوحدة.
 */
const duplicateIds = templates
  .map((t) => t.meta.id)
  .filter((id, i, all) => all.indexOf(id) !== i);

if (duplicateIds.length > 0) {
  throw new Error(
    `معرّفات قوالب مكرّرة في السجلّ: ${[...new Set(duplicateIds)].join("، ")}`,
  );
}

export const getTemplate = (id: string): RegisteredTemplate | undefined =>
  templates.find((t) => t.meta.id === id);
