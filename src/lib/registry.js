import {
  Template as PaperCardTemplate,
  calculateTemplateMetadata as paperCardMetadata,
} from "../templates/paper-card-kinetic-line/Template.jsx";
import {
  templateSchema as paperCardSchema,
  defaultProps as paperCardDefaults,
} from "../templates/paper-card-kinetic-line/schema.js";
import paperCardMeta from "../templates/paper-card-kinetic-line/template.json";
import {
  Template as KaraokeTemplate,
  calculateTemplateMetadata as karaokeMetadata,
} from "../templates/paper-karaoke-captions/Template.jsx";
import {
  templateSchema as karaokeSchema,
  defaultProps as karaokeDefaults,
} from "../templates/paper-karaoke-captions/schema.js";
import karaokeMeta from "../templates/paper-karaoke-captions/template.json";
import {
  Template as StretchTemplate,
  calculateMetadata as stretchMetadata,
} from "../templates/card-stretch-reveal/Template.jsx";
import {
  templateSchema as stretchSchema,
  defaultProps as stretchDefaults,
} from "../templates/card-stretch-reveal/schema.js";
import stretchMeta from "../templates/card-stretch-reveal/template.json";
import { Template as WordRevealTemplate } from "../templates/thmanyah-word-reveal-vertical/Template.jsx";
import {
  templateSchema as wordRevealSchema,
  defaultProps as wordRevealDefaults,
  calculateMetadata as wordRevealMetadata,
} from "../templates/thmanyah-word-reveal-vertical/schema.js";
import wordRevealMeta from "../templates/thmanyah-word-reveal-vertical/template.json";
import { PaperCardTemplate as PaperCardRevealTemplate } from "../templates/paper-card-reveal/Template.jsx";
import {
  paperCardSchema as paperCardRevealSchema,
  paperCardDefaultProps as paperCardRevealDefaults,
  calculateMetadata as paperCardRevealMetadata,
} from "../templates/paper-card-reveal/schema.js";
import paperCardRevealMeta from "../templates/paper-card-reveal/template.json";
import { Template as KlovaReelTemplate } from "../templates/klova-word-reveal-reel/Template.jsx";
import {
  templateSchema as klovaReelSchema,
  defaultProps as klovaReelDefaults,
  calculateMetadata as klovaReelMetadata,
} from "../templates/klova-word-reveal-reel/schema.js";
import klovaReelMeta from "../templates/klova-word-reveal-reel/template.json";
import { Template as CustomCanvasTemplate } from "../templates/custom-canvas/Template.jsx";
import {
  templateSchema as customCanvasSchema,
  defaultProps as customCanvasDefaults,
  calculateMetadata as customCanvasMetadata,
} from "../templates/custom-canvas/schema.js";
import customCanvasMeta from "../templates/custom-canvas/template.json";
import { Template as EchoCardTemplate } from "../templates/echo-card-vertical/Template.jsx";
import {
  templateSchema as echoCardSchema,
  defaultProps as echoCardDefaults,
  calculateMetadata as echoCardMetadata,
} from "../templates/echo-card-vertical/schema.js";
import echoCardMeta from "../templates/echo-card-vertical/template.json";
/**
 * كل قالب له props مختلفة تماماً، فالسجلّ غير متجانس بطبيعته ولا يمكن تمثيله
 * بنوع واحد دقيق. هذه الدالة تتحقق من اتساق القالب داخلياً — أن props المكوّن
 * ونوع defaultProps ونوع calculateMetadata كلها نفس T — ثم تمحو النوع عند حدّ
 * السجلّ فقط. المحو محصور هنا في سطر واحد ولا يتسرّب إلى القوالب نفسها.
 */
const defineTemplate = (entry) => entry;
export const templates = [
  defineTemplate({
    meta: paperCardMeta,
    schema: paperCardSchema,
    component: PaperCardTemplate,
    defaultProps: paperCardDefaults,
    calculateMetadata: paperCardMetadata,
  }),
  defineTemplate({
    meta: karaokeMeta,
    schema: karaokeSchema,
    component: KaraokeTemplate,
    defaultProps: karaokeDefaults,
    calculateMetadata: karaokeMetadata,
  }),
  defineTemplate({
    meta: stretchMeta,
    schema: stretchSchema,
    component: StretchTemplate,
    defaultProps: stretchDefaults,
    calculateMetadata: stretchMetadata,
  }),
  defineTemplate({
    meta: wordRevealMeta,
    schema: wordRevealSchema,
    component: WordRevealTemplate,
    defaultProps: wordRevealDefaults,
    calculateMetadata: wordRevealMetadata,
  }),
  defineTemplate({
    meta: paperCardRevealMeta,
    schema: paperCardRevealSchema,
    component: PaperCardRevealTemplate,
    defaultProps: paperCardRevealDefaults,
    calculateMetadata: paperCardRevealMetadata,
  }),
  defineTemplate({
    meta: klovaReelMeta,
    schema: klovaReelSchema,
    component: KlovaReelTemplate,
    defaultProps: klovaReelDefaults,
    calculateMetadata: klovaReelMetadata,
  }),
  defineTemplate({
    meta: echoCardMeta,
    schema: echoCardSchema,
    component: EchoCardTemplate,
    defaultProps: echoCardDefaults,
    calculateMetadata: echoCardMetadata,
  }),
  defineTemplate({
    meta: customCanvasMeta,
    schema: customCanvasSchema,
    component: CustomCanvasTemplate,
    defaultProps: customCanvasDefaults,
    calculateMetadata: customCanvasMetadata,
  }),
];

/**
 * «لقطة» وحدة واحدة، و«قالب» نموذج مركّب من عدة لقطات، و«استوديو» لوحة حرّة
 * يبنيها المستخدم بنفسه بالماوس.
 */
export const SHOT = "shot";
export const TEMPLATE = "template";
export const STUDIO = "studio";
const KINDS = new Set([SHOT, TEMPLATE, STUDIO]);
export const kindOf = (meta) => (KINDS.has(meta.kind) ? meta.kind : SHOT);
export const templatesOfKind = (kind) =>
  templates.filter((t) => kindOf(t.meta) === kind);
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
export const getTemplate = (id) => templates.find((t) => t.meta.id === id);
