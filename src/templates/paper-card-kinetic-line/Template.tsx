import React, { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { measureText } from "@remotion/layout-utils";
import { contentDurationInFrames } from "../../lib/duration";
import type { CalculateMetadataFunction } from "remotion";
import type { Caption, TemplateProps } from "./schema";
import { isVideoSource } from "../../lib/duration";
import {
  FONT_STACK,
  FONT_WEIGHT_BLACK,
  FONT_WEIGHT_MEDIUM,
  fontsReady,
} from "../../lib/fonts";

/* ────────────────────────────────────────────────────────────────────────────
   مساعدات الحركة
   ──────────────────────────────────────────────────────────────────────── */

/** تسارع خارج (ease-out) بقوة ٤ — نفس منحنى النقلات في التصميم الأصلي. */
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

type PlacedWord = {
  readonly text: string;
  readonly width: number;
  /** إزاحة بداية الكلمة عن الحافة القائدة للسطر (اليمنى في rtl) */
  readonly offset: number;
};

type LineLayout = {
  readonly words: readonly PlacedWord[];
  readonly totalWidth: number;
};

/**
 * يقيس كل كلمة على حدة ويحسب موضعها. القياس كلمة كلمة — وليس السطر كاملاً —
 * لأن السطر الصغير يُبنى كلمة كلمة والحافة القائدة يجب أن تبقى ثابتة تماماً.
 */
const layoutLine = (
  text: string,
  fontFamily: string,
  fontWeight: string,
  fontSize: number,
  wordSpacingRatio: number,
): LineLayout => {
  const rawWords = text.split(/\s+/u).filter((w) => w.length > 0);
  const space = fontSize * wordSpacingRatio;
  let cursor = 0;
  const words: PlacedWord[] = [];

  for (const word of rawWords) {
    const { width } = measureText({
      text: word,
      fontFamily,
      fontWeight,
      fontSize,
      validateFontIsLoaded: false,
    });
    words.push({ text: word, width, offset: cursor });
    cursor += width + space;
  }

  const totalWidth = cursor > 0 ? cursor - space : 0;
  return { words, totalWidth };
};

type HeadlineMotion = {
  readonly offsetAt: (frame: number) => number;
  readonly stops: readonly number[];
};

/**
 * يبني دالة الإزاحة الأفقية للسطر الضخم: محطة وقوف لكل كلمة، ونقلة بينهما.
 * السطر أعرض من الكرت، فالكرت يقصّه من الطرفين — هذا هو جوهر اللقطة.
 */
const buildHeadlineMotion = (
  lineWidth: number,
  cardInnerWidth: number,
  wordCount: number,
  stopFrames: readonly number[],
  moveFrames: number,
  startInset: number,
  endInset: number,
  rtl: boolean,
): HeadlineMotion => {
  const half = (lineWidth - cardInnerWidth) / 2;

  // إزاحة سالبة تكشف الطرف الأيمن من السطر، وموجبة تكشف الطرف الأيسر.
  const first = rtl ? -half - startInset : half + startInset;
  const last = rtl ? half + endInset : -half - endInset;

  const stopCount = Math.max(1, wordCount);
  const stops: number[] =
    stopCount === 1
      ? [(first + last) / 2]
      : Array.from(
          { length: stopCount },
          (_, i) => first + ((last - first) * i) / (stopCount - 1),
        );

  // لو لم يزوّد المستخدم عدداً كافياً من المحطات الزمنية، نوزّعها بالتساوي.
  const transitions = stopCount - 1;
  const providedStops = stopFrames.slice(0, transitions);
  const starts: number[] =
    providedStops.length === transitions
      ? [...providedStops]
      : Array.from(
          { length: transitions },
          (_, i) => (i + 1) * (moveFrames + 6),
        );

  const offsetAt = (frame: number): number => {
    let value = stops[0] as number;
    for (let i = 0; i < transitions; i++) {
      const from = stops[i] as number;
      const to = stops[i + 1] as number;
      const start = starts[i] as number;
      const end = start + moveFrames;
      if (frame >= end) {
        value = to;
      } else if (frame > start) {
        const t = easeOutQuart(clamp01((frame - start) / moveFrames));
        value = from + (to - from) * t;
      } else {
        break;
      }
    }
    return value;
  };

  return { offsetAt, stops };
};

const resolveSrc = (src: string): string =>
  /^(https?:|data:|blob:)/u.test(src) || src.startsWith("/")
    ? src
    : staticFile(src);

/* ────────────────────────────────────────────────────────────────────────────
   طبقات فرعية
   ──────────────────────────────────────────────────────────────────────── */

const Texture: React.FC<{
  readonly kind: "wood" | "paper";
  readonly opacity: number;
}> = ({ kind, opacity }) => {
  // feTurbulence بذرة ثابتة => نفس النتيجة في كل رندر (deterministic)
  const id = `tex-${kind}`;
  const baseX = kind === "wood" ? 0.004 : 0.9;
  const baseY = kind === "wood" ? 0.09 : 0.9;
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "overlay" }}>
      <svg width="100%" height="100%" style={{ display: "block" }}>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={`${baseX} ${baseY}`}
            numOctaves={kind === "wood" ? 3 : 2}
            seed={7}
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

const CaptionLayer: React.FC<{
  readonly captions: readonly Caption[];
  readonly fontColor: string;
  readonly fontSize: number;
  readonly top: number;
  readonly fadeFrames: number;
}> = ({ captions, fontColor, fontSize, top, fadeFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const fadeMs = (fadeFrames / fps) * 1000;

  const active = captions.find(
    (c) => currentMs >= c.startMs && currentMs < c.endMs,
  );
  if (!active) {
    return null;
  }

  const inOpacity = clamp01((currentMs - active.startMs) / fadeMs);
  const outOpacity = clamp01((active.endMs - currentMs) / fadeMs);
  const opacity = Math.min(inOpacity, outOpacity);

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        width: "100%",
        textAlign: "center",
        direction: "rtl",
        opacity,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          display: "inline-block",
          fontFamily: FONT_STACK,
          fontWeight: FONT_WEIGHT_MEDIUM,
          fontSize,
          lineHeight: 1.35,
          color: fontColor,
          padding: `${fontSize * 0.18}px ${fontSize * 0.5}px`,
          maxWidth: "82%",
        }}
      >
        {active.text}
      </span>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
   المكوّن الرئيسي
   ──────────────────────────────────────────────────────────────────────── */

export const Template: React.FC<TemplateProps> = ({
  backgroundColor,
  cardColor,
  fontColor,
  headline,
  subheadline,
  logo,
  media,
  voiceover,
  captions,
  cardWidthRatio,
  cardHeightRatio,
  cardRadiusRatio,
  cardDriftRotation,
  cardDriftScale,
  cardDriftX,
  headlineSizeRatio,
  headlineYRatio,
  headlineDirection,
  headlineStartInset,
  headlineEndInset,
  headlineWordSpacing,
  headlineStopFrames,
  headlineMoveFrames,
  headlineCutFrame,
  motionBlurAmount,
  subheadlineSizeRatio,
  subheadlineYRatio,
  subheadlineStartFrame,
  subheadlineStrideFrames,
  subheadlineFadeFrames,
  captionSizeRatio,
  captionYRatio,
  captionFadeFrames,
  showTexture,
  vignetteStrength,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const [fontsLoaded, setFontsLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fontsReady.then(() => {
      if (!cancelled) {
        setFontsLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── هندسة الكرت (كلها نسب، فالقالب يتكيّف مع أي مقاس) ──
  const cardW = width * cardWidthRatio;
  const cardH = height * cardHeightRatio;
  const cardLeft = (width - cardW) / 2;
  const cardTop = (height - cardH) / 2;
  const cardRadius = width * cardRadiusRatio;

  const headlineSize = width * headlineSizeRatio;
  const subSize = width * subheadlineSizeRatio;
  const captionSize = width * captionSizeRatio;

  const rtl = headlineDirection === "rtl";

  // ── قياس الأسطر ──
  const headLine = useMemo(
    () =>
      fontsLoaded
        ? layoutLine(
            headline,
            FONT_STACK,
            String(FONT_WEIGHT_BLACK),
            headlineSize,
            headlineWordSpacing,
          )
        : { words: [], totalWidth: 0 },
    [fontsLoaded, headline, headlineSize, headlineWordSpacing],
  );

  const subLine = useMemo(
    () =>
      fontsLoaded && subheadline
        ? layoutLine(
            subheadline,
            FONT_STACK,
            String(FONT_WEIGHT_MEDIUM),
            subSize,
            headlineWordSpacing,
          )
        : { words: [], totalWidth: 0 },
    [fontsLoaded, subheadline, subSize, headlineWordSpacing],
  );

  const motion = useMemo(
    () =>
      buildHeadlineMotion(
        headLine.totalWidth,
        cardW,
        headLine.words.length,
        headlineStopFrames,
        headlineMoveFrames,
        headlineStartInset,
        headlineEndInset,
        rtl,
      ),
    [
      headLine.totalWidth,
      headLine.words.length,
      cardW,
      headlineStopFrames,
      headlineMoveFrames,
      headlineStartInset,
      headlineEndInset,
      rtl,
    ],
  );

  const offset = motion.offsetAt(frame);
  // السرعة تُقاس على نصف فريم قبل وبعد — هي مصدر شدة الموشن بلر
  const velocity = motion.offsetAt(frame + 0.5) - motion.offsetAt(frame - 0.5);
  const blurStd = Math.abs(velocity) * motionBlurAmount;

  // ── انسياب الكرت: يبدأ من نصف القيمة السالبة وينتهي بنصفها الموجب ──
  const driftT = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;
  const rotation = -cardDriftRotation / 2 + cardDriftRotation * driftT;
  const scale = 1 + cardDriftScale * driftT;
  const driftX = -cardDriftX / 2 + cardDriftX * driftT;

  const headlineTop = height * headlineYRatio - cardTop;
  const subTop = height * subheadlineYRatio - cardTop;
  const captionTop = height * captionYRatio - cardTop;

  const blurFilterId = "headline-motion-blur";

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* الطبقة ١ — خلفية وعروق الخشب */}
      {showTexture ? <Texture kind="wood" opacity={0.35} /> : null}

      {/* الطبقة ٢ — فينييت يعتّم الأطراف ويدفع العين للمركز */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 35%, rgba(0,0,0,${vignetteStrength}) 100%)`,
        }}
      />

      {/* الطبقة ٣ — الكرت وكل ما بداخله */}
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: cardLeft,
            top: cardTop,
            width: cardW,
            height: cardH,
            transform: `translateX(${driftX}px) rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: "center center",
            borderRadius: cardRadius,
            backgroundColor: cardColor,
            overflow: "hidden",
            boxShadow: `0 ${cardH * 0.02}px ${cardH * 0.035}px rgba(18,12,8,0.45)`,
          }}
        >
          {/* ٣أ — وسائط المستخدم خلف كل شيء */}
          {media ? (
            isVideoSource(media) ? (
              <OffthreadVideo
                src={resolveSrc(media)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <Img
                src={resolveSrc(media)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            )
          ) : null}

          {/* ٣ب — حبيبات الورق */}
          {showTexture ? <Texture kind="paper" opacity={0.12} /> : null}

          {/* ٣ج — الشعار */}
          {logo ? (
            <Img
              src={resolveSrc(logo)}
              style={{
                position: "absolute",
                top: cardH * 0.06,
                left: "50%",
                transform: "translateX(-50%)",
                width: cardW * 0.22,
                height: "auto",
              }}
            />
          ) : null}

          {/* فلتر البلور الأفقي — أفقي فقط لأن الحركة أفقية بحتة */}
          <svg
            width="0"
            height="0"
            style={{ position: "absolute" }}
            aria-hidden="true"
          >
            <filter
              id={blurFilterId}
              x="-50%"
              y="-20%"
              width="200%"
              height="140%"
            >
              <feGaussianBlur stdDeviation={`${blurStd} 0`} />
            </filter>
          </svg>

          {/* ٣د — السطر الضخم الزاحف */}
          {frame < headlineCutFrame ? (
            <div
              style={{
                position: "absolute",
                top: headlineTop,
                left: 0,
                width: cardW,
                height: 0,
                transform: `translateX(${offset}px)`,
                filter: blurStd > 0.15 ? `url(#${blurFilterId})` : undefined,
              }}
            >
              {headLine.words.map((word, i) => {
                const lead = cardW / 2 + headLine.totalWidth / 2;
                const left = rtl
                  ? lead - word.offset - word.width
                  : cardW / 2 - headLine.totalWidth / 2 + word.offset;
                return (
                  <span
                    key={`h-${i}`}
                    dir="rtl"
                    style={{
                      position: "absolute",
                      left,
                      top: -headlineSize * 0.72,
                      width: word.width,
                      fontFamily: FONT_STACK,
                      fontWeight: FONT_WEIGHT_BLACK,
                      fontSize: headlineSize,
                      lineHeight: 1.2,
                      color: fontColor,
                      whiteSpace: "pre",
                    }}
                  >
                    {word.text}
                  </span>
                );
              })}
            </div>
          ) : null}

          {/* ٣هـ — السطر الصغير: يُبنى كلمة كلمة والحافة القائدة ثابتة */}
          {frame >= headlineCutFrame && subLine.words.length > 0 ? (
            <div
              style={{
                position: "absolute",
                top: subTop,
                left: 0,
                width: cardW,
                height: 0,
              }}
            >
              {subLine.words.map((word, i) => {
                const appearAt =
                  subheadlineStartFrame + i * subheadlineStrideFrames;
                const opacity = clamp01(
                  (frame - appearAt) / subheadlineFadeFrames,
                );
                if (opacity <= 0) {
                  return null;
                }
                const lead = cardW / 2 + subLine.totalWidth / 2;
                const left = rtl
                  ? lead - word.offset - word.width
                  : cardW / 2 - subLine.totalWidth / 2 + word.offset;
                return (
                  <span
                    key={`s-${i}`}
                    dir="rtl"
                    style={{
                      position: "absolute",
                      left,
                      top: -subSize * 0.72,
                      width: word.width,
                      fontFamily: FONT_STACK,
                      fontWeight: FONT_WEIGHT_MEDIUM,
                      fontSize: subSize,
                      lineHeight: 1.2,
                      color: fontColor,
                      opacity,
                      whiteSpace: "pre",
                    }}
                  >
                    {word.text}
                  </span>
                );
              })}
            </div>
          ) : null}

          {/* ٣و — الكابشن */}
          {captions.length > 0 ? (
            <CaptionLayer
              captions={captions}
              fontColor={fontColor}
              fontSize={captionSize}
              top={captionTop}
              fadeFrames={captionFadeFrames}
            />
          ) : null}
        </div>
      </AbsoluteFill>

      {/* الطبقة ٤ — الصوت */}
      {voiceover ? (
        <Sequence from={0}>
          <Audio src={resolveSrc(voiceover)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
   حساب المدة من المحتوى
   ──────────────────────────────────────────────────────────────────────── */

export const calculateTemplateMetadata: CalculateMetadataFunction<
  TemplateProps
> = async ({ props, defaultProps: dp }) => {
  const fps = 30;
  const merged = { ...dp, ...props };

  return {
    durationInFrames: await contentDurationInFrames({
      fps,
      voiceover: merged.voiceover ? resolveSrc(merged.voiceover) : null,
      media: merged.media ? resolveSrc(merged.media) : null,
      captions: merged.captions,
      fallbackInFrames: merged.fallbackDurationInFrames,
    }),
  };
};
