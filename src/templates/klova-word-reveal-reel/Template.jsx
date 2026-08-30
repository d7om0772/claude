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
import { FONT_STACK, FONT_WEIGHT_BLACK } from "../../lib/fonts.js";
import { resolveAsset } from "../../lib/asset-url.js";
import { isVideoSource } from "../../lib/duration.js";

/* -------------------------------------------------------------------------- */
/*                        ثوابت التصميم (لوحة 1080x1920)                       */
/* -------------------------------------------------------------------------- */

/**
 * كل الأرقام أدناه مقاسة مباشرة من إطارات الفيديو المرجعي.
 * اللوحة المرجعية 1080x1920؛ المكوّن يعيد تحجيمها لأي مقاس آخر.
 */
const DESIGN_WIDTH = 1080;
const DESIGN_HEIGHT = 1920;

const CAPTION_LAYOUT = {
  // أبيض داخل أعلى بطاقة الفيديو، محاذاة يمين على x=911
  over: {
    top: 286,
    lineHeight: 114,
    align: "right",
    right: DESIGN_WIDTH - 911,
    shadow: true,
  },
  // غامق فوق البطاقة الأفقية، نفس محور المحاذاة
  above: {
    top: 275,
    lineHeight: 120,
    align: "right",
    right: DESIGN_WIDTH - 911,
    shadow: false,
  },
  // غامق في وسط شاشة فاضية، محاذاة وسط
  full: { top: 789, lineHeight: 172, align: "center", right: 0, shadow: false },
};

const ASPECT_RATIO = {
  "9:16": 9 / 16,
  "16:9": 16 / 9,
  "1:1": 1,
  "4:5": 4 / 5,
};

/* -------------------------------------------------------------------------- */
/*                                  مساعدات                                    */
/* -------------------------------------------------------------------------- */

/**
 * يقسّم نص الكابشن لكلمات ويعطي كل كلمة لحظة ظهورها.
 * لو المستخدم وفّر wordStartsMs نستخدمها، وإلا نوزّع الكلمات بالتساوي
 * على 85% من مدة المقطع (النسبة مأخوذة من إيقاع الفيديو الأصلي، حيث
 * تبقى آخر كلمة معروضة لحظة قبل الانتقال).
 */
const buildWords = (cue) => {
  const words = cue.text.split(/\s+/u).filter((w) => w.length > 0);
  if (words.length === 0) {
    return [];
  }
  const explicit = cue.wordStartsMs;
  if (explicit.length >= words.length) {
    return words.map((text, i) => ({ text, startMs: explicit[i] }));
  }
  const span = (cue.endMs - cue.startMs) * 0.85;
  return words.map((text, i) => ({
    text,
    startMs: cue.startMs + (span * i) / words.length,
  }));
};

/** كل لحظات ظهور الكلمات في القالب كله — تُستخدم لتوزيع صوت النقرات. */
const collectWordOnsets = (captions) => {
  const all = [];
  for (const cue of captions) {
    for (const word of buildWords(cue)) {
      all.push(word.startMs);
    }
  }
  return all.sort((a, b) => a - b);
};

/* -------------------------------------------------------------------------- */
/*                              بطاقة الوسائط                                  */
/* -------------------------------------------------------------------------- */

const PlaceholderCard = ({
  widthPx,
  heightPx,
  radiusPx,
  fillColor,
  accentColor,
  label,
}) => {
  const glyph = Math.min(widthPx, heightPx) / 4.5;
  return (
    <div
      style={{
        width: widthPx,
        height: heightPx,
        borderRadius: radiusPx,
        backgroundColor: fillColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        border: `4px solid ${accentColor}`,
      }}
    >
      <svg width={glyph} height={glyph} viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke={accentColor}
          strokeWidth="5"
        />
        <polygon points="40,32 40,68 72,50" fill={accentColor} />
      </svg>
      {label.length > 0 ? (
        <div
          style={{
            marginTop: 34,
            color: accentColor,
            fontFamily: FONT_STACK,
            fontSize: 30,
            direction: "rtl",
            textAlign: "center",
          }}
        >
          {label}
        </div>
      ) : null}
      {/* dir=ltr وإلا قلب اتجاه الصفحة ترتيب الرقمين حول علامة × */}
      <div
        dir="ltr"
        style={{
          marginTop: 12,
          color: accentColor,
          fontFamily: FONT_STACK,
          fontSize: 26,
          opacity: 0.8,
        }}
      >
        {widthPx}×{heightPx}
      </div>
    </div>
  );
};

const MediaCard = ({
  scene,
  fallbackMedia,
  cardWidthPx,
  cardRadiusPx,
  placeholderFillColor,
  accentColor,
  enterFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const media = scene.media ?? fallbackMedia;

  const aspect = media?.aspect ?? "9:16";
  // الارتفاع مشتق من العرض والنسبة — العرض هو الثابت في هوية القالب
  const heightPx = Math.round(cardWidthPx / ASPECT_RATIO[aspect]);

  // دخول ناعم جداً: تلاشي + تكبير 2% خلال أول فريمات المشهد
  const enter =
    enterFrames <= 0
      ? 1
      : interpolate(frame, [0, enterFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  const wrapperStyle = {
    position: "absolute",
    left: (DESIGN_WIDTH - cardWidthPx) / 2,
    top: (DESIGN_HEIGHT - heightPx) / 2,
    width: cardWidthPx,
    height: heightPx,
    borderRadius: cardRadiusPx,
    overflow: "hidden",
    opacity: enter,
    transform: `scale(${interpolate(enter, [0, 1], [0.98, 1])})`,
  };

  if (media === null) {
    return (
      <div style={wrapperStyle}>
        <PlaceholderCard
          widthPx={cardWidthPx}
          heightPx={heightPx}
          radiusPx={cardRadiusPx}
          fillColor={placeholderFillColor}
          accentColor={accentColor}
          label={scene.placeholderLabel}
        />
      </div>
    );
  }

  const fillStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  return (
    <div style={wrapperStyle}>
      {isVideoSource(media.src) ? (
        <Video
          src={resolveAsset(media.src, staticFile)}
          trimBefore={Math.round((media.startFromMs / 1000) * fps)}
          muted={media.muted}
          style={fillStyle}
        />
      ) : (
        <Img src={resolveAsset(media.src, staticFile)} style={fillStyle} />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 الكابشن                                     */
/* -------------------------------------------------------------------------- */

const CaptionBlock = ({
  visibleFromMs = 0,
  visibleToMs = Number.POSITIVE_INFINITY,
  words,
  layout,
  fontSizePx,
  maxWidthPx,
  activeColor,
  mutedColor,
  popFrames,
  popRisePx,
  popStartOpacity,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  // فهرس آخر كلمة ظهرت — هي الوحيدة اللي تاخذ اللون النشط
  let newestIndex = -1;
  for (let i = 0; i < words.length; i++) {
    if (words[i].startMs <= currentMs) {
      newestIndex = i;
    }
  }

  if (
    newestIndex < 0 ||
    currentMs < visibleFromMs ||
    currentMs >= visibleToMs
  ) {
    return null;
  }

  const boxStyle = {
    position: "absolute",
    top: layout.top,
    width: maxWidthPx,
    // المفتاح في هوية القالب: الكلمات تُرصَف في مواضعها النهائية من البداية،
    // والظهور يتم في المكان بدون إعادة توسيط — لذلك نرسم كل الكلمات
    // ونخفي غير الظاهرة بالشفافية بدل ما نحذفها من الـ DOM.
    direction: "rtl",
    fontFamily: FONT_STACK,
    fontSize: fontSizePx,
    lineHeight: `${layout.lineHeight}px`,
    fontWeight: FONT_WEIGHT_BLACK,
    textAlign: layout.align,
    ...(layout.align === "right"
      ? { right: layout.right }
      : { left: (DESIGN_WIDTH - maxWidthPx) / 2 }),
    ...(layout.shadow ? { textShadow: "0 4px 10px rgba(20,16,12,0.75)" } : {}),
  };

  return (
    <div style={boxStyle}>
      {words.map((word, i) => {
        const revealed = i <= newestIndex;
        const onsetFrame = (word.startMs / 1000) * fps;
        const progress = interpolate(
          frame,
          [onsetFrame, onsetFrame + popFrames],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );
        const opacity = revealed
          ? interpolate(progress, [0, 1], [popStartOpacity, 1])
          : 0;
        const rise = revealed
          ? interpolate(progress, [0, 1], [popRisePx, 0])
          : 0;

        return (
          <span
            key={`${word.startMs}-${i}`}
            style={{
              display: "inline-block",
              color: i === newestIndex ? activeColor : mutedColor,
              opacity,
              transform: `translateY(${rise}px)`,
              // مسافة بعد كل كلمة عدا الأخيرة عشان لا يتغيّر عرض السطر
              marginLeft: i === words.length - 1 ? 0 : "0.28em",
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              المكوّن الرئيسي                                 */
/* -------------------------------------------------------------------------- */

export const Template = ({
  backgroundColor,
  fontColor,
  mutedFontColor,
  overlayFontColor,
  accentColor,
  placeholderFillColor,
  logo,
  logoWidthPx,
  logoTopPx,
  headline,
  subheadline,
  media,
  scenes,
  captions,
  voiceover,
  voiceoverVolume,
  clickSfx,
  clickVolume,
  cardWidthPx,
  cardRadiusPx,
  wordPopFrames,
  wordPopRisePx,
  wordPopStartOpacity,
  cardEnterFrames,
  captionFontSizes,
}) => {
  const { width, height, fps, durationInFrames } = useVideoConfig();

  // نرسم على لوحة 1080x1920 ثابتة ثم نحجّمها — يضمن أن كل قياس
  // مأخوذ من التصميم الأصلي يبقى صحيحاً على أي مقاس فيديو
  const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
  const offsetX = (width - DESIGN_WIDTH * scale) / 2;
  const offsetY = (height - DESIGN_HEIGHT * scale) / 2;

  const hasCaptions = captions.length > 0;
  const clickOnsets = useMemo(
    () => (clickSfx === null ? [] : collectWordOnsets(captions)),
    [captions, clickSfx],
  );

  // نص احتياطي بنفس نمط "full" لما ما يكون فيه كابشن إطلاقاً
  const fallbackWords = useMemo(() => {
    if (hasCaptions) {
      return [];
    }
    const text = [headline, subheadline].filter((t) => t.length > 0).join(" ");
    const list = text.split(/\s+/u).filter((w) => w.length > 0);
    const stepMs = 400;
    return list.map((w, i) => ({ text: w, startMs: 200 + i * stepMs }));
  }, [hasCaptions, headline, subheadline]);

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <AbsoluteFill
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: "top left",
          overflow: "hidden",
        }}
      >
        {/* ------------------------- الطبقة ١: بطاقات الوسائط ------------------------- */}
        {scenes.map((scene, i) => {
          const from = Math.round((scene.startMs / 1000) * fps);
          const to = Math.round((scene.endMs / 1000) * fps);
          const frames = Math.max(0, to - from);
          if (frames === 0) {
            return null;
          }
          const hasCard =
            (scene.media ?? media) !== null ||
            scene.placeholderLabel.length > 0;
          if (!hasCard) {
            return null;
          }
          return (
            <Sequence
              key={`scene-${i}`}
              from={from}
              durationInFrames={frames}
              layout="none"
            >
              <MediaCard
                scene={scene}
                fallbackMedia={media}
                cardWidthPx={cardWidthPx}
                cardRadiusPx={cardRadiusPx}
                placeholderFillColor={placeholderFillColor}
                accentColor={accentColor}
                enterFrames={cardEnterFrames}
              />
            </Sequence>
          );
        })}

        {/* ---------------------------- الطبقة ٢: الشعار ---------------------------- */}
        {logo !== null && logo.length > 0 ? (
          <Img
            src={resolveAsset(logo, staticFile)}
            style={{
              position: "absolute",
              top: logoTopPx,
              left: (DESIGN_WIDTH - logoWidthPx) / 2,
              width: logoWidthPx,
              height: "auto",
            }}
          />
        ) : null}

        {/* --------------------------- الطبقة ٣: الكابشن --------------------------- */}
        {hasCaptions
          ? captions.map((cue, i) => {
              const from = Math.round((cue.startMs / 1000) * fps);
              const to = Math.round((cue.endMs / 1000) * fps);
              const frames = Math.max(0, to - from);
              if (frames === 0) {
                return null;
              }
              const layout = CAPTION_LAYOUT[cue.style];
              const isOverlay = cue.style === "over";
              return (
                <Sequence
                  key={`cue-${i}`}
                  name={`caption-${i}`}
                  from={0}
                  durationInFrames={durationInFrames}
                  layout="none"
                >
                  {/* الـ Sequence ممتدة على الفيديو كله والظهور يُتحكَّم به
                      بالميلي ثانية داخل المكوّن. Sequence ثانية تبدأ عند
                      المقطع كانت تُزيح ساعة useCurrentFrame إلى صفر عندها،
                      بينما توقيتات الكلمات مطلقة — فما ظهر إلا أول مقطع. */}
                  <CaptionBlock
                    visibleFromMs={cue.startMs}
                    visibleToMs={cue.endMs}
                    words={buildWords(cue)}
                    layout={layout}
                    fontSizePx={captionFontSizes[cue.style]}
                    maxWidthPx={cue.maxWidthPx}
                    activeColor={isOverlay ? overlayFontColor : fontColor}
                    mutedColor={isOverlay ? overlayFontColor : mutedFontColor}
                    popFrames={wordPopFrames}
                    popRisePx={wordPopRisePx}
                    popStartOpacity={wordPopStartOpacity}
                  />
                </Sequence>
              );
            })
          : null}

        {/* ------------------ الطبقة ٣ب: النص الاحتياطي بدون كابشن ------------------ */}
        {!hasCaptions && fallbackWords.length > 0 ? (
          <CaptionBlock
            words={fallbackWords}
            layout={CAPTION_LAYOUT.full}
            fontSizePx={captionFontSizes.full}
            maxWidthPx={620}
            activeColor={fontColor}
            mutedColor={mutedFontColor}
            popFrames={wordPopFrames}
            popRisePx={wordPopRisePx}
            popStartOpacity={wordPopStartOpacity}
          />
        ) : null}
      </AbsoluteFill>

      {/* ----------------------------- الطبقة ٤: الصوت ----------------------------- */}
      {voiceover !== null && voiceover.length > 0 ? (
        <Audio
          src={resolveAsset(voiceover, staticFile)}
          volume={voiceoverVolume}
        />
      ) : null}

      {clickSfx !== null && clickSfx.length > 0
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
