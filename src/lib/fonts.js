import { continueRender, delayRender, staticFile } from "remotion";
import { assetUrl } from "./asset-url.js";
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
/**
 * يفكّ data: URI إلى ArrayBuffer بلا أي طلب شبكة.
 *
 * لا نستعمل fetch على data: عن قصد: سياسة الأمان في الصفحات المنشورة تحصر
 * connect-src بالأصل نفسه، فترفض المتصفحات الطلب («Refused to connect to
 * data:…») ويسقط الخط على البديل بصمت. الفكّ المباشر خارج طبقة الشبكة كلياً
 * فلا تحكمه أي سياسة.
 */
const dataUriToArrayBuffer = (uri) => {
  const comma = uri.indexOf(",");
  const payload = uri.slice(comma + 1);
  if (!uri.slice(0, comma).includes(";base64")) {
    return new TextEncoder().encode(decodeURIComponent(payload)).buffer;
  }
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const readFontBytes = async (url) => {
  if (url.startsWith("data:")) {
    return dataUriToArrayBuffer(url);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`تعذّر تحميل الخط (HTTP ${response.status})`);
  }
  return response.arrayBuffer();
};

const loadLocalFont = async (file, weight) => {
  const url = assetUrl(staticFile(`fonts/${file}`));
  const face = new FontFace(FONT_FAMILY, await readFontBytes(url), {
    weight: String(weight),
  });
  await face.load();
  document.fonts.add(face);
};

/** يُحلّ إلى true إذا حُمّل خط ثمانية فعلاً، و false إذا سقطنا على البديل. */
export const fontsReady = !inBrowser
  ? Promise.resolve(false)
  : Promise.all([
      loadLocalFont("thmanyah-serif-display-Black.woff2", FONT_WEIGHT_BLACK),
      loadLocalFont("thmanyah-serif-display-Medium.woff2", FONT_WEIGHT_MEDIUM),
    ])
      .then(() => true)
      .catch((err) => {
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
