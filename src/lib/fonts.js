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
 * أساليب الخط المتاحة للقوالب.
 *
 * كلها ملفات محلية في public/fonts تُحمّل بلا أي طلب شبكة، فالمظهر واحد على
 * كل جهاز وفي كل مسار رندر. ولهذا لا نستعمل خطوط الويب من نطاق خارجي: سياسة
 * الأمان في الصفحة المنشورة تمنع الاتصال بغير أصلها، فيسقط الخط على البديل
 * بصمت وتنزاح القياسات.
 *
 * وزنان لكل أسلوب لا أكثر — عريض للكلمة النشطة وأخفّ لما حولها — وهما ما
 * تستعمله القوالب. والوزنان يختلفان بين العائلات: ما ليس فيه 900 يُعطى 700،
 * لأن طلب وزن غير موجود يجعل المتصفح يزيّف السماكة فيخرج الحرف مشوّهاً.
 *
 * ثمانية أولاً لأنه خط التصميم الأصلي، وملفاه خارج المستودع (رخصته تمنع
 * إعادة الاستضافة). فإن غابا سقط هذا الأسلوب وحده على البديل، وبقيت البقية
 * سليمة — وهي مرخّصة OFL ومرفوعة مع المشروع.
 */
export const FONT_STYLES = [
  {
    id: "thmanyah",
    label: "ثمانية — سيريف عريض",
    family: FONT_FAMILY,
    heavy: FONT_WEIGHT_BLACK,
    medium: FONT_WEIGHT_MEDIUM,
    files: [
      ["thmanyah-serif-display-Black.woff2", FONT_WEIGHT_BLACK],
      ["thmanyah-serif-display-Medium.woff2", FONT_WEIGHT_MEDIUM],
    ],
  },
  {
    id: "cairo",
    label: "القاهرة — سانس عصري",
    family: "Cairo",
    heavy: 900,
    medium: 500,
    files: [
      ["cairo-900.woff2", 900],
      ["cairo-500.woff2", 500],
    ],
  },
  {
    id: "tajawal",
    label: "تجوّال — سانس هندسي",
    family: "Tajawal",
    heavy: 900,
    medium: 500,
    files: [
      ["tajawal-900.woff2", 900],
      ["tajawal-500.woff2", 500],
    ],
  },
  {
    id: "reem-kufi",
    label: "ريم كوفي — كوفي حديث",
    family: "Reem Kufi",
    heavy: 700,
    medium: 400,
    files: [
      ["reem-kufi-700.woff2", 700],
      ["reem-kufi-400.woff2", 400],
    ],
  },
  {
    id: "amiri",
    label: "أميري — نسخ كلاسيكي",
    family: "Amiri",
    heavy: 700,
    medium: 400,
    files: [
      ["amiri-700.woff2", 700],
      ["amiri-400.woff2", 400],
    ],
  },
].map((style) => ({ ...style, stack: `"${style.family}", ${FALLBACK}` }));

export const FONT_STYLE_IDS = FONT_STYLES.map((style) => style.id);

const STYLE_BY_ID = new Map(FONT_STYLES.map((style) => [style.id, style]));

/** الأسلوب بمعرّفه، وثمانية لأي معرّف مجهول — فلا يسقط القالب بقيمة قديمة. */
export const fontStyleOf = (id) => STYLE_BY_ID.get(id) ?? FONT_STYLES[0];
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

const loadLocalFont = async (family, file, weight) => {
  const url = assetUrl(staticFile(`fonts/${file}`));
  const face = new FontFace(family, await readFontBytes(url), {
    weight: String(weight),
  });
  await face.load();
  document.fonts.add(face);
};

/**
 * كل الأساليب تُحمّل دفعة واحدة عند الإقلاع.
 *
 * التحميل عند الاختيار كان أخفّ، لكنه يفتح ثغرة: القوالب تقيس عرض النص
 * بـ`measureText` أثناء الرسم، فلو لم يكن الخط المختار جاهزاً لحظتها قِيس
 * بالخط البديل وخرج الضبط منزاحاً. والحِمل هنا محلي لا شبكي — الملفات مضمّنة
 * في الصفحة أصلاً — فالثمن أجزاء من الثانية مرة واحدة.
 *
 * وكل أسلوب يُنتظر على حدة: سقوط عائلة لا يُسقط البقية.
 */
const loadStyle = async (style) => {
  await Promise.all(
    style.files.map(([file, weight]) =>
      loadLocalFont(style.family, file, weight),
    ),
  );
  return style.id;
};

/** معرّفات الأساليب التي حُمّلت فعلاً؛ فارغة خارج المتصفح. */
export const fontsReady = !inBrowser
  ? Promise.resolve([])
  : Promise.allSettled(FONT_STYLES.map(loadStyle))
      .then((results) => {
        const loaded = [];
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            loaded.push(result.value);
            return;
          }
          // نكمل الرندر بالخط البديل بدل تعليق العملية، مع تحذير واضح في
          // السجل لأن القياسات ستختلف عن التصميم الأصلي فتنزاح المواضع.
          // eslint-disable-next-line no-console
          console.warn(
            `تعذّر تحميل خط «${FONT_STYLES[index].label}»، سيُستخدم خط بديل والضبط سيختلف عن التصميم الأصلي.`,
            result.reason,
          );
        });
        return loaded;
      })
      .then((loaded) => {
        if (fontHandle !== null) {
          continueRender(fontHandle);
        }
        return loaded;
      });
