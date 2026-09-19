import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio, Video } from "../../lib/media.js";
import { fontStyleOf } from "../../lib/fonts.js";
import { resolveAsset } from "../../lib/asset-url.js";
import { isVideoSource } from "../../lib/duration.js";
import { StyledWords, wordsOf } from "../../lib/text-styles.jsx";

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
  mediaStartMs,
  mediaEndMs,
  mediaAspect,
  mediaCenterXRatio,
  mediaCenterYRatio,
  mediaScale,
  mediaRadiusRatio,
  mediaMuted,
  mediaStyle,
  fontStyle,
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
  clickOnWord,
  clickOnLine,
  clickOnMedia,
}) => {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const font = fontStyleOf(fontStyle);
  /* نافذة المقطع بالفريمات، محصورة داخل طول الفيديو حتى لا تُنشأ لقطة فارغة */
  const mediaFrom = Math.max(0, Math.round((mediaStartMs / 1000) * fps));
  const mediaSpan = Math.max(
    1,
    (mediaEndMs === null || mediaEndMs === undefined
      ? durationInFrames
      : Math.round((mediaEndMs / 1000) * fps)) - mediaFrom,
  );
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

  /**
   * لحظات النقر — تُجمع من مشغّلاتها الثلاثة ثم تُنقّى.
   *
   * التنقية ضرورية لا تجميل: أول كلمة في السطر تقع على بداية السطر نفسه،
   * فتشغيل «مع الكلمة» و«مع السطر» معاً يضاعف النقرة على نفس اللحظة فتُسمع
   * أثقل. والتقريب إلى أقرب فريم هو حدّ التمييز الفعلي — ما دونه لا يُفصل
   * في الرندر أصلاً.
   */
  const clickOnsets = useMemo(() => {
    if (!clickSfx) return [];
    const moments = [];
    if (clickOnWord) {
      moments.push(
        ...cues.flatMap((cue) => wordsOf(cue).map((w) => w.startMs)),
      );
    }
    if (clickOnLine) moments.push(...cues.map((cue) => cue.startMs));
    if (clickOnMedia && media) moments.push(mediaStartMs);
    const seen = new Set();
    return moments
      .filter((ms) => Number.isFinite(ms) && ms >= 0)
      .filter((ms) => {
        const key = Math.round((ms / 1000) * fps);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a - b);
  }, [
    cues,
    clickSfx,
    clickOnWord,
    clickOnLine,
    clickOnMedia,
    media,
    mediaStartMs,
    fps,
  ]);

  const fontSize = width * fontSizeRatio;
  const textWidth = width * textWidthRatio;

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/**
       * المقطع داخل نافذته الزمنية.
       *
       * `Sequence` لا شرطٌ على الفريم: هي التي تجعل زمن المقطع الداخلي يبدأ
       * من ظهوره، فالفيديو يُشغَّل من أوّله لا من منتصفه كما لو كان حاضراً
       * منذ الفريم صفر. وهي كذلك ما يجعل حركة الظهور البطيء تبدأ عنده.
       */}
      {media ? (
        <Sequence
          from={mediaFrom}
          durationInFrames={mediaSpan}
          layout="none"
          name="المقطع"
        >
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
        </Sequence>
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
        <StyledWords
          font={font}
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
