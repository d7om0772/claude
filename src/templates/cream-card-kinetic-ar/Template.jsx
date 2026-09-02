import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  interpolateColors,
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
import { WordClicks } from "../../lib/word-clicks.jsx";
import { BASE_HEIGHT, BASE_WIDTH } from "./schema.js";

/**
 * خط القالب هو خط ثمانية — خط المشروع المشترك.
 *
 * الأصل كان يحمّل Tajawal من @remotion/google-fonts. كل قوالب المعرض تشترك
 * في ملفَّي خط داخل public/fonts، فعائلة ثانية تعني تحميلاً إضافياً وخطاً
 * غريباً عن بقية القوالب. الوزنان المتاحان: الأسود 900 والمتوسط 500، وما
 * كان في الأصل 800 يصير أسود لأنه الأقرب.
 */
const fontFamily = FONT_STACK;

/* -------------------------------------------------------------------------- */
/*                                أدوات مساعدة                                 */
/* -------------------------------------------------------------------------- */

/** يحوّل مسار prop إلى رابط صالح: الروابط المطلقة كما هي، والباقي من مجلد public */
/** يمرّ المطلق و blob: كما هو، والنسبي من مجلد public — عبر أداة المشروع */
export const resolveSrc = (src) => resolveAsset(src, staticFile);

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v"];

const isVideoSrc = (src) => {
  const lower = src.split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

/** تقسيم النص إلى كلمات بشكل حتمي (بدون أي اعتماد على اللغة أو الوقت) */
const toWords = (text) => text.split(/\s+/).filter((word) => word.length > 0);

/**
 * لحظات ظهور كلمات السطر بالملي ثانية.
 *
 * التوقيت الصريح — حين يكتبه محرّر الكلمات — يُقدَّم على أي توزيع، وإلا
 * وُزّعت الكلمات على نسبة `revealShare` من مدّة السطر ويبقى الباقي وقت قراءة.
 * تُستعمل للرسم وللنقرات معاً، فلا يفترقان.
 */
export const wordOnsetsMs = (cue, revealShare) => {
  const words = toWords(cue.text);
  if (words.length === 0) return [];
  const explicit = cue.wordStartsMs ?? [];
  if (explicit.length >= words.length) {
    return explicit.slice(0, words.length);
  }
  const span = Math.max(cue.endMs - cue.startMs, 1) * revealShare;
  return words.map((_, i) => cue.startMs + (span * i) / words.length);
};

/** ظهور الكلمة: شفافية + إزاحة رأسية بسيطة، 5 فريمات في الأصل */
const wordEntrance = (frame, appearAt, durationInFrames) => {
  const opacity = interpolate(
    frame,
    [appearAt, appearAt + durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const translateY = interpolate(
    frame,
    [appearAt, appearAt + durationInFrames],
    [6, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return { opacity, translateY };
};

/* -------------------------------------------------------------------------- */
/*                                 كرت المقطع                                  */
/* -------------------------------------------------------------------------- */

const MediaCard = ({
  media,
  mediaFit,
  mediaMuted,
  placeholderColor,
  width,
  height,
  radius,
  children,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: (BASE_WIDTH - width) / 2,
        top: (BASE_HEIGHT - height) / 2,
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        backgroundColor: placeholderColor,
        // ظل خفيف جداً — الكرت في الأصل يكاد يكون مسطحاً على الخلفية الكريمية
        boxShadow: "0 10px 34px rgba(60, 52, 35, 0.16)",
      }}
    >
      {!media ? null : isVideoSrc(media) ? (
        <Video
          src={resolveSrc(media)}
          muted={mediaMuted}
          objectFit={mediaFit}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <Img
          src={resolveSrc(media)}
          style={{ width: "100%", height: "100%", objectFit: mediaFit }}
        />
      )}
      {children}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  الكابشن                                    */
/* -------------------------------------------------------------------------- */

const CaptionLayer = ({
  cue,
  globalFrame,
  fps,
  placement,
  fontColor,
  mutedFontColor,
  accentColor,
  insideColor,
  fontSizeAbove,
  fontSizeInside,
  underline,
  motionSpeed,
  revealShare,
}) => {
  const words = toWords(cue.text);
  if (words.length === 0) {
    return null;
  }

  const startFrame = (cue.startMs / 1000) * fps;
  const endFrame = (cue.endMs / 1000) * fps;
  const cueDuration = Math.max(endFrame - startFrame, 1);

  // الكلمات تنتهي قبل نهاية السطر بنسبة ثابتة حتى يبقى وقت قراءة
  const revealSpan = cueDuration * revealShare;
  const step = revealSpan / words.length;
  // توقيت صريح لكل كلمة حين يوفّره المحرّر — أدقّ من أي توزيع
  const appearFrames = wordOnsetsMs(cue, revealShare).map(
    (ms) => (ms / 1000) * fps,
  );

  // السطر يبدأ باهتاً ثم "يدفأ" خلال 0.45 ثانية — سلوك مأخوذ من الأصل
  const warmDuration = (0.45 * fps) / motionSpeed;
  const warmth = interpolate(
    globalFrame,
    [startFrame, startFrame + warmDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const lineColor =
    placement === "inside"
      ? insideColor
      : interpolateColors(warmth, [0, 1], [mutedFontColor, fontColor]);

  const activeIndex = Math.min(
    Math.floor((globalFrame - startFrame) / step),
    words.length - 1,
  );

  const fontSize = placement === "above" ? fontSizeAbove : fontSizeInside;

  const containerStyle =
    placement === "above"
      ? {
          position: "absolute",
          left: (BASE_WIDTH - 900) / 2,
          top: 96, // فوق الكرت مباشرة، مطابق للفيديو المرجعي
          width: 900,
        }
      : {
          position: "absolute",
          left: 70,
          right: 70,
          top: 70,
        };

  return (
    <div
      style={{
        ...containerStyle,
        direction: "rtl",
        textAlign: "center",
        fontFamily,
        fontSize,
        lineHeight: 1.5,
        fontWeight:
          placement === "inside" ? FONT_WEIGHT_BLACK : FONT_WEIGHT_MEDIUM,
        color: lineColor,
        textShadow:
          placement === "inside" ? "0 3px 14px rgba(0,0,0,0.55)" : "none",
      }}
    >
      {words.map((word, index) => {
        const appearAt = appearFrames[index] ?? startFrame + index * step;
        const { opacity, translateY } = wordEntrance(
          globalFrame,
          appearAt,
          Math.max(5 / motionSpeed, 1), // 5 فريمات في الأصل، تتأثر بسرعة الحركة
        );
        const isActive = index === activeIndex;
        // مسح الخط الذهبي من جهة البداية (يمين في العربية) خلال 7 فريمات
        const underlineScale = interpolate(
          globalFrame,
          [appearAt, appearAt + 7 / motionSpeed],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        return (
          <span
            key={`${cue.startMs}-${index}`}
            style={{
              display: "inline-block",
              position: "relative",
              margin: "0 6px",
              opacity,
              transform: `translateY(${translateY}px)`,
              fontWeight:
                isActive && placement === "above"
                  ? FONT_WEIGHT_BLACK
                  : undefined,
              color: isActive && placement === "above" ? fontColor : undefined,
            }}
          >
            {word}
            {underline && isActive && placement === "above" ? (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: -11,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: accentColor,
                  transform: `scaleX(${underlineScale})`,
                  transformOrigin: "right",
                }}
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                            مشهد الكلمات المتراكمة                           */
/* -------------------------------------------------------------------------- */

const WordStackScene = ({
  text,
  fontColor,
  mutedColor,
  fontSize,
  motionSpeed,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = toWords(text);

  // الكلمات تتوزع على 70% من المشهد ليبقى وقت يُقرأ فيه السطر كاملاً
  const step = words.length > 0 ? (durationInFrames * 0.7) / words.length : 1;

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 26,
        direction: "rtl",
        fontFamily,
      }}
    >
      {words.map((word, index) => {
        const appearAt = index * step;
        const progress = spring({
          frame: Math.max((frame - appearAt) * motionSpeed, 0),
          fps,
          config: { damping: 200, mass: 0.6 },
        });
        const translateY = interpolate(progress, [0, 1], [26, 0]);
        const isNewest =
          index === Math.min(Math.floor(frame / step), words.length - 1);

        return (
          <div
            key={`${word}-${index}`}
            style={{
              fontSize,
              fontWeight: FONT_WEIGHT_BLACK,
              // الكلمة الأحدث داكنة، وما قبلها يرتد إلى اللون الخافت
              color: isNewest ? fontColor : mutedColor,
              opacity: progress,
              transform: `translateY(${translateY}px)`,
            }}
          >
            {word}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------------------- */
/*                          مشهد الكرت الملوّن بأثر الحركة                      */
/* -------------------------------------------------------------------------- */

const ColorCardScene = ({
  text,
  cardColor,
  textColor,
  fontSize,
  radius,
  width,
  height,
  enterFrom,
  trailIntensity,
  motionSpeed,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // دخول الكرت: نابض قصير ~0.5 ثانية، هو اللقطة الأبرز في القالب
  const enter = spring({
    frame: Math.max(frame * motionSpeed, 0),
    fps,
    config: { damping: 200, mass: 0.7 },
  });

  const offset = interpolate(enter, [0, 1], [140, 0]);
  const axis =
    enterFrom === "bottom" || enterFrom === "top" ? "translateY" : "translateX";
  const sign = enterFrom === "bottom" || enterFrom === "start" ? 1 : -1;

  // أثر الحركة: نسختان خلف النص تتأخران وتختفيان خلال 15 فريم
  const trailProgress = interpolate(frame, [0, 15 / motionSpeed], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ghosts = [
    { distance: 96, baseOpacity: 0.5 },
    { distance: 192, baseOpacity: 0.32 },
  ];

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: (BASE_WIDTH - width) / 2,
          top: (BASE_HEIGHT - height) / 2,
          width,
          height,
          borderRadius: radius,
          backgroundColor: cardColor,
          boxShadow: "0 12px 34px rgba(60, 52, 35, 0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: enter,
          transform: `${axis}(${offset * sign}px)`,
        }}
      >
        <div
          style={{
            position: "relative",
            direction: "rtl",
            textAlign: "center",
            fontFamily,
            fontSize,
            fontWeight: FONT_WEIGHT_BLACK,
            lineHeight: 1.35,
            color: textColor,
          }}
        >
          {ghosts.map((ghost, index) => (
            <div
              key={`ghost-${index}`}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                opacity:
                  ghost.baseOpacity * (1 - trailProgress) * trailIntensity,
                transform: `translateY(${
                  ghost.distance * (1 - trailProgress)
                }px)`,
              }}
            >
              {text}
            </div>
          ))}
          <div>{text}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------------------- */
/*                            مشهد الكلمة المظللة                              */
/* -------------------------------------------------------------------------- */

const HighlightWordScene = ({
  text,
  highlightIndex,
  fontColor,
  accentColor,
  boxTextColor,
  fontSize,
  motionSpeed,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const words = toWords(text);
  const step = words.length > 0 ? (durationInFrames * 0.45) / words.length : 1;

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 14,
        direction: "rtl",
        fontFamily,
        fontSize,
        fontWeight: FONT_WEIGHT_BLACK,
        color: fontColor,
      }}
    >
      {words.map((word, index) => {
        const appearAt = index * step;
        const opacity = interpolate(
          frame,
          [appearAt, appearAt + 5 / motionSpeed],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const isBoxed = index === highlightIndex;
        // المربع الذهبي ينفتح من جهة البداية خلال 8 فريمات
        const boxScale = interpolate(
          frame,
          [appearAt, appearAt + 8 / motionSpeed],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        return (
          <span
            key={`${word}-${index}`}
            style={{ position: "relative", opacity }}
          >
            {isBoxed ? (
              <span
                style={{
                  position: "absolute",
                  inset: "-6px -20px -12px",
                  borderRadius: 10,
                  backgroundColor: accentColor,
                  transform: `scaleX(${boxScale})`,
                  transformOrigin: "right",
                }}
              />
            ) : null}
            <span
              style={{
                position: "relative",
                color: isBoxed ? boxTextColor : fontColor,
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------------------- */
/*                               المكوّن الرئيسي                                */
/* -------------------------------------------------------------------------- */

export const Template = (props) => {
  const {
    backgroundColor,
    fontColor,
    mutedFontColor,
    accentColor,
    cardPlaceholderColor,
    colorCardBackground,
    colorCardTextColor,
    captionInsideColor,
    headline,
    subheadline,
    logo,
    logoWidth,
    media,
    mediaFit,
    mediaMuted,
    voiceover,
    clickSfx,
    clickVolume,
    captions,
    cardWidthRatio,
    cardAspectRatio,
    cardCornerRadius,
    captionFontSize,
    captionInsideFontSize,
    headlineFontSize,
    colorCardFontSize,
    highlightFontSize,
    motionSpeed,
    colorCardEnterFrom,
    trailIntensity,
    captionUnderline,
    wordRevealShare,
    scenes,
  } = props;

  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();

  // اللوحة الأساسية 1080×1920 تُحجَّم لأي مقاس تركيبة دون تشويه
  const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);

  const cardWidth = BASE_WIDTH * cardWidthRatio;
  const cardHeight = cardWidth / cardAspectRatio;

  const timeline = useMemo(() => {
    const entries = [];
    let cursor = 0;
    scenes.forEach((scene, index) => {
      const isLast = index === scenes.length - 1;
      // آخر مشهد يتمدد ليغطي بقية طول الصوت إن كان أطول من مجموع المشاهد
      const sceneDuration = isLast
        ? Math.max(scene.durationInFrames, durationInFrames - cursor)
        : scene.durationInFrames;
      entries.push({ scene, from: cursor, durationInFrames: sceneDuration });
      cursor += sceneDuration;
    });
    return entries;
  }, [scenes, durationInFrames]);

  const currentMs = (frame / fps) * 1000;
  const activeCue = captions.find(
    (cue) => currentMs >= cue.startMs && currentMs < cue.endMs,
  );

  const fallbackText = subheadline ?? headline;

  const clickOnsets = useMemo(
    () =>
      clickSfx
        ? captions.flatMap((cue) => wordOnsetsMs(cue, wordRevealShare))
        : [],
    [captions, clickSfx, wordRevealShare],
  );

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {voiceover ? <Audio src={resolveSrc(voiceover)} /> : null}

      {/* نقرة مع كل كلمة تظهر، بنفس جدول ظهورها على الشاشة */}
      <WordClicks
        src={clickSfx}
        volume={clickVolume}
        onsetsMs={clickOnsets}
        fps={fps}
      />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "relative",
            width: BASE_WIDTH,
            height: BASE_HEIGHT,
            flexShrink: 0,
            transform: `scale(${scale})`,
            backgroundColor,
            overflow: "hidden",
          }}
        >
          {timeline.map((entry, index) => {
            const { scene, from, durationInFrames: sceneDuration } = entry;

            return (
              <Sequence
                key={`scene-${index}`}
                from={from}
                durationInFrames={sceneDuration}
                name={`${scene.type} #${index + 1}`}
              >
                {scene.type === "mediaCaption" ? (
                  <AbsoluteFill>
                    <MediaCard
                      media={media}
                      mediaFit={mediaFit}
                      mediaMuted={mediaMuted}
                      placeholderColor={cardPlaceholderColor}
                      width={cardWidth}
                      height={cardHeight}
                      radius={cardCornerRadius}
                    >
                      {activeCue !== undefined &&
                      scene.captionPlacement === "inside" ? (
                        <CaptionLayer
                          cue={activeCue}
                          globalFrame={frame}
                          fps={fps}
                          placement="inside"
                          fontColor={fontColor}
                          mutedFontColor={mutedFontColor}
                          accentColor={accentColor}
                          insideColor={captionInsideColor}
                          fontSizeAbove={captionFontSize}
                          fontSizeInside={captionInsideFontSize}
                          underline={captionUnderline}
                          motionSpeed={motionSpeed}
                          revealShare={wordRevealShare}
                        />
                      ) : null}
                    </MediaCard>
                    {activeCue !== undefined &&
                    scene.captionPlacement === "above" ? (
                      <CaptionLayer
                        cue={activeCue}
                        globalFrame={frame}
                        fps={fps}
                        placement="above"
                        fontColor={fontColor}
                        mutedFontColor={mutedFontColor}
                        accentColor={accentColor}
                        insideColor={captionInsideColor}
                        fontSizeAbove={captionFontSize}
                        fontSizeInside={captionInsideFontSize}
                        underline={captionUnderline}
                        motionSpeed={motionSpeed}
                        revealShare={wordRevealShare}
                      />
                    ) : null}
                  </AbsoluteFill>
                ) : null}

                {scene.type === "wordStack" ? (
                  <WordStackScene
                    text={scene.text ?? headline}
                    fontColor={fontColor}
                    mutedColor={mutedFontColor}
                    fontSize={headlineFontSize}
                    motionSpeed={motionSpeed}
                    durationInFrames={sceneDuration}
                  />
                ) : null}

                {scene.type === "colorCard" ? (
                  <ColorCardScene
                    text={scene.text ?? fallbackText}
                    cardColor={colorCardBackground}
                    textColor={colorCardTextColor}
                    fontSize={colorCardFontSize}
                    radius={cardCornerRadius}
                    width={cardWidth}
                    // الكرت الملوّن أقصر من كرت المقطع بنسبة ثابتة في الأصل
                    height={cardHeight * 0.768}
                    enterFrom={colorCardEnterFrom}
                    trailIntensity={trailIntensity}
                    motionSpeed={motionSpeed}
                  />
                ) : null}

                {scene.type === "highlightWord" ? (
                  <HighlightWordScene
                    text={scene.text ?? fallbackText}
                    highlightIndex={scene.highlightIndex}
                    fontColor={fontColor}
                    accentColor={accentColor}
                    boxTextColor={backgroundColor}
                    fontSize={highlightFontSize}
                    motionSpeed={motionSpeed}
                    durationInFrames={sceneDuration}
                  />
                ) : null}
              </Sequence>
            );
          })}

          {logo ? (
            <Img
              src={resolveSrc(logo)}
              style={{
                position: "absolute",
                left: (BASE_WIDTH - logoWidth) / 2,
                bottom: 70,
                width: logoWidth,
                opacity: 0.85,
              }}
            />
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
