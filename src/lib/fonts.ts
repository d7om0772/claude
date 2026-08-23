import { continueRender, delayRender, staticFile } from "remotion";
import { assetUrl } from "./asset-url";

/**
 * تحميل خط ثمانية — وحدة مشتركة بين كل القوالب.
 *
 * الخط أصل على مستوى المشروع لا على مستوى القالب: كل القوالب تستعمل نفس
 * الملفين في public/fonts. عزله هنا يمنع تكرار delayRender وتسجيل نفس
 * FontFace مرتين عند وجود أكثر من قالب في نفس الحزمة.
 *
 * الملفان عائلة طباعية واحدة (thmanyah serif display) بوزنين، لا عائلتان:
 * Black‏ 900 و Medium‏ 500. التفريق بينهما عبر fontWeight لا عبر اسم العائلة.
 */

export const FONT_FAMILY = "Thmanyah Serif Display";

export const FONT_WEIGHT_BLACK = 900;
export const FONT_WEIGHT_MEDIUM = 500;

/**
 * مكدّس احتياطي: لو غاب ملف الخط لأي سبب، النص يظهر بخط عربي بديل بدل
 * أن يتحوّل إلى مربعات فارغة.
 */
const FALLBACK = `"Noto Naskh Arabic", "Amiri", "Times New Roman", serif`;
export const FONT_STACK = `"${FONT_FAMILY}", ${FALLBACK}`;

/**
 * الوحدة تُستورَد أيضاً في سياق Node (سكربتات السجلّ وأدوات سطر الأوامر)،
 * حيث لا DOM ولا خادم يخدم public. التحميل هناك بلا معنى ويخرج ضجيجاً
 * مضلّلاً، فنتخطّاه ونُبقي الوعد محلولاً بـ false.
 */
const inBrowser =
  typeof document !== "undefined" && typeof fetch !== "undefined";

const fontHandle = inBrowser ? delayRender("تحميل خط ثمانية") : null;

/**
 * لا نستخدم loadFont من @remotion/fonts عن قصد: عند فشل التحميل يستدعي
 * cancelRender داخلياً، وهذا يُجهض الرندر كله بلا رجعة — فلا ينفع أي catch
 * خارجي، ويموت الرندر برسالة غامضة عند أي خلل في ملف خط. التحميل عبر
 * FontFace مباشرة يجعل الفشل قابلاً للالتقاط فعلاً.
 */
const loadLocalFont = async (file: string, weight: number): Promise<void> => {
  const url = assetUrl(staticFile(`fonts/${file}`));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`تعذّر تحميل الخط ${file} (HTTP ${response.status})`);
  }
  const face = new FontFace(FONT_FAMILY, await response.arrayBuffer(), {
    weight: String(weight),
  });
  await face.load();
  document.fonts.add(face);
};

/** يُحلّ إلى true إذا حُمّل خط ثمانية فعلاً، و false إذا سقطنا على البديل. */
export const fontsReady: Promise<boolean> = !inBrowser
  ? Promise.resolve(false)
  : Promise.all([
      loadLocalFont("thmanyah-serif-display-Black.woff2", FONT_WEIGHT_BLACK),
      loadLocalFont("thmanyah-serif-display-Medium.woff2", FONT_WEIGHT_MEDIUM),
    ])
      .then(() => true)
      .catch((err: unknown) => {
        // نكمل الرندر بالخط البديل بدل تعليق العملية، مع تحذير واضح في السجل
        // لأن القياسات ستختلف عن التصميم الأصلي فتنزاح المواضع.
        // eslint-disable-next-line no-console
        console.warn(
          "تعذّر تحميل خط ثمانية، سيُستخدم خط بديل والضبط سيختلف عن التصميم الأصلي.",
          err,
        );
        return false;
      })
      .then((loaded) => {
        if (fontHandle !== null) {
          continueRender(fontHandle);
        }
        return loaded;
      });
