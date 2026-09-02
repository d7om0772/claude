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
import { contentDurationInFrames } from "../../lib/duration.js";
import { resolveAsset } from "../../lib/asset-url.js";
import {
  FONT_STACK,
  FONT_WEIGHT_BLACK,
  FONT_WEIGHT_MEDIUM,
} from "../../lib/fonts.js";
import { WordClicks, cueWordOnsets } from "../../lib/word-clicks.jsx";
/* ------------------------------------------------------------------ *
 *  مساحة التصميم المرجعية
 *  كل الإحداثيات مكتوبة داخل مساحة 1080×1920 ثم تُقاس على أبعاد الفيديو
 *  الفعلية عبر معامل واحد، فيتكيّف القالب مع أي مقاس دون إعادة ضبط.
 * ------------------------------------------------------------------ */
const REF_W = 1080;
const REF_H = 1920;
/** إحداثيات العناصر داخل المساحة المرجعية (مقيسة من التصميم الأصلي). */
const LAYOUT = {
  card: { left: 217, top: 237, width: 771, height: 1376 },
  logo: { top: 290, width: 148, height: 145 },
  media: { left: 307, top: 482, width: 589, height: 875 },
  headline: { top: 1392, fontSize: 52, lineHeight: 62 },
  subheadline: { top: 1462, fontSize: 30, lineHeight: 40 },
  caption: { bottom: 150, fontSize: 42, paddingX: 34, paddingY: 16 },
};
/* ------------------------------------------------------------------ *
 *  منحنى التسارع
 *  ليست easing جاهزة: هذي القيم مقيسة إطاراً بإطار من المرجع.
 *  البداية بطيئة قليلاً ثم تلحق بسرعة في الثلث الأخير — وهذا ما يعطي
 *  الحركة إحساس "الشد ثم الانفتاح" بدل الانزلاق الميكانيكي.
 * ------------------------------------------------------------------ */
const EASE_INPUT = [0, 0.145, 0.427, 0.573, 0.855, 1];
const EASE_OUTPUT = [0, 0.147, 0.326, 0.453, 0.832, 1];
const revealEase = (linearProgress) =>
  interpolate(linearProgress, EASE_INPUT, EASE_OUTPUT, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
/** يختار الكابشن المطابق للفريم الحالي. */
const pickCaption = (captions, currentMs) => {
  for (const caption of captions) {
    if (caption.startMs <= currentMs && currentMs < caption.endMs) {
      return caption;
    }
  }
  return null;
};
/* ------------------------------------------------------------------ *
 *  حساب المدة من طول التعليق الصوتي
 * ------------------------------------------------------------------ */
export const calculateMetadata = async ({
  props,
  defaultProps,
  abortSignal,
}) => {
  void defaultProps;
  void abortSignal;
  const fps = 30;
  return {
    durationInFrames: await contentDurationInFrames({
      fps,
      voiceover: props.voiceover
        ? resolveAsset(props.voiceover, staticFile)
        : null,
      // المقطع هنا يُعرض من الفريم صفر (الحركة تكشفه لا تؤخّره)
      media: props.media ? resolveAsset(props.media, staticFile) : null,
      captions: props.captions,
      captionTailFrames: Math.round(fps * 0.5),
      fallbackInFrames: Math.max(
        props.revealDelayInFrames +
          props.revealDurationInFrames +
          props.textDelayInFrames +
          Math.round(fps * 1.5),
        Math.round(fps * 2.5),
      ),
    }),
    fps,
  };
};
/* ------------------------------------------------------------------ *
 *  المكوّن
 * ------------------------------------------------------------------ */
export const Template = ({
  backgroundColor,
  cardColor,
  fontColor,
  captionColor,
  captionBackgroundColor,
  logo,
  headline,
  subheadline,
  media,
  mediaIsImage,
  mediaStartFromSeconds,
  mediaVolume,
  mediaMuted,
  voiceover,
  voiceoverVolume,
  clickSfx,
  clickVolume,
  captions,
  showCaptions,
  revealDelayInFrames,
  revealDurationInFrames,
  revealDirection,
  revealStartScaleMinor,
  revealStartScaleMajor,
  revealAnchor,
  textDelayInFrames,
  glowIntensity,
  cardRadiusRatio,
  mediaRadiusRatio,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  // معامل واحد يربط المساحة المرجعية بأبعاد الفيديو الحقيقية.
  const scale = Math.min(width / REF_W, height / REF_H);
  const px = (value) => value * scale;
  // مركزة لوح التصميم داخل الإطار مهما كانت النسبة.
  const stageLeft = (width - REF_W * scale) / 2;
  const stageTop = (height - REF_H * scale) / 2;
  /* ---------- حركة التمدد ---------- */
  const revealLinear = interpolate(
    frame,
    [revealDelayInFrames, revealDelayInFrames + revealDurationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const revealProgress = revealEase(revealLinear);
  // المحور القصير هو الذي يبدأ شبه معدوم؛ الطويل يبدأ شبه مكتمل.
  const minorScale = interpolate(
    revealProgress,
    [0, 1],
    [revealStartScaleMinor, 1],
  );
  const majorScale = interpolate(
    revealProgress,
    [0, 1],
    [revealStartScaleMajor, 1],
  );
  const isVertical = revealDirection === "vertical";
  const scaleX = isVertical ? majorScale : minorScale;
  const scaleY = isVertical ? minorScale : majorScale;
  // الارتكاز يميل قليلاً نحو الأعلى، فتنزل الحافة السفلية أكثر مما تصعد العلوية.
  const originX = isVertical ? 50 : revealAnchor * 100;
  const originY = isVertical ? revealAnchor * 100 : 50;
  /* ---------- ظهور النص ---------- */
  const textStart =
    revealDelayInFrames + revealDurationInFrames + textDelayInFrames;
  const textSpring = spring({
    frame: frame - textStart,
    fps,
    // damping مرتفع = بدون ارتداد؛ النص يستقر بهدوء ولا يسحب الانتباه من المقطع.
    config: { damping: 200, stiffness: 120, mass: 0.6 },
  });
  const textOpacity = interpolate(textSpring, [0, 1], [0, 1]);
  const textShift = interpolate(textSpring, [0, 1], [px(26), 0]);
  /* ---------- الكابشن ---------- */
  const currentMs = (frame / fps) * 1000;
  const activeCaption = useMemo(
    () => (showCaptions ? pickCaption(captions, currentMs) : null),
    [captions, currentMs, showCaptions],
  );
  // ظهور واختفاء سريع (٤ فريمات) حتى لا يتأخر الكابشن عن الصوت.
  const CAPTION_FADE_FRAMES = 4;
  const captionOpacity = activeCaption
    ? interpolate(
        currentMs,
        [
          activeCaption.startMs,
          activeCaption.startMs + (CAPTION_FADE_FRAMES / fps) * 1000,
          activeCaption.endMs - (CAPTION_FADE_FRAMES / fps) * 1000,
          activeCaption.endMs,
        ],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;
  // نقرة مع كل كلمة: الكابشن هنا يظهر كتلةً، فتوزَّع الكلمات على مدّته ما لم
  // يوفّر ملف SRT توقيتاً صريحاً لكل كلمة
  const clickOnsets = useMemo(
    () => (clickSfx ? cueWordOnsets(captions) : []),
    [captions, clickSfx],
  );

  const cardRadius = px(cardRadiusRatio * REF_W);
  const mediaRadius = px(mediaRadiusRatio * REF_W);
  const cardCenterX = LAYOUT.card.left + LAYOUT.card.width / 2;
  const mediaSource = media ? resolveAsset(media, staticFile) : null;
  // العنوان فقط: قصير ومحدود بـ ٣٨ حرفاً، وهو الموضع الوحيد الذي يسمح فيه
  // دليل ثمانية بالأحرف المرسلة. الثانوي والكابشن نصوص طويلة فتُمنع عليهما.
  const headlineWords = useMemo(
    () => headline.split(/\s+/u).filter((w) => w.length > 0),
    [headline],
  );
  return (
    <AbsoluteFill
      style={{ backgroundColor, fontFamily: FONT_STACK, direction: "rtl" }}
    >
      {/* الطبقة ٠ — الخلفية العامة */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 42%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.55) 100%)`,
        }}
      />

      {/* لوح التصميم المرجعي، ممركز ومقيس */}
      <AbsoluteFill
        style={{
          left: stageLeft,
          top: stageTop,
          width: REF_W * scale,
          height: REF_H * scale,
        }}
      >
        {/* الطبقة ١ — الكرت */}
        <div
          style={{
            position: "absolute",
            left: px(LAYOUT.card.left),
            top: px(LAYOUT.card.top),
            width: px(LAYOUT.card.width),
            height: px(LAYOUT.card.height),
            backgroundColor: cardColor,
            borderRadius: cardRadius,
            boxShadow: `0 ${px(30)}px ${px(60)}px rgba(0,0,0,${0.6 * glowIntensity})`,
          }}
        />

        {/* الطبقة ٢ — اللوقو */}
        {logo ? (
          <div
            style={{
              position: "absolute",
              left: px(cardCenterX - LAYOUT.logo.width / 2),
              top: px(LAYOUT.logo.top),
              width: px(LAYOUT.logo.width),
              height: px(LAYOUT.logo.height),
            }}
          >
            <Img
              src={resolveAsset(logo, staticFile)}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        ) : null}

        {/* الطبقة ٣ — المقطع، وهو بطل اللقطة */}
        <div
          style={{
            position: "absolute",
            left: px(LAYOUT.media.left),
            top: px(LAYOUT.media.top),
            width: px(LAYOUT.media.width),
            height: px(LAYOUT.media.height),
            transform: `scale(${scaleX}, ${scaleY})`,
            transformOrigin: `${originX}% ${originY}%`,
            borderRadius: mediaRadius,
            overflow: "hidden",
            boxShadow: `0 ${px(14)}px ${px(30)}px rgba(0,0,0,${0.45 * glowIntensity})`,
            // قبل بداية الحركة لا شيء معروض إطلاقاً.
            opacity: frame >= revealDelayInFrames ? 1 : 0,
            backgroundColor: mediaSource ? "transparent" : `rgba(0,0,0,0.10)`,
          }}
        >
          {mediaSource ? (
            mediaIsImage ? (
              <Img
                src={mediaSource}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Video
                src={mediaSource}
                trimBefore={Math.round(mediaStartFromSeconds * fps)}
                muted={mediaMuted}
                volume={mediaMuted ? 0 : mediaVolume}
                objectFit="cover"
                style={{ width: "100%", height: "100%" }}
              />
            )
          ) : (
            /* Placeholder: مكان المقطع محجوز — بلا نص حتى لا تُثبَّت أي كلمة داخل القالب */
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `${px(3)}px dashed ${fontColor}`,
                borderRadius: mediaRadius,
                boxSizing: "border-box",
                opacity: 0.45,
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderTop: `${px(38)}px solid transparent`,
                  borderBottom: `${px(38)}px solid transparent`,
                  borderRight: `${px(62)}px solid ${fontColor}`,
                }}
              />
            </div>
          )}
        </div>

        {/* الطبقة ٤ — النصوص، تدخل بعد استقرار المقطع */}
        <Sequence from={textStart} layout="none">
          <div
            style={{
              position: "absolute",
              left: px(LAYOUT.card.left),
              top: px(LAYOUT.headline.top),
              width: px(LAYOUT.card.width),
              textAlign: "center",
              opacity: textOpacity,
              transform: `translateY(${textShift}px)`,
            }}
          >
            <div
              style={{
                color: fontColor,
                fontSize: px(LAYOUT.headline.fontSize),
                lineHeight: `${px(LAYOUT.headline.lineHeight)}px`,
                // ثمانية عندها Black و Medium فقط. الأصل استعمل Black
                // للعنوان لأن Bold ما يعطي تبايناً كافياً مقابل الثانوي.
                fontWeight: FONT_WEIGHT_BLACK,
              }}
            >
              {headlineWords.map((word, index) => (
                <span key={`${index}-${word}`} style={{}}>
                  {index === 0 ? word : ` ${word}`}
                </span>
              ))}
            </div>
            {subheadline ? (
              <div
                style={{
                  marginTop: px(
                    LAYOUT.subheadline.top -
                      LAYOUT.headline.top -
                      LAYOUT.headline.lineHeight,
                  ),
                  color: fontColor,
                  fontSize: px(LAYOUT.subheadline.fontSize),
                  lineHeight: `${px(LAYOUT.subheadline.lineHeight)}px`,
                  fontWeight: FONT_WEIGHT_MEDIUM,
                  opacity: 0.75,
                }}
              >
                {subheadline}
              </div>
            ) : null}
          </div>
        </Sequence>

        {/* الطبقة ٥ — الكابشن، فوق كل شيء */}
        {activeCaption ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              width: REF_W * scale,
              bottom: px(LAYOUT.caption.bottom),
              display: "flex",
              justifyContent: "center",
              opacity: captionOpacity,
            }}
          >
            <div
              style={{
                maxWidth: px(REF_W * 0.82),
                backgroundColor: captionBackgroundColor,
                color: captionColor,
                fontSize: px(LAYOUT.caption.fontSize),
                lineHeight: `${px(LAYOUT.caption.fontSize * 1.45)}px`,
                fontWeight: FONT_WEIGHT_BLACK,
                padding: `${px(LAYOUT.caption.paddingY)}px ${px(LAYOUT.caption.paddingX)}px`,
                borderRadius: px(18),
                textAlign: "center",
              }}
            >
              {activeCaption.text}
            </div>
          </div>
        ) : null}
      </AbsoluteFill>

      {/* الطبقة ٦ — الصوت */}
      <WordClicks
        src={clickSfx}
        volume={clickVolume}
        onsetsMs={clickOnsets}
        fps={fps}
      />
      {voiceover ? (
        <Audio
          src={resolveAsset(voiceover, staticFile)}
          volume={voiceoverVolume}
        />
      ) : null}
    </AbsoluteFill>
  );
};
