/**
 * حفظ تقدّم التحرير محلياً واسترجاعه — «ارجع له فيما بعد».
 *
 * IndexedDB لا localStorage: القيم تشمل ملفات حقيقية (فيديو، صوت) قد تصل
 * لعشرات الميجابايتات، وlocalStorage يقبل نصوصاً قصيرة فقط ولا يخزّن Blob.
 * IndexedDB يخزّن كائن File كما هو عبر خوارزمية النسخ البنيوي — بلا تحويل
 * لـ base64 يضخّم الحجم بالثلث ويبطئ الحفظ.
 *
 * سجلّ واحد لكل قالب (المفتاح معرّف القالب): فتح القالب نفسه يعرض آخر ما
 * حُفظ له، لا قائمة نسخ. يكفي لغرض «أكمل من حيث توقفت».
 */

const DB_NAME = "montage-progress";
const STORE = "progress";
const VERSION = 1;

const openDb = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "templateId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const tx = async (mode, run) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const request = run(store);
    t.oncomplete = () => resolve(request?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
};

/**
 * يحفظ props كما هي (بما فيها روابط blob: الميتة — تُستبدل عند الاسترجاع)
 * وملفات `picked` وحدها، مفهرسة بمسارها (`media`, `scenes.2.media.src`)
 * حتى تُعاد كل واحدة إلى مكانها بالضبط.
 */
export const saveProgress = async (templateId, props, picked) => {
  const files = Object.fromEntries(
    Object.entries(picked).map(([path, p]) => [path, p.file]),
  );
  await tx("readwrite", (store) =>
    store.put({ templateId, savedAt: Date.now(), props, files }),
  );
};

export const loadProgress = async (templateId) => {
  try {
    return (await tx("readonly", (store) => store.get(templateId))) ?? null;
  } catch {
    return null;
  }
};

export const clearProgress = async (templateId) => {
  try {
    await tx("readwrite", (store) => store.delete(templateId));
  } catch {
    // لا شيء يُبنى على نجاح الحذف؛ فشل صامت أفضل من كسر الواجهة
  }
};
