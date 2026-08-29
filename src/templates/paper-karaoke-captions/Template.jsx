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
import { FPS, HEIGHT, WIDTH, defaultProps } from "./schema.js";
import { contentDurationInFrames, isVideoSource } from "../../lib/duration.js";
import { resolveAsset } from "../../lib/asset-url.js";
import {
  FONT_STACK,
  FONT_WEIGHT_BLACK,
  FONT_WEIGHT_MEDIUM,
} from "../../lib/fonts.js";
/** وزن الكلمة النشطة: Black. الأصل استعمل Black لأن Bold ما يعطي تبايناً كافياً. */
const WEIGHT_ACTIVE = FONT_WEIGHT_BLACK;
/** وزن الكلمات السابقة: Medium. */
const WEIGHT_PAST = FONT_WEIGHT_MEDIUM;
/* ==========================================================================
 * 2) دوال مساعدة نقية (deterministic — لا عشوائية ولا وقت نظام)
 * ========================================================================== */
/** لو ما فيه captions نبني واحدة من headline بإيقاع ثابت. */
export const resolveCaptions = (headline, captions, intervalMs) => {
  if (captions.length > 0) {
    return captions;
  }
  const words = headline.split(/\s+/u).filter((w) => w.length > 0);
  return words.map((text, index) => ({
    text,
    startMs: index * intervalMs,
    endMs: (index + 1) * intervalMs,
  }));
};
/** آخر ملي ثانية في المقطع = نهاية آخر كلمة. */
const lastCaptionEndMs = (captions) =>
  captions.reduce((max, c) => Math.max(max, c.endMs), 0);
// اكتشاف الفيديو والمدة مشتركان في lib/duration — يتعاملان مع blob URL
// الذي تنتجه الواجهة عند رفع ملف، وهو بلا امتداد في مساره.
/**
 * يحدّد الكلمة النشطة:
 * أولاً الكلمة اللي الوقت الحالي داخل نافذتها، وإلا آخر كلمة ظهرت.
 * (في التوقيتات الافتراضية endMs = startMs التالية، فالنتيجة وحدة في الحالتين.)
 */
const findActiveIndex = (captions, currentMs) => {
  const inWindow = captions.findIndex(
    (c) => currentMs >= c.startMs && currentMs < c.endMs,
  );
  if (inWindow !== -1) {
    return inWindow;
  }
  let lastRevealed = -1;
  for (let i = 0; i < captions.length; i++) {
    const caption = captions[i];
    if (caption !== undefined && currentMs >= caption.startMs) {
      lastRevealed = i;
    }
  }
  return lastRevealed;
};
const Word = ({
  caption,
  index,
  activeIndex,
  currentMs,
  fontColor,
  pastWordColor,
  enterStyle,
  enterDurationInFrames,
  riseDistancePx,
  glowStrength,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const revealed = currentMs >= caption.startMs;
  const isActive = index === activeIndex;
  // فريم بداية الكلمة، لحساب الحركة المحلية.
  const startFrame = (caption.startMs / 1000) * fps;
  const localFrame = frame - startFrame;
  let opacity = 1;
  let translateY = 0;
  if (revealed && enterStyle !== "cut" && enterDurationInFrames > 0) {
    if (enterStyle === "fade") {
      opacity = interpolate(localFrame, [0, enterDurationInFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else {
      // rise: spring مخمود (damping عالي) عشان يوصل بدون ارتداد
      const progress = spring({
        frame: localFrame,
        fps,
        durationInFrames: enterDurationInFrames,
        config: { damping: 200, mass: 0.6 },
      });
      opacity = progress;
      translateY = interpolate(progress, [0, 1], [riseDistancePx, 0]);
    }
  }
  // ظِل نصي خفيف للتوهّج — 0 يعني مطفي تماماً (السلوك الأصلي).
  const textShadow =
    isActive && glowStrength > 0
      ? `0 0 ${glowStrength * 24}px ${fontColor}`
      : "none";
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        // الشبح: يحجز عرض الكلمة بوزن Black دائماً، فما تتزحزح الكلمات
        // لما يتغيّر الوزن من Black إلى Medium. هذا سلوك اللقطة الأصلية:
        // كل كلمة لها موقع ثابت من أول فريم.
        fontWeight: WEIGHT_ACTIVE,
      }}
    >
      {/* opacity لا visibility: الرندر داخل المتصفح يعيد بناء الصفحة على
          canvas ولا يفهم إلا display:none — فالمخفي بـ visibility يُرسم. */}
      <span style={{ opacity: 0 }} aria-hidden>
        {caption.text}
      </span>

      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          textAlign: "center",
          fontWeight: isActive ? WEIGHT_ACTIVE : WEIGHT_PAST,
          color: isActive ? fontColor : pastWordColor,
          opacity: revealed ? opacity : 0,
          transform: `translateY(${translateY}px)`,
          textShadow,
        }}
      >
        {caption.text}
      </span>
    </span>
  );
};
/* ==========================================================================
 * 4) المكوّن الرئيسي
 * ========================================================================== */
export const Template = ({
  backgroundColor,
  fontColor,
  pastWordColor,
  logo,
  logoWidthRatio,
  logoCenterYRatio,
  headline,
  subheadline,
  captions,
  fallbackWordIntervalMs,
  fontSizeRatio,
  lineHeightRatio,
  captionTopRatio,
  maxTextWidthRatio,
  wordGapEm,
  enterStyle,
  enterDurationInFrames,
  riseDistanceRatio,
  glowStrength,
  media,
  mediaFit,
  mediaOpacity,
  voiceover,
  voiceoverVolume,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const resolved = useMemo(
    () => resolveCaptions(headline, captions, fallbackWordIntervalMs),
    [headline, captions, fallbackWordIntervalMs],
  );
  const activeIndex = findActiveIndex(resolved, currentMs);
  // كل المقاسات مشتقّة من أبعاد الإطار، فالقالب يشتغل على أي دقّة أو نسبة.
  const fontSize = height * fontSizeRatio;
  const lineHeightPx = fontSize * lineHeightRatio;
  const riseDistancePx = height * riseDistanceRatio;
  // تصفية وفق دليل ثمانية: لا في نص طويل، ولا في كلمتين متجاورتين، ولا بكثرة،
  // ولا على كلمة لا بديل ممتد لحرفها الأخير.
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* ---------- الطبقة 1: الوسائط (اختيارية، خلف كل شي) ---------- */}
      {media === null ? null : (
        <Sequence name="media" from={0}>
          <AbsoluteFill style={{ opacity: mediaOpacity }}>
            {isVideoSource(media) ? (
              <Video
                src={resolveAsset(media, staticFile)}
                style={{ width: "100%", height: "100%", objectFit: mediaFit }}
              />
            ) : (
              <Img
                src={resolveAsset(media, staticFile)}
                style={{ width: "100%", height: "100%", objectFit: mediaFit }}
              />
            )}
          </AbsoluteFill>
        </Sequence>
      )}

      {/* ---------- الطبقة 2: الشعار ---------- */}
      {logo === null ? null : (
        <Sequence name="logo" from={0}>
          <AbsoluteFill
            style={{
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            <Img
              src={resolveAsset(logo, staticFile)}
              style={{
                position: "absolute",
                width: width * logoWidthRatio,
                top: height * logoCenterYRatio,
                transform: "translateY(-50%)",
                objectFit: "contain",
              }}
            />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* ---------- الطبقة 3: الكابشن كلمة-بكلمة ---------- */}
      <Sequence name="captions" from={0}>
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              top: height * captionTopRatio,
              left: "50%",
              transform: "translateX(-50%)",
              width: width * maxTextWidthRatio,
              direction: "rtl",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignContent: "flex-start",
              columnGap: fontSize * wordGapEm,
              rowGap: 0,
              fontFamily: FONT_STACK,
              fontSize,
              lineHeight: `${lineHeightPx}px`,
            }}
          >
            {resolved.map((caption, index) => (
              <Word
                // المفتاح يشمل التوقيت عشان يفضل ثابتاً حتى لو تكرّرت الكلمة
                key={`${index}-${caption.startMs}-${caption.text}`}
                caption={caption}
                index={index}
                activeIndex={activeIndex}
                currentMs={currentMs}
                fontColor={fontColor}
                pastWordColor={pastWordColor}
                enterStyle={enterStyle}
                enterDurationInFrames={enterDurationInFrames}
                riseDistancePx={riseDistancePx}
                glowStrength={glowStrength}
              />
            ))}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ---------- الطبقة 4: السطر الثانوي ---------- */}
      {subheadline === null || subheadline.length === 0 ? null : (
        <Sequence name="subheadline" from={0}>
          <AbsoluteFill>
            <div
              style={{
                position: "absolute",
                // يجلس تحت كتلة الكابشن بمسافة سطرين
                top: height * captionTopRatio + lineHeightPx * 2.6,
                left: "50%",
                transform: "translateX(-50%)",
                width: width * maxTextWidthRatio,
                direction: "rtl",
                textAlign: "center",
                fontFamily: FONT_STACK,
                fontWeight: WEIGHT_PAST,
                fontSize: fontSize * 0.46,
                lineHeight: `${fontSize * 0.7}px`,
                color: pastWordColor,
              }}
            >
              {subheadline}
            </div>
          </AbsoluteFill>
        </Sequence>
      )}

      {/* ---------- الطبقة 5: التعليق الصوتي ---------- */}
      {voiceover === null ? null : (
        <Audio
          src={resolveAsset(voiceover, staticFile)}
          volume={voiceoverVolume}
        />
      )}
    </AbsoluteFill>
  );
};
/* ==========================================================================
 * 5) حساب المدة من المحتوى
 * ========================================================================== */
export const calculateTemplateMetadata = async ({ props }) => {
  const resolved = resolveCaptions(
    props.headline,
    props.captions,
    props.fallbackWordIntervalMs,
  );
  return {
    durationInFrames: await contentDurationInFrames({
      fps: FPS,
      voiceover: props.voiceover
        ? resolveAsset(props.voiceover, staticFile)
        : null,
      media: props.media ? resolveAsset(props.media, staticFile) : null,
      captions: resolved,
      captionTailFrames: props.tailDurationInFrames,
      fallbackInFrames: FPS,
    }),
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
  };
};
export { defaultProps };
