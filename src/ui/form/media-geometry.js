/**
 * هندسة المقطع في كل قالب، بصيغة يفهمها مسرح التحريك.
 *
 * القوالب لا تتفق على طريقة واحدة لوصف حجم المقطع — أحدها يخزّن نسبة من عرض
 * الإطار، وآخر عرضاً ببكسل التصميم، وثالث نسبة من مساحة البطاقة. بدل حشو
 * المسرح بشروط لكل قالب، يترجم هذا الملف كلاً منها إلى مستطيل بالنِّسب
 * ودالّتين للتحريك والتحجيم. إضافة قالب جديد = مُحوّل هنا، والمسرح لا يتغيّر.
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** يقرأ نسبة المقطع المقيسة، أو يفترض عمودياً 9:16 كحال محتوى الشورتس. */
const aspectOf = (props) => props.mediaAspect ?? 9 / 16;

const freeBox = (props, meta) => {
  const width = props.mediaScale;
  const height = (width * meta.width) / aspectOf(props) / meta.height;
  return {
    kind: "box",
    label: "المقطع",
    rect: {
      left: props.mediaCenterXRatio - width / 2,
      top: props.mediaCenterYRatio - height / 2,
      width,
      height,
    },
    onMove: (dx, dy) => ({
      mediaCenterXRatio: clamp(props.mediaCenterXRatio + dx, -0.5, 1.5),
      mediaCenterYRatio: clamp(props.mediaCenterYRatio + dy, -0.5, 1.5),
    }),
    onResize: (dx) => ({
      mediaScale: clamp(props.mediaScale + dx * 2, 0.1, 2),
    }),
  };
};

/**
 * قالب «كشف الكلمات»: الحجم نسبةٌ من مساحة البطاقة لا من الإطار، والمقطع
 * يأخذ نسبته الطبيعية داخلها — فالمستطيل المرسوم يطابق ما يُرسم فعلاً.
 */
const cardRelativeBox = (props, meta) => {
  const hasLogo = Boolean(props.logo);
  const insetTop = hasLogo
    ? props.cardInsetTopWithLogoRatio
    : props.cardInsetYRatio;
  const insetBottom = hasLogo
    ? props.cardInsetBottomWithLogoRatio
    : props.cardInsetYRatio;
  const cardWidth = 1 - props.cardInsetXRatio * 2;
  const cardHeight = 1 - insetTop - insetBottom;
  const areaW = cardWidth * props.mediaScale;
  const areaH = cardHeight * props.mediaScale;

  let width = areaW;
  let height = (areaW * meta.width) / aspectOf(props) / meta.height;
  if (props.mediaFreeSize && height > areaH) {
    height = areaH;
    width = (areaH * meta.height * aspectOf(props)) / meta.width;
  }
  return {
    kind: "box",
    label: "المقطع",
    rect: {
      left: props.mediaCenterXRatio - width / 2,
      top: props.mediaCenterYRatio - height / 2,
      width,
      height,
    },
    onMove: (dx, dy) => ({
      mediaCenterXRatio: clamp(props.mediaCenterXRatio + dx, 0, 1),
      mediaCenterYRatio: clamp(props.mediaCenterYRatio + dy, 0, 1),
    }),
    onResize: (dx) => ({
      mediaScale: clamp(props.mediaScale + dx * 2, 0.2, 2),
    }),
  };
};

/**
 * قالب الريل: البطاقة متمركزة دائماً وهويةُ القالب أن تبقى كذلك، والمقطع
 * يملأها — فالمتاح تغيير عرضها لا موضعها. نرسم شريطاً بعرضها بدل صندوق،
 * لأن ارتفاعها يتبع نسبة كل مشهد ورسم صندوق واحد يكذب على المستخدم.
 */
const cardWidthBar = (props, meta) => ({
  kind: "width",
  label: "عرض البطاقة",
  widthRatio: props.cardWidthPx / meta.width,
  onResize: (dx) => ({
    cardWidthPx: clamp(
      Math.round(props.cardWidthPx + dx * meta.width * 2),
      300,
      1040,
    ),
  }),
});

export const mediaGeometry = (props, meta) => {
  if (props.media === null || props.media === undefined) {
    // الريل يحمل وسائطه داخل المشاهد، فبطاقته تُعرض ولو خلا الحقل العام
    if (typeof props.cardWidthPx === "number") return cardWidthBar(props, meta);
    return null;
  }
  if (typeof props.mediaScale !== "number") return null;
  if (typeof props.cardInsetXRatio === "number") {
    return cardRelativeBox(props, meta);
  }
  if (typeof props.mediaCenterXRatio === "number") return freeBox(props, meta);
  return null;
};
