/**
 * تعليمات جماليات خط ثمانية — مطبَّقة كقواعد لا كتوصيات مكتوبة.
 *
 * وحدة نقية بلا أي أثر جانبي: لا تحمّل خطاً ولا تلمس DOM، فيمكن استيرادها
 * في سكربتات Node وفي الاختبارات دون أن تُشغّل تحميل الخط.
 */

/**
 * الحروف التي لها بديل ممتد في خاصية salt، مستخرجة من جدول GSUB في ملف الخط
 * نفسه لا من التوثيق: ١٥ حرفاً. أي كلمة تنتهي بغيرها لن يتغيّر شكلها مع salt،
 * فتفعيلها عليها ضجيج بلا أثر.
 */
export const SALT_FINAL_LETTERS = "ئبتثسشصضفقكمنىي";

/** فوق هذا العدد من الكلمات يُعدّ النص «طويلاً» فتُلغى الأحرف المرسلة كلياً. */
export const SALT_MAX_WORDS = 8;

/**
 * كلمة مرسلة واحدة لكل هذا العدد من الكلمات — ضابط «لا تُستخدم بكثرة».
 *
 * الدليل يقول «بكثرة» بلا رقم، والقوالب تقرؤها بكثافات مختلفة: قالب الكاريوكي
 * يقرؤها واحدة لكل ستّ كلمات، وقالب كشف الكلمات واحدة لكل سطر. لذلك الرقم
 * افتراضٌ قابل للتجاوز عبر maxPerWords لا حكمٌ مفروض على كل القوالب.
 */
export const SALT_DEFAULT_WORDS_PER_ALTERNATE = 4;

/** آخر حرف فعلي في الكلمة، بعد تجاهل الحركات وعلامات الترقيم. */
const finalLetter = (word: string): string => {
  const stripped = word.replace(/[ً-ْـ\p{P}\p{S}]/gu, "");
  return stripped.slice(-1);
};

/** هل لهذه الكلمة بديل ممتد أصلاً؟ */
export const hasSaltAlternate = (word: string): boolean =>
  SALT_FINAL_LETTERS.includes(finalLetter(word));

/**
 * يصفّي أرقام الكلمات المطلوب تفعيل salt عليها وفق دليل ثمانية:
 *
 *   ١. لا تُستخدم في النصوص الطويلة  → أكثر من SALT_MAX_WORDS كلمة ⇒ لا شيء
 *   ٢. لا تُستخدم في كلمتين متجاورتين → تُسقَط الثانية من كل زوج متجاور
 *   ٣. لا تُستخدم بكثرة في الجملة    → سقف واحد لكل maxPerWords كلمة
 *   ٤. لا أثر لها على حرف بلا بديل   → تُسقَط الكلمات غير المشمولة
 *
 * الترتيب مقصود: التجاور يُحسم قبل السقف، فتبقى الكلمة الأسبق دائماً.
 */
export const sanitizeSaltIndices = (
  words: readonly string[],
  requested: readonly number[],
  options: { readonly maxPerWords?: number } = {},
): number[] => {
  if (words.length > SALT_MAX_WORDS) {
    return [];
  }

  const eligible = [...new Set(requested)]
    .sort((a, b) => a - b)
    .filter((i) => {
      const word = words[i];
      return word !== undefined && hasSaltAlternate(word);
    });

  const spaced: number[] = [];
  for (const index of eligible) {
    const previous = spaced[spaced.length - 1];
    if (previous === undefined || index - previous > 1) {
      spaced.push(index);
    }
  }

  const perAlternate = Math.max(
    1,
    options.maxPerWords ?? SALT_DEFAULT_WORDS_PER_ALTERNATE,
  );
  const cap = Math.max(1, Math.floor(words.length / perAlternate));
  return spaced.slice(0, cap);
};

/** قيمة fontFeatureSettings الجاهزة للاستعمال في style. */
export const saltFeatureSettings = (enabled: boolean): string =>
  enabled ? "'salt' 1" : "normal";
