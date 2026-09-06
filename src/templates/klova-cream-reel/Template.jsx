import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { measureText } from "@remotion/layout-utils";
import { Audio, Video } from "../../lib/media.js";
import {
  FONT_STACK,
  FONT_WEIGHT_BLACK,
  FONT_WEIGHT_MEDIUM,
} from "../../lib/fonts.js";
import { resolveAsset } from "../../lib/asset-url.js";
import { isVideoSource } from "../../lib/duration.js";
import { WordClicks } from "../../lib/word-clicks.jsx";

/* ==========================================================================
 * 1) الكلمات وتوقيتها
 * ========================================================================== */

const toWords = (text) =>
  String(text ?? "")
    .split(/\s+/u)
    .filter((w) => w.length > 0);

/**
 * مقاطع الكابشن التي تخصّ نافذة زمنية — أي التي **تبدأ** داخلها.
 *
 * القاعدة «يبدأ داخلها» لا «يتداخل معها»: المقطع الذي بدأ في لقطة سابقة
 * وامتدّ بضع أجزاء من الثانية داخل هذه اللقطة قد عُرض كاملاً هناك، فعدّه
 * هنا أيضاً يكرّر الكلام نفسه في لقطتين متتاليتين. وهي كذلك القاعدة التي
 * يوزّع بها محرّر اللقطات الأسطرَ على اللقطات، فيتطابق ما يراه المستخدم في
 * اللوحة مع ما يظهر في الفيديو.
 */
const cuesInWindow = (captions, startMs, endMs) =>
  captions.filter((cue) => cue.startMs >= startMs && cue.startMs < endMs);

/**
 * لحظات ظهور كلمات السطر بالملي ثانية.
 *
 * التوقيت الصريح — الذي يكتبه محرّر الكلمات أو يأتي من ملف SRT على مستوى
 * الكلمة — يُقدَّم على أي توزيع. وإلا وُزّعت الكلمات على نسبة من مدّة السطر
 * ويبقى الباقي وقت قراءة، كما في الفيديو المرجعي.
 *
 * تُستعمل للرسم وللنقرات معاً، فلا ينفصل الصوت عن الصورة.
 */
export const wordOnsetsMs = (cue, revealShare) => {
  const words = toWords(cue.text);
  if (words.length === 0) return [];
  const explicit = cue.wordStartsMs ?? [];
  if (explicit.length >= words.length) return explicit.slice(0, words.length);
  const span = Math.max(cue.endMs - cue.startMs, 1) * revealShare;
  const spread = (i) => cue.startMs + (span * i) / words.length;
  if (explicit.length === 0) return words.map((_, i) => spread(i));
  /**
   * توقيتات صريحة ناقصة — تحدث حين تُضاف كلمة إلى سطر أو تنتقل إليه من سطر
   * آخر قبل أن تُكتب لحظتها. طرحُ الصريح كلّه عندها يزحزح كلماتٍ توقيتها
   * معروف، فيُبقى على ما هو مكتوب ويُمدّ الباقي بعده بنفس الخطوة.
   */
  const step = Math.max(span / words.length, 1);
  const last = explicit[explicit.length - 1];
  return words.map((_, i) =>
    i < explicit.length ? explicit[i] : last + step * (i - explicit.length + 1),
  );
};

/** أكبر حجم خط لا يتجاوز به عددُ الأسطر الارتفاعَ المتاح. */
const fitToHeight = (fontSize, lines, lineHeight, availablePx) => {
  if (lines <= 0 || availablePx <= 0) return fontSize;
  const needed = lines * fontSize * lineHeight;
  return needed <= availablePx ? fontSize : availablePx / (lines * lineHeight);
};

/** أكبر حجم خط لا يتجاوز به أعرضُ سطر العرضَ المتاح — بقياس فعلي للنص. */
const fitToWidth = (fontSize, texts, availablePx) => {
  if (availablePx <= 0) return fontSize;
  let widest = 0;
  for (const text of texts) {
    if (!text) continue;
    const { width } = measureText({
      text,
      fontFamily: FONT_STACK,
      fontWeight: FONT_WEIGHT_BLACK,
      fontSize,
      validateFontIsLoaded: false,
    });
    widest = Math.max(widest, width);
  }
  if (widest <= availablePx) return fontSize;
  return (fontSize * availablePx) / widest;
};

/* ==========================================================================
 * 2) الكابشن — الكلمة النشطة داكنة وتحتها خط ذهبي يمسح
 * ========================================================================== */

const CaptionWord = ({
  word,
  appearFrame,
  active,
  colors,
  enterFrames,
  underline,
  underlineThickness,
  underlineOffset,
  fontSize,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - appearFrame;
  const progress =
    enterFrames <= 0
      ? local >= 0
        ? 1
        : 0
      : spring({
          frame: local,
          fps,
          durationInFrames: enterFrames,
          config: { damping: 200, mass: 0.5 },
        });
  // الخط الذهبي يمسح من جهة البداية (يمين في العربية)
  const sweep = interpolate(local, [0, Math.max(enterFrames, 1) + 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <span
      style={{
        display: "inline-block",
        position: "relative",
        margin: `0 ${fontSize * 0.09}px`,
        opacity: progress,
        transform: `translateY(${(1 - progress) * fontSize * 0.12}px)`,
        color: active ? colors.font : colors.muted,
        // وزنٌ واحد للجميع: قياس سماكة الحروف في المرجع أعطى نفس القيمة
        // للكلمة الخافتة والنشطة، فالفرق لونٌ لا وزن
        fontWeight: FONT_WEIGHT_BLACK,
      }}
    >
      {word}
      {underline && active ? (
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            // الخط تحت حروف الكلمة مباشرة: صندوق الكلمة أطول منها بمقدار
            // ارتفاع السطر، فبُعدٌ سالب كان يرمي الخط بعيداً تحتها
            bottom: fontSize * underlineOffset,
            height: underlineThickness,
            borderRadius: underlineThickness / 2,
            backgroundColor: colors.accent,
            transform: `scaleX(${sweep})`,
            transformOrigin: "right",
          }}
        />
      ) : null}
    </span>
  );
};

const CaptionLayer = ({
  cue,
  colors,
  fontSize,
  lineHeight,
  widthPx,
  bottomPx,
  enterFrames,
  underline,
  underlineThickness,
  underlineOffset,
  revealShare,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const words = toWords(cue.text);
  const onsets = wordOnsetsMs(cue, revealShare);
  const currentMs = (frame / fps) * 1000;

  let activeIndex = -1;
  for (let i = 0; i < onsets.length; i += 1) {
    if (currentMs >= onsets[i]) activeIndex = i;
  }

  return (
    <div
      dir="rtl"
      style={{
        position: "absolute",
        left: (width - widthPx) / 2,
        // مثبّتة من أسفلها: السطر الواحد والسطران ينتهيان عند نفس الخط
        bottom: bottomPx,
        width: widthPx,
        textAlign: "center",
        fontFamily: FONT_STACK,
        fontSize,
        lineHeight,
      }}
    >
      {words.map((word, i) => (
        <CaptionWord
          key={`${cue.startMs}-${i}`}
          word={word}
          appearFrame={(onsets[i] / 1000) * fps}
          active={i === activeIndex}
          colors={colors}
          enterFrames={enterFrames}
          underline={underline}
          underlineThickness={underlineThickness}
          underlineOffset={underlineOffset}
          fontSize={fontSize}
        />
      ))}
    </div>
  );
};

/* ==========================================================================
 * 3) المشاهد الخلفية
 * ========================================================================== */

const MediaCard = ({
  src,
  fit,
  muted,
  box,
  radius,
  placeholderColor,
  shadowOpacity,
}) => (
  <div
    style={{
      position: "absolute",
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      borderRadius: radius,
      overflow: "hidden",
      backgroundColor: placeholderColor,
      // البطاقة في المرجع تكاد تكون مسطّحة على الكريمي: القياس على بُعد
      // بكسلين من حافتها أعطى لون الخلفية نفسه
      boxShadow:
        shadowOpacity > 0
          ? `0 ${box.width * 0.008}px ${box.width * 0.022}px rgba(60, 52, 35, ${shadowOpacity})`
          : "none",
    }}
  >
    {src ? (
      isVideoSource(src) ? (
        <Video
          src={src}
          muted={muted}
          objectFit={fit}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <Img
          src={src}
          style={{ width: "100%", height: "100%", objectFit: fit }}
        />
      )
    ) : null}
  </div>
);

/** كلمات ضخمة، كلٌّ في سطر، تتراكم والأحدث أغمق */
const StackScene = ({
  text,
  appearFrames,
  colors,
  fontSize,
  lineHeight,
  topPx,
  bottomMarginPx,
  maxWidthPx,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const words = toWords(text);
  /**
   * الكلمات كلٌّ في سطر، فطولُ الكتلة عددُها × الخط. سكربتٌ أطول من المقاس
   * المرجعي كان يخرج من أسفل الإطار — الكلمات الأخيرة تُرسم خارج الشاشة —
   * فيُصغَّر الخط حتى تسع الكتلةُ ما بين أعلاها وحافة الإطار، ولا يكبر أبداً
   * عن مقاس المرجع.
   */
  const fitted = Math.min(
    fitToHeight(
      fontSize,
      words.length,
      lineHeight,
      height - topPx - bottomMarginPx,
    ),
    fitToWidth(fontSize, words, maxWidthPx),
  );
  let newest = -1;
  for (let i = 0; i < appearFrames.length; i += 1) {
    if (frame >= appearFrames[i]) newest = i;
  }

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        // الكتلة تبدأ من أعلى ثابت وتنمو لأسفل كلما ظهرت كلمة — هكذا في
        // المرجع: ثلاث كلمات وخمس كلمات تبدآن عند الخط نفسه
        justifyContent: "flex-start",
        paddingTop: topPx,
        flexDirection: "column",
        direction: "rtl",
        fontFamily: FONT_STACK,
      }}
    >
      {words.map((word, index) => {
        const progress = spring({
          frame: frame - (appearFrames[index] ?? 0),
          fps,
          durationInFrames: 8,
          config: { damping: 200, mass: 0.6 },
        });
        return (
          <div
            key={`${word}-${index}`}
            style={{
              fontSize: fitted,
              lineHeight,
              whiteSpace: "nowrap",
              fontWeight: FONT_WEIGHT_BLACK,
              color: index === newest ? colors.font : colors.muted,
              opacity: progress,
              transform: `translateY(${(1 - progress) * fitted * 0.22}px)`,
            }}
          >
            {word}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** بطاقة ملوّنة يتكرّر نصّها — أبرز لقطة في المرجع */
const EchoScene = ({
  text,
  box,
  radius,
  colors,
  fontSize,
  repeatCount,
  textShift,
  shadowOpacity,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame,
    fps,
    durationInFrames: 12,
    config: { damping: 200, mass: 0.7 },
  });
  /**
   * السطر مكرَّر داخل بطاقة محدودة: نصٌّ أطول من المرجع كان يخرج من طرفيها.
   * يُصغَّر حتى يسع عرضَ البطاقة (بهامش) وطولَ تكراراته، ولا يكبر عن المقاس.
   */
  const gapRatio = 0.4;
  const fitted = Math.min(
    fontSize,
    fitToWidth(fontSize, [text], box.width * 0.88),
    fitToHeight(
      fontSize,
      repeatCount + (repeatCount - 1) * gapRatio,
      1.2,
      box.height * 0.86,
    ),
  );

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          borderRadius: radius,
          backgroundColor: colors.echoCard,
          boxShadow:
            shadowOpacity > 0
              ? `0 ${box.width * 0.008}px ${box.width * 0.022}px rgba(60, 52, 35, ${shadowOpacity})`
              : "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          direction: "rtl",
          fontFamily: FONT_STACK,
          fontSize: fitted,
          fontWeight: FONT_WEIGHT_BLACK,
          color: colors.echoText,
          opacity: enter,
          transform: `translateY(${(1 - enter) * box.height * 0.12}px)`,
        }}
      >
        {/* كتلة السطور مرفوعة قليلاً عن مركز البطاقة كما في المرجع */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: fitted * gapRatio,
            transform: `translateY(${textShift * box.height}px)`,
          }}
        >
          {Array.from({ length: repeatCount }, (_, i) => (
            <div key={i} style={{ whiteSpace: "nowrap" }}>
              {text}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ==========================================================================
 * 4) القالب
 * ========================================================================== */

export const Template = ({
  backgroundColor,
  fontColor,
  mutedFontColor,
  accentColor,
  cardPlaceholderColor,
  echoCardColor,
  echoTextColor,
  headline,
  logo,
  logoWidthRatio,
  logoLeftRatio,
  logoTopRatio,
  media,
  mediaFit,
  mediaMuted,
  captions,
  cardWidthRatio,
  cardAspect,
  cardCenterYRatio,
  cardRadiusRatio,
  cardShadowOpacity,
  captionBottomRatio,
  captionWidthRatio,
  captionFontRatio,
  captionLineHeight,
  underlineThicknessRatio,
  underlineOffsetRatio,
  stackFontRatio,
  stackTopRatio,
  stackLineHeight,
  echoFontRatio,
  echoWidthRatio,
  echoAspect,
  echoCenterYRatio,
  echoTextShiftRatio,
  echoRepeatCount,
  wordEnterFrames,
  captionUnderline,
  wordRevealShare,
  voiceover,
  voiceoverVolume,
  clickSfx,
  clickVolume,
  sceneClicks,
  scenes,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  const cardWidth = width * cardWidthRatio;
  const cardHeight = cardWidth / cardAspect;
  const box = {
    left: (width - cardWidth) / 2,
    top: height * cardCenterYRatio - cardHeight / 2,
    width: cardWidth,
    height: cardHeight,
  };
  const radius = cardWidth * cardRadiusRatio;

  // البطاقة الملوّنة صندوقها الخاص: في المرجع أوسع قليلاً وأعلى من بطاقة المقطع
  const echoWidth = width * echoWidthRatio;
  const echoHeight = echoWidth / echoAspect;
  const echoBox = {
    left: (width - echoWidth) / 2,
    top: height * echoCenterYRatio - echoHeight / 2,
    width: echoWidth,
    height: echoHeight,
  };

  // آخر مشهد يتمدّد ليغطي بقية المدة، فلا يبقى فراغ حين يطول الصوت
  const timeline = useMemo(() => {
    const entries = [];
    let cursor = 0;
    scenes.forEach((scene, index) => {
      const last = index === scenes.length - 1;
      const span = last
        ? Math.max(scene.durationInFrames, durationInFrames - cursor)
        : scene.durationInFrames;
      entries.push({ scene, from: cursor, span });
      cursor += span;
    });
    return entries;
  }, [scenes, durationInFrames]);

  /**
   * نصّ المشاهد النصية ولحظات كلماته — مصدرٌ واحد للصورة وللنقرات معاً.
   *
   * المشهد يأخذ المقاطع التي تبدأ في زمنه (لا التي تتداخل معه)، فما عُرض
   * كابشناً في لقطة سابقة لا يُعاد هنا. ولحظات الكلمات تُقرأ من المقاطع
   * نفسها متى وُجدت، فيُكشف الكلام على إيقاع السكربت لا على توزيع منتظم
   * يخالفه — والنقرة تقع مع الكلمة التي تظهر فعلاً.
   */
  const sceneTexts = useMemo(() => {
    const map = new Map();
    timeline.forEach(({ scene, from, span }, index) => {
      if (scene.type !== "stack" && scene.type !== "echo") return;
      const startMs = (from / fps) * 1000;
      const endMs = ((from + span) / fps) * 1000;
      const mine = cuesInWindow(captions, startMs, endMs);
      const fromScript = mine.map((cue) => cue.text).join(" ");
      const text = scene.text || fromScript || headline;
      const words = toWords(text);
      const revealMs = ((span * 0.7) / fps) * 1000;
      const spread = words.map(
        (_, i) => startMs + (revealMs * i) / Math.max(words.length, 1),
      );
      // نصٌّ ثابت كُتب في اللقطة لا توقيتات له، فيوزَّع على مدّتها بانتظام
      const scripted =
        scene.text || mine.length === 0
          ? spread
          : mine.flatMap((cue) => wordOnsetsMs(cue, wordRevealShare));
      /**
       * كلمات المشهد كلّها تُرى فيه: سطرٌ توقيته يمتدّ بعد نهاية اللقطة كان
       * يخفي آخر كلماته (اللقطة تنتهي قبل أن تظهر)، فإن تجاوز آخرُ توقيت
       * حدَّ الكشف ضُغط الجدول كلّه داخله محتفظاً بإيقاع السكربت نسبياً.
       */
      const lastOnset = scripted[scripted.length - 1] ?? startMs;
      const limitMs = startMs + revealMs;
      const onsets =
        lastOnset > limitMs && lastOnset > startMs
          ? scripted.map(
              (ms) =>
                startMs + ((ms - startMs) * revealMs) / (lastOnset - startMs),
            )
          : scripted;
      map.set(index, { text, onsets, ownedCues: new Set(mine) });
    });
    return map;
  }, [timeline, captions, headline, fps, wordRevealShare]);

  /**
   * المقاطع التي تعرضها المشاهد النصية بشكلها الخاص لا تظهر كابشناً أبداً —
   * لا فوق المشهد نفسه ولا في اللقطة التالية إن امتدّ زمنها إليها — وإلا
   * ظهر الكلام مرتين: كلماتٍ ضخمة ثم شريطَ كابشن يعيده.
   */
  const sceneOwnedCues = useMemo(() => {
    const owned = new Set();
    sceneTexts.forEach(({ ownedCues }) =>
      ownedCues.forEach((cue) => owned.add(cue)),
    );
    return owned;
  }, [sceneTexts]);

  // موضع الكابشن يتبع اللقطة الظاهرة إن حدّدت موضعها، وإلا فموضع القالب
  const activeScene = timeline.find(
    (entry) => frame >= entry.from && frame < entry.from + entry.span,
  );
  const captionBottom =
    activeScene?.scene.captionBottomRatio ?? captionBottomRatio;
  /**
   * المشاهد النصية تملك الشاشة وحدها: شريط الكابشن فوق كلماتها الضخمة كان
   * يعرض نصّين معاً. ويُخفى كذلك أيُّ مقطع تعرضه هي بشكلها الخاص، ولو امتدّ
   * زمنه إلى اللقطة التالية، فلا يُقال الكلام مرتين.
   *
   * وبين المتداخلات يُؤخذ أحدثُ مقطعٍ بدأ: المقاطع قد تتداخل بعد التحرير،
   * وأخذُ أوّل مطابق يُبقي سطراً قديماً معروضاً فوق الذي بدأ بعده.
   */
  const activeSceneHasOwnText =
    activeScene?.scene.type === "stack" || activeScene?.scene.type === "echo";
  const activeCue = activeSceneHasOwnText
    ? undefined
    : captions.reduce((best, cue) => {
        if (sceneOwnedCues.has(cue)) return best;
        if (currentMs < cue.startMs || currentMs >= cue.endMs) return best;
        return best === undefined || cue.startMs >= best.startMs ? cue : best;
      }, undefined);

  /**
   * النقرات تتبع كل ما يظهر، لا الكابشن وحده.
   *
   * المرجع ينقر مع كلمات المشهد الضخم ومع دخول البطاقة الملوّنة أيضاً —
   * سُمعت نبضاته هناك عند 14.5 و15.0 و15.2 و16.0 و16.9 — وكان القالب صامتاً
   * في تلك اللحظات لأن الكابشن غائب فيها.
   */
  const clickOnsets = useMemo(() => {
    if (!clickSfx) return [];
    /**
     * الكابشن ينقر لكلماته وحدها. مقاطع المشاهد النصية مستثناة: تلك تنقر من
     * جدول المشهد نفسه أدناه، فجمعُهما كان نقرتين لكل كلمة واحدة تظهر —
     * وحين تُطفأ نقرات المشاهد لا نقرة لها أصلاً لأن كابشنها لا يظهر.
     */
    const onsets = captions
      .filter((cue) => !sceneOwnedCues.has(cue))
      .flatMap((cue) => wordOnsetsMs(cue, wordRevealShare));
    if (!sceneClicks) return onsets.sort((a, b) => a - b);
    timeline.forEach(({ scene, from }, index) => {
      if (scene.clicks === false) return;
      const own = sceneTexts.get(index);
      if (!own) return;
      // الكلمات الضخمة تنقر مع كل كلمة، والبطاقة الملوّنة مع دخولها
      if (scene.type === "stack") onsets.push(...own.onsets);
      if (scene.type === "echo") onsets.push((from / fps) * 1000);
    });
    return onsets.sort((a, b) => a - b);
  }, [
    captions,
    clickSfx,
    wordRevealShare,
    sceneClicks,
    sceneOwnedCues,
    sceneTexts,
    timeline,
    fps,
  ]);

  const colors = {
    font: fontColor,
    muted: mutedFontColor,
    accent: accentColor,
    echoCard: echoCardColor,
    echoText: echoTextColor,
  };

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {voiceover ? (
        <Audio
          src={resolveAsset(voiceover, staticFile)}
          volume={voiceoverVolume}
        />
      ) : null}

      {/* نقرة مع كل كلمة، بنفس جدول ظهورها على الشاشة */}
      <WordClicks
        src={clickSfx}
        volume={clickVolume}
        onsetsMs={clickOnsets}
        fps={fps}
      />

      {timeline.map(({ scene, from, span }, index) => (
        <Sequence
          key={`scene-${index}`}
          from={from}
          durationInFrames={span}
          layout="none"
          name={`${scene.type} #${index + 1}`}
        >
          {scene.type === "media" ? (
            <MediaCard
              /* لكل لقطة مقطعها، وإن خلت أخذت المقطع العام، وإن خلا الاثنان
                 ظهرت البطاقة فارغة — وهو ما يعرضه القالب قبل إرفاق شيء */
              src={
                scene.media
                  ? resolveAsset(scene.media, staticFile)
                  : media
                    ? resolveAsset(media, staticFile)
                    : null
              }
              fit={mediaFit}
              muted={mediaMuted}
              box={box}
              radius={radius}
              placeholderColor={cardPlaceholderColor}
              shadowOpacity={cardShadowOpacity}
            />
          ) : null}

          {scene.type === "stack" ? (
            <StackScene
              text={sceneTexts.get(index)?.text ?? headline}
              // لحظات الكلمات مطلقة، والمشهد داخل Sequence فزمنه محلّي
              appearFrames={(sceneTexts.get(index)?.onsets ?? []).map(
                (ms) => (ms / 1000) * fps - from,
              )}
              colors={colors}
              fontSize={width * stackFontRatio}
              lineHeight={stackLineHeight}
              topPx={height * stackTopRatio}
              bottomMarginPx={height * 0.04}
              maxWidthPx={width * 0.92}
            />
          ) : null}

          {scene.type === "echo" ? (
            <EchoScene
              text={sceneTexts.get(index)?.text ?? headline}
              box={echoBox}
              radius={echoWidth * cardRadiusRatio}
              colors={colors}
              fontSize={width * echoFontRatio}
              repeatCount={echoRepeatCount}
              textShift={echoTextShiftRatio}
              shadowOpacity={cardShadowOpacity}
            />
          ) : null}
        </Sequence>
      ))}

      {/* الكابشن فوق كل المشاهد ويجري بتوقيته من أول الفيديو إلى آخره */}
      {activeCue ? (
        <CaptionLayer
          cue={activeCue}
          colors={colors}
          fontSize={width * captionFontRatio}
          lineHeight={captionLineHeight}
          underlineThickness={
            width * captionFontRatio * underlineThicknessRatio
          }
          underlineOffset={underlineOffsetRatio}
          widthPx={width * captionWidthRatio}
          bottomPx={height * (1 - captionBottom)}
          enterFrames={wordEnterFrames}
          underline={captionUnderline}
          revealShare={wordRevealShare}
        />
      ) : null}

      {/* اللوقو آخر طبقة: يبقى ظاهراً فوق كل شيء كما في المرجع */}
      {logo ? (
        <Img
          src={resolveAsset(logo, staticFile)}
          style={{
            position: "absolute",
            left: width * logoLeftRatio,
            top: height * logoTopRatio,
            width: width * logoWidthRatio,
            objectFit: "contain",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
