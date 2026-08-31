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

/* ==========================================================================
 * 1) الكلمات
 * ========================================================================== */

/**
 * توقيت كل كلمة صريح دائماً: الستايلات تحتاج لحظة ظهور كل كلمة، وتوزيعها
 * ضمنياً داخل كل ستايل يجعل الأربعة تختلف في التزامن بلا سبب.
 */
const wordsOf = (cue) => {
  const words = cue.text.split(/\s+/u).filter((w) => w.length > 0);
  const given = cue.wordStartsMs ?? [];
  const span = (cue.endMs - cue.startMs) * 0.85;
  return words.map((text, i) => ({
    text,
    startMs: given[i] ?? cue.startMs + (span * i) / Math.max(1, words.length),
  }));
};

const activeIndexOf = (words, currentMs) => {
  let index = -1;
  for (let i = 0; i < words.length; i += 1) {
    if (words[i].startMs <= currentMs) index = i;
  }
  return index;
};

/* ==========================================================================
 * 2) الستايلات
 * ==========================================================================
 * كل ستايل دالة من (الكلمات، اللحظة) إلى عناصر. المشترك بينها — الكلمات
 * ترتّب في مواضعها النهائية والمخفي يُخفى بالشفافية لا بالحذف — مقصود:
 * غيره يجعل الكلمات تقفز كلما ظهرت واحدة جديدة.
 */

const useEnter = (word, enterFrames) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - (word.startMs / 1000) * fps;
  if (enterFrames <= 0) return { opacity: 1, rise: 0, scale: 1 };
  const progress = spring({
    frame: local,
    fps,
    durationInFrames: enterFrames,
    config: { damping: 200, mass: 0.5 },
  });
  return { opacity: progress, rise: (1 - progress) * 14, scale: progress };
};

const Word = ({ word, revealed, active, style, enterFrames, colors }) => {
  const { opacity, rise, scale } = useEnter(word, enterFrames);
  const common = {
    display: "inline-block",
    opacity: revealed ? opacity : 0,
    color: active ? colors.font : colors.muted,
    fontWeight: active ? FONT_WEIGHT_BLACK : FONT_WEIGHT_MEDIUM,
  };

  if (style === "pop") {
    const rest = active ? 1.14 : 1;
    return (
      <span
        style={{
          ...common,
          transform: `translateY(${rise}px) scale(${(0.7 + scale * 0.3) * rest})`,
        }}
      >
        {word.text}
      </span>
    );
  }

  if (style === "underline") {
    return (
      <span
        style={{
          ...common,
          color: active ? colors.font : colors.muted,
          borderBottom: active ? `0.08em solid ${colors.accent}` : "none",
          paddingBottom: "0.04em",
          transform: `translateY(${rise * 0.4}px)`,
        }}
      >
        {word.text}
      </span>
    );
  }

  if (style === "slide") {
    // القناع يقصّ الكلمة وهي صاعدة، فتبدو كأنها تخرج من تحت السطر
    return (
      <span style={{ display: "inline-block", overflow: "hidden" }}>
        <span
          style={{
            ...common,
            transform: `translateY(${revealed ? (1 - scale) * 100 : 100}%)`,
          }}
        >
          {word.text}
        </span>
      </span>
    );
  }

  if (style === "highlight") {
    // الكلمات القادمة ظاهرة أصلاً بلون خافت — كاريوكي الأغاني الكلاسيكي
    return (
      <span
        style={{
          display: "inline-block",
          opacity: revealed ? 1 : 0.28,
          color: active ? colors.accent : revealed ? colors.font : colors.muted,
          fontWeight: active ? FONT_WEIGHT_BLACK : FONT_WEIGHT_MEDIUM,
        }}
      >
        {word.text}
      </span>
    );
  }

  if (style === "gradient") {
    return (
      <span
        style={{
          ...common,
          ...(active
            ? {
                backgroundImage: `linear-gradient(180deg, ${colors.font} 0%, ${colors.accent} 100%)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }
            : {}),
          transform: `translateY(${rise * 0.5}px)`,
        }}
      >
        {word.text}
      </span>
    );
  }

  if (style === "boxed") {
    return (
      <span
        style={{
          ...common,
          color: active ? colors.onAccent : colors.muted,
          backgroundColor: active ? colors.accent : "transparent",
          borderRadius: "0.18em",
          padding: "0 0.14em",
          transform: `translateY(${rise * 0.4}px)`,
        }}
      >
        {word.text}
      </span>
    );
  }

  // karaoke و kinetic: ظهور هادئ في المكان
  return (
    <span style={{ ...common, transform: `translateY(${rise * 0.5}px)` }}>
      {word.text}
    </span>
  );
};

/** سطر واحد ضخم تتحرك فيه الكلمة النشطة إلى المنتصف. */
const KineticLine = ({ words, activeIndex, fontSize, colors, enterFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // إزاحة أفقية ناعمة: الكلمة النشطة تقترب من المنتصف بدل قفزة لكل كلمة
  const shift = interpolate(
    activeIndex,
    [0, Math.max(1, words.length - 1)],
    [0, -1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const eased = spring({
    frame:
      frame - ((words[Math.max(0, activeIndex)]?.startMs ?? 0) / 1000) * fps,
    fps,
    durationInFrames: Math.max(1, enterFrames * 2),
    config: { damping: 200 },
  });
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "baseline",
        gap: fontSize * 0.28,
        whiteSpace: "nowrap",
        transform: `translateX(${shift * eased * fontSize * 0.6}px)`,
      }}
    >
      {words.map((word, i) => (
        <Word
          key={`${i}-${word.startMs}`}
          word={word}
          revealed={i <= activeIndex}
          active={i === activeIndex}
          style="kinetic"
          enterFrames={enterFrames}
          colors={colors}
        />
      ))}
    </div>
  );
};

const TextBlock = ({
  words,
  style,
  revealMode,
  fontSize,
  widthPx,
  colors,
  enterFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  // في وضع الجملة تظهر كلمات المقطع كلها مع أول كلمة، فيكفي توقيت واحد
  // للجملة — وهو ما يجعل تحرير التوقيت لكل جملة على حدة ممكناً أصلاً.
  const wholeCue = revealMode === "cue";
  const activeIndex = wholeCue
    ? words.length - 1
    : activeIndexOf(words, currentMs);
  if (activeIndex < 0) return null;
  const isActive = (i) => (wholeCue ? true : i === activeIndex);
  const cueWords = wholeCue
    ? words.map((w) => ({ ...w, startMs: words[0].startMs }))
    : words;

  if (style === "oneWord") {
    // كلمة واحدة كبيرة في المنتصف: أقصى تركيز، وأنسب للجُمل القصيرة
    const word = cueWords[activeIndex];
    return (
      <div
        style={{
          width: widthPx,
          direction: "rtl",
          fontFamily: FONT_STACK,
          fontSize: fontSize * 1.5,
          fontWeight: FONT_WEIGHT_BLACK,
          color: colors.font,
          textAlign: "center",
        }}
      >
        <Word
          word={word}
          revealed
          active
          style="pop"
          enterFrames={enterFrames}
          colors={colors}
        />
      </div>
    );
  }

  if (style === "stack") {
    // كل كلمة سطر مستقل تتراكم من الأعلى
    return (
      <div
        style={{
          width: widthPx,
          direction: "rtl",
          fontFamily: FONT_STACK,
          fontSize,
          lineHeight: 1.18,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {cueWords.map((word, i) => (
          <Word
            key={`${i}-${word.startMs}`}
            word={word}
            revealed={i <= activeIndex}
            active={isActive(i)}
            style="slide"
            enterFrames={enterFrames}
            colors={colors}
          />
        ))}
      </div>
    );
  }

  if (style === "kinetic") {
    return (
      <div
        style={{
          width: widthPx,
          direction: "rtl",
          fontFamily: FONT_STACK,
          fontSize,
        }}
      >
        <KineticLine
          words={cueWords}
          activeIndex={activeIndex}
          fontSize={fontSize}
          colors={colors}
          enterFrames={enterFrames}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: widthPx,
        direction: "rtl",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignContent: "center",
        columnGap: fontSize * 0.26,
        rowGap: fontSize * 0.18,
        fontFamily: FONT_STACK,
        fontSize,
        lineHeight: 1.25,
        textAlign: "center",
      }}
    >
      {cueWords.map((word, i) => (
        <Word
          key={`${i}-${word.startMs}`}
          word={word}
          revealed={i <= activeIndex}
          active={isActive(i)}
          style={style}
          enterFrames={enterFrames}
          colors={colors}
        />
      ))}
    </div>
  );
};

/* ==========================================================================
 * 3) المقطع
 * ========================================================================== */

/**
 * ستايلات المقطع.
 *
 * كلها من خصائص يرسمها الرندر داخل المتصفح: transform وborder وborder-radius
 * وbox-shadow الأساسي. تجنّبنا filter وclip-path لأنهما يُسقطان هناك بصمت،
 * فيظهر الستايل في المعاينة ويغيب عن الفيديو.
 */
const MEDIA_STYLES = {
  plain: {},
  shadow: { shadow: "0 0.05em 0.12em rgba(20,16,12,0.38)" },
  frame: { border: 0.02, pad: 0 },
  // بولارويد: هامش أبيض وحده — الإطار الملوّن ستايل آخر (frame)
  polaroid: {
    pad: 0.055,
    shadow: "0 0.04em 0.1em rgba(20,16,12,0.3)",
  },
  tilt: { rotate: -3, shadow: "0 0.04em 0.1em rgba(20,16,12,0.34)" },
  offset: { offsetCard: 0.035 },
  circle: { circle: true },
  zoom: { zoom: true },
};

const MediaLayer = ({
  src,
  aspect,
  centerX,
  centerY,
  scale,
  radius,
  muted,
  style,
  accentColor,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const preset = MEDIA_STYLES[style] ?? MEDIA_STYLES.plain;

  const boxWidth = width * scale;
  // الدائرة تفرض صندوقاً مربّعاً: نصف القطر وحده يعطي شكل حبّة دواء لا دائرة
  // حين تختلف النسبة، والمقطع يُقصّ من أطرافه بـ cover كما هو متوقّع.
  const boxHeight = preset.circle ? boxWidth : boxWidth / (aspect ?? 9 / 16);
  const unit = boxWidth; // كل أرقام الستايل نِسب من عرض المقطع، فتصمد بأي مقاس
  const cornerRadius = preset.circle ? boxWidth / 2 : boxWidth * radius;
  const padding = (preset.pad ?? 0) * unit;
  const borderWidth = (preset.border ?? 0) * unit;

  // تكبير بطيء (Ken Burns): يعطي حياة للصورة الثابتة ولقطة بلا حركة
  const zoom = preset.zoom
    ? interpolate(frame, [0, Math.max(1, durationInFrames)], [1, 1.12], {
        extrapolateRight: "clamp",
      })
    : 1;

  const wrapper = {
    position: "absolute",
    left: width * centerX - boxWidth / 2 - padding - borderWidth,
    top: height * centerY - boxHeight / 2 - padding - borderWidth,
    width: boxWidth + (padding + borderWidth) * 2,
    height: boxHeight + (padding + borderWidth) * 2,
    padding: padding + borderWidth,
    boxSizing: "border-box",
    borderRadius: cornerRadius + padding + borderWidth,
    transform: preset.rotate ? `rotate(${preset.rotate}deg)` : undefined,
    backgroundColor:
      preset.pad !== undefined && preset.pad > 0 ? "#FFFFFF" : undefined,
    border:
      borderWidth > 0 ? `${borderWidth}px solid ${accentColor}` : undefined,
    boxShadow: preset.shadow
      ? preset.shadow.replace(
          /([\d.]+)em/gu,
          (_m, n) => `${Number(n) * unit}px`,
        )
      : undefined,
  };

  const clip = {
    width: "100%",
    height: "100%",
    borderRadius: cornerRadius,
    overflow: "hidden",
  };
  const fill = {
    width: "100%",
    height: "100%",
    borderRadius: cornerRadius,
    transform: zoom === 1 ? undefined : `scale(${zoom})`,
  };

  return (
    <>
      {/* بطاقة مزاحة خلف المقطع — عمق بلا ظل */}
      {preset.offsetCard ? (
        <div
          style={{
            position: "absolute",
            left: wrapper.left + unit * preset.offsetCard,
            top: wrapper.top + unit * preset.offsetCard,
            width: wrapper.width,
            height: wrapper.height,
            borderRadius: wrapper.borderRadius,
            backgroundColor: accentColor,
          }}
        />
      ) : null}
      <div style={wrapper}>
        <div style={clip}>
          {isVideoSource(src) ? (
            <Video src={src} muted={muted} objectFit="cover" style={fill} />
          ) : (
            <Img src={src} style={{ ...fill, objectFit: "cover" }} />
          )}
        </div>
      </div>
    </>
  );
};

/* ==========================================================================
 * 4) القالب
 * ========================================================================== */

export const Template = ({
  backgroundColor,
  media,
  mediaAspect,
  mediaCenterXRatio,
  mediaCenterYRatio,
  mediaScale,
  mediaRadiusRatio,
  mediaMuted,
  mediaStyle,
  textStyle,
  revealMode,
  captions,
  headline,
  textCenterXRatio,
  textCenterYRatio,
  textWidthRatio,
  fontSizeRatio,
  fontColor,
  mutedFontColor,
  accentColor,
  wordEnterFrames,
  voiceover,
  voiceoverVolume,
  clickSfx,
  clickVolume,
}) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentMs = (frame / fps) * 1000;

  const cues = useMemo(() => {
    if (captions.length > 0) return captions;
    if (headline.length === 0) return [];
    // بلا كابشن نعرض النص المكتوب بإيقاع ثابت، فيرى المستخدم الستايل فوراً
    const words = headline.split(/\s+/u).filter(Boolean);
    return [
      {
        text: headline,
        startMs: 0,
        endMs: 400 + words.length * 400,
        wordStartsMs: words.map((_, i) => i * 400),
        style: null,
        yRatio: null,
      },
    ];
  }, [captions, headline]);

  const activeCue = cues.find(
    (cue) => currentMs >= cue.startMs && currentMs < cue.endMs,
  );
  // ستايل السطر يغلب ستايل القالب: هكذا يخلط المستخدم تراكماً مع شريط في
  // نفس المقطع. الفارغ يعني «اتبع العام»، لا ستايلاً بلا اسم.
  const activeStyle = activeCue?.style ?? textStyle;
  // وموضعه كذلك: سطر فوق وسطر تحت في نفس المقطع
  const activeY = activeCue?.yRatio ?? textCenterYRatio;
  const words = useMemo(
    () => (activeCue ? wordsOf(activeCue) : []),
    [activeCue],
  );

  const clickOnsets = useMemo(() => {
    if (!clickSfx) return [];
    if (revealMode === "cue") return cues.map((cue) => cue.startMs);
    return cues.flatMap((cue) => wordsOf(cue).map((w) => w.startMs));
  }, [cues, clickSfx, revealMode]);

  const fontSize = width * fontSizeRatio;
  const textWidth = width * textWidthRatio;

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {media ? (
        <MediaLayer
          src={resolveAsset(media, staticFile)}
          aspect={mediaAspect}
          centerX={mediaCenterXRatio}
          centerY={mediaCenterYRatio}
          scale={mediaScale}
          radius={mediaRadiusRatio}
          muted={mediaMuted}
          style={mediaStyle}
          accentColor={accentColor}
          width={width}
          height={height}
        />
      ) : null}

      <div
        style={{
          position: "absolute",
          left: width * textCenterXRatio - textWidth / 2,
          top: height * activeY,
          width: textWidth,
          transform: "translateY(-50%)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <TextBlock
          words={words}
          style={activeStyle}
          revealMode={revealMode}
          fontSize={fontSize}
          widthPx={textWidth}
          enterFrames={wordEnterFrames}
          colors={{
            font: fontColor,
            muted: mutedFontColor,
            accent: accentColor,
            onAccent: backgroundColor,
          }}
        />
      </div>

      {voiceover ? (
        <Audio
          src={resolveAsset(voiceover, staticFile)}
          volume={voiceoverVolume}
        />
      ) : null}

      {clickSfx
        ? clickOnsets.map((onsetMs, i) => (
            <Sequence
              key={`click-${i}-${onsetMs}`}
              from={Math.round((onsetMs / 1000) * fps)}
              layout="none"
            >
              <Audio
                src={resolveAsset(clickSfx, staticFile)}
                volume={clickVolume}
              />
            </Sequence>
          ))
        : null}
    </AbsoluteFill>
  );
};
