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
 * لحظات ظهور كلمات السطر بالملي ثانية.
 *
 * التوقيت الصريح — الذي يكتبه محرّر الكلمات أو يأتي من ملف SRT على مستوى
 * الكلمة — يُقدَّم على أي توزيع. وإلا وُزّعت الكلمات على نسبة من مدّة السطر
 * ويبقى الباقي وقت قراءة، كما في الفيديو المرجعي.
 *
 * تُستعمل للرسم وللنقرات معاً، فلا ينفصل الصوت عن الصورة.
 */
/**
 * نص كل مقاطع الكابشن التي تتداخل مع نافذة زمنية.
 *
 * مشهدَا stack وecho لا نصّ مستقلاً لهما: تعديل السكربت (مقاطع الكابشن) هو
 * ما يُفترض أن يغيّر ما يظهر فيهما، لا حقل `text` منفصل يظل كما هو مهما
 * عُدِّل السكربت. الفراغ لو لم تتداخل نافذة المشهد مع أي مقطع.
 */
const textForWindow = (captions, startMs, endMs) =>
  captions
    .filter((cue) => cue.startMs < endMs && cue.endMs > startMs)
    .map((cue) => cue.text)
    .join(" ");

export const wordOnsetsMs = (cue, revealShare) => {
  const words = toWords(cue.text);
  if (words.length === 0) return [];
  const explicit = cue.wordStartsMs ?? [];
  if (explicit.length >= words.length) return explicit.slice(0, words.length);
  const span = Math.max(cue.endMs - cue.startMs, 1) * revealShare;
  return words.map((_, i) => cue.startMs + (span * i) / words.length);
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
  colors,
  fontSize,
  lineHeight,
  topPx,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = toWords(text);
  const step = words.length > 0 ? (durationInFrames * 0.7) / words.length : 1;
  const newest = Math.min(Math.floor(frame / step), words.length - 1);

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
          frame: frame - index * step,
          fps,
          durationInFrames: 8,
          config: { damping: 200, mass: 0.6 },
        });
        return (
          <div
            key={`${word}-${index}`}
            style={{
              fontSize,
              lineHeight,
              fontWeight: FONT_WEIGHT_BLACK,
              color: index === newest ? colors.font : colors.muted,
              opacity: progress,
              transform: `translateY(${(1 - progress) * fontSize * 0.22}px)`,
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
          fontSize,
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
            gap: fontSize * 0.4,
            transform: `translateY(${textShift * box.height}px)`,
          }}
        >
          {Array.from({ length: repeatCount }, (_, i) => (
            <div key={i}>{text}</div>
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

  // موضع الكابشن يتبع اللقطة الظاهرة إن حدّدت موضعها، وإلا فموضع القالب
  const activeScene = timeline.find(
    (entry) => frame >= entry.from && frame < entry.from + entry.span,
  );
  const captionBottom =
    activeScene?.scene.captionBottomRatio ?? captionBottomRatio;
  /**
   * مشهدا stack وecho يعرضان نصّ الكابشن نفسه بشكلهما الخاص (كلمات ضخمة، أو
   * سطر متكرّر داخل بطاقة) — فظهور شريط الكابشن الصغير فوقهما كان يكرّر
   * النص مرتين على الشاشة معاً بدل أن يحلّ أحدهما محلّ الآخر.
   */
  const activeSceneHasOwnText =
    activeScene?.scene.type === "stack" || activeScene?.scene.type === "echo";
  const activeCue = activeSceneHasOwnText
    ? undefined
    : captions.find((cue) => currentMs >= cue.startMs && currentMs < cue.endMs);

  /**
   * النقرات تتبع كل ما يظهر، لا الكابشن وحده.
   *
   * المرجع ينقر مع كلمات المشهد الضخم ومع دخول البطاقة الملوّنة أيضاً —
   * سُمعت نبضاته هناك عند 14.5 و15.0 و15.2 و16.0 و16.9 — وكان القالب صامتاً
   * في تلك اللحظات لأن الكابشن غائب فيها.
   */
  const clickOnsets = useMemo(() => {
    if (!clickSfx) return [];
    const onsets = captions.flatMap((cue) =>
      wordOnsetsMs(cue, wordRevealShare),
    );
    if (!sceneClicks) return onsets;
    for (const { scene, from, span } of timeline) {
      if (scene.clicks === false) continue;
      const startMs = (from / fps) * 1000;
      if (scene.type === "stack") {
        const endMs = ((from + span) / fps) * 1000;
        const words = toWords(
          scene.text || textForWindow(captions, startMs, endMs) || headline,
        );
        const step = words.length > 0 ? (span * 0.7) / words.length : 1;
        words.forEach((_, i) => onsets.push(startMs + (i * step * 1000) / fps));
      }
      if (scene.type === "echo") onsets.push(startMs);
    }
    return onsets.sort((a, b) => a - b);
  }, [
    captions,
    clickSfx,
    wordRevealShare,
    sceneClicks,
    timeline,
    fps,
    headline,
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
              text={
                scene.text ||
                textForWindow(
                  captions,
                  (from / fps) * 1000,
                  ((from + span) / fps) * 1000,
                ) ||
                headline
              }
              colors={colors}
              fontSize={width * stackFontRatio}
              lineHeight={stackLineHeight}
              topPx={height * stackTopRatio}
              durationInFrames={span}
            />
          ) : null}

          {scene.type === "echo" ? (
            <EchoScene
              text={
                scene.text ||
                textForWindow(
                  captions,
                  (from / fps) * 1000,
                  ((from + span) / fps) * 1000,
                ) ||
                headline
              }
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
