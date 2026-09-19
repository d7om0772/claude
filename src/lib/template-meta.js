import paperKaraokeCaptions from "../templates/paper-karaoke-captions/template.json" with { type: "json" };
import thmanyahWordReveal from "../templates/thmanyah-word-reveal-vertical/template.json" with { type: "json" };
import paperCardReveal from "../templates/paper-card-reveal/template.json" with { type: "json" };
import klovaWordRevealReel from "../templates/klova-word-reveal-reel/template.json" with { type: "json" };
import klovaCream from "../templates/klova-cream-reel/template.json" with { type: "json" };
import customCanvas from "../templates/custom-canvas/template.json" with { type: "json" };

/**
 * ميتاداتا القوالب وحدها — بلا مكوّنات React.
 *
 * الخادم يحتاج المعرّف والاسم فقط، والرندر الفعلي يجري داخل حزمة Remotion
 * في المتصفح. فصلها هنا يمنع الخادم من استيراد ملفات .jsx التي لا يفهمها
 * Node أصلاً، ويجعل تبعيات الخادم أخفّ.
 */
export const templateMetas = [
  paperKaraokeCaptions,
  thmanyahWordReveal,
  paperCardReveal,
  klovaWordRevealReel,
  klovaCream,
  customCanvas,
];

/**
 * حارس تكرار المعرّفات: معرّفان متطابقان يعنيان Composition واحداً يطغى على
 * الآخر بصمت، فيختفي قالب كامل بلا رسالة خطأ.
 */
const duplicateIds = templateMetas
  .map((t) => t.id)
  .filter((id, i, all) => all.indexOf(id) !== i);

if (duplicateIds.length > 0) {
  throw new Error(
    `معرّفات قوالب مكرّرة: ${[...new Set(duplicateIds)].join("، ")}`,
  );
}

export const findTemplateMeta = (id) => templateMetas.find((t) => t.id === id);
