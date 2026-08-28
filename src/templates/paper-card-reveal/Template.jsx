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
import { Audio, Video } from "@remotion/media";
import {
  FONT_STACK,
  FONT_WEIGHT_BLACK,
  FONT_WEIGHT_MEDIUM,
} from "../../lib/fonts.js";
import { sanitizeSaltIndices } from "../../lib/thmanyah-aesthetics.js";
import { isVideoSource } from "../../lib/duration.js";
import { resolveAsset } from "../../lib/asset-url.js";
/* ------------------------------------------------------------------ *
 * ثوابت الهوية — قواعد دليل جماليات خط ثمانية، مكتوبة داخل القالب
 * لأنها جزء من الهوية لا من المحتوى.
 * ------------------------------------------------------------------ */
/** الأحرف المرسلة. لا تُفعَّل إلا على كلمة واحدة، ولا على كلمتين متجاورتين. */
const FEATURE_SWASH = '"salt" 1';
/**
 * امتداد الفتحة فوق الكشيدة المائلة. اخترنا ss03 (درجة متوسطة) عمداً
 * لا ss07، لأن الدليل ينص: لا تُستخدم إلى أقصى حدّ لها.
 */
const FEATURE_KASHIDA = '"ss03" 1';
/** محرف التطويل العربي — هو الكشيدة نفسها. */
const TATWEEL = "\u0640";
/** طول التطويل داخل الكلمة: مرة واحدة فقط، بمقدار محرفين. */
const KASHIDA_LENGTH = 2;
/** الأصل ١٠٨٠×١٩٢٠. كل الأحجام تُقاس نسبةً لهذا حتى يتكيّف القالب مع أي مقاس. */
const REFERENCE_HEIGHT = 1920;
/* ------------------------------------------------------------------ *
 * أدوات
 * ------------------------------------------------------------------ */
/**
 * يُدخل كشيدة واحدة في منتصف أول كلمة تقبلها.
 * الشرط: الحرف السابق يجب أن يكون قابلاً للوصل، وإلا انكسرت الكلمة.
 */
const NON_JOINING_AFTER = new Set([
  "ا",
  "أ",
  "إ",
  "آ",
  "د",
  "ذ",
  "ر",
  "ز",
  "و",
  "ؤ",
  "ة",
  "ى",
  "ء",
  " ",
]);
const applyKashida = (word) => {
  // نبحث عن أفضل موضع وصل قرب منتصف الكلمة
  const mid = Math.floor(word.length / 2);
  for (let offset = 0; offset < word.length; offset++) {
    for (const dir of [-1, 1]) {
      const i = mid + dir * offset;
      if (i <= 0 || i >= word.length) continue;
      const prev = word[i - 1];
      if (prev === undefined || NON_JOINING_AFTER.has(prev)) continue;
      return word.slice(0, i) + TATWEEL.repeat(KASHIDA_LENGTH) + word.slice(i);
    }
  }
  return word;
};
/** يطبّق الكشيدة على أطول كلمة في السطر — مرة واحدة في السطر كله. */
const kashidaLine = (line) => {
  const words = line.split(" ");
  let bestIndex = -1;
  let bestLength = 0;
  words.forEach((w, i) => {
    if (w.length > bestLength) {
      bestLength = w.length;
      bestIndex = i;
    }
  });
  if (bestIndex === -1) return line;
  return words.map((w, i) => (i === bestIndex ? applyKashida(w) : w)).join(" ");
};
/** يختار الكابشن الموافق للفريم الحالي. */
const pickCaption = (captions, currentMs) => {
  for (const c of captions) {
    if (c.startMs <= currentMs && currentMs < c.endMs) return c;
  }
  return null;
};
// تحليل المسار واكتشاف الفيديو مشتركان — يتعاملان مع blob URL بلا امتداد
/* ------------------------------------------------------------------ *
 * طبقة ١ — الخلفية الورقية
 * ------------------------------------------------------------------ */
const PaperBackground = ({ color, grainOpacity, lightIntensity }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: color }}>
      {/* إضاءة نافذة مائلة من أعلى اليسار نحو أسفل اليمين */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg,
            rgba(255,255,255,${lightIntensity * 0.55}) 0%,
            rgba(255,255,255,0) 42%,
            rgba(120,105,95,${lightIntensity * 0.3}) 68%,
            rgba(120,105,95,0) 100%)`,
        }}
      />
      {/* فينييت خفيف يُجلس البطاقة داخل الورقة */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 78% 62% at 50% 48%, rgba(0,0,0,0) 55%, rgba(60,50,45,0.10) 100%)",
        }}
      />
      {/* حُبيبات الورق — feTurbulence بـ seed ثابت، فالنتيجة deterministic تماماً */}
      <AbsoluteFill style={{ opacity: grainOpacity, mixBlendMode: "multiply" }}>
        <svg width="100%" height="100%">
          <filter id="paper-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves={3}
              seed={7}
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#paper-grain)" />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
/* ------------------------------------------------------------------ *
 * طبقة ٢ — الهوية أعلى الإطار
 * ------------------------------------------------------------------ */
const DefaultMark = ({ size, color }) => {
  // زهرة ثمانية البتلات، متجهة، تُرسم من ٨ معيّنات ممدودة حول المركز
  const petals = useMemo(() => {
    const out = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const pts = [
        [0.18, 0.3],
        [0.62, 0.42],
        [1.0, 0.0],
        [0.62, -0.42],
        [0.18, -0.3],
      ];
      const d = pts
        .map(([t, w], k) => {
          const x = 50 + (Math.cos(a) * t - Math.sin(a) * w) * 50;
          const y = 50 + (Math.sin(a) * t + Math.cos(a) * w) * 50;
          return `${k === 0 ? "M" : "L"}${x.toFixed(3)},${y.toFixed(3)}`;
        })
        .join(" ");
      out.push(`${d} Z`);
    }
    return out;
  }, []);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {petals.map((d, i) => (
        <path key={i} d={d} fill={color} />
      ))}
    </svg>
  );
};
const BrandLockup = ({ logo, brandName, color, letterSpacing, scale }) => {
  const markSize = 64 * scale;
  const wordSize = 30 * scale;
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "flex-start",
        // مركز العلامة عند ٥٫٨٪ من الارتفاع، والووردمارك عند ٧٫٦٪ — مقاسان من المرجع
        paddingTop: `${5.8 - (64 / REFERENCE_HEIGHT) * 100 * 0.5}%`,
      }}
    >
      {logo ? (
        <Img
          src={resolveAsset(logo, staticFile)}
          style={{ width: markSize, height: markSize, objectFit: "contain" }}
        />
      ) : (
        <DefaultMark size={markSize} color={color} />
      )}
      <div
        style={{
          fontFamily: FONT_STACK,
          fontWeight: FONT_WEIGHT_MEDIUM,
          fontSize: wordSize,
          color,
          letterSpacing: `${letterSpacing}em`,
          // نصف التباعد يُضاف بعد آخر حرف، فنزيحه لليسار ليبقى البصر متمركزاً
          marginRight: `-${letterSpacing}em`,
          marginTop: 10 * scale,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {brandName}
      </div>
    </AbsoluteFill>
  );
};
/* ------------------------------------------------------------------ *
 * طبقة ٣ — الكابشن داخل البطاقة
 * ------------------------------------------------------------------ */
const CaptionLine = ({
  text,
  swashWordIndex,
  color,
  strokeColor,
  fontSize,
}) => {
  const words = text.split(" ").filter(Boolean);
  // كلمة واحدة فقط في الكابشن — يمرّ الطلب على مصفّي دليل ثمانية بدل
  // الاعتماد على أن الرقم المُدخل يقع على كلمة لها بديل ممتد أصلاً.
  const approved = useMemo(
    () =>
      new Set(
        sanitizeSaltIndices(
          words,
          swashWordIndex >= 0 ? [swashWordIndex] : [],
          {
            maxPerWords: words.length,
          },
        ),
      ),
    [words, swashWordIndex],
  );
  return (
    <div
      dir="rtl"
      style={{
        fontFamily: FONT_STACK,
        fontWeight: FONT_WEIGHT_BLACK,
        fontSize,
        color,
        lineHeight: 1.25,
        textAlign: "center",
        // الستروك يُبقي الكابشن مقروءاً فوق أي لقطة
        WebkitTextStroke: `${fontSize * 0.05}px ${strokeColor}`,
        paintOrder: "stroke fill",
        display: "flex",
        flexDirection: "row-reverse",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `0 ${fontSize * 0.28}px`,
      }}
    >
      {words.map((w, i) => (
        <span
          key={`${i}-${w}`}
          style={{
            // حرف مرسل على كلمة واحدة فقط — لا على كلمتين متجاورتين
            fontFeatureSettings: approved.has(i) ? FEATURE_SWASH : "normal",
          }}
        >
          {w}
        </span>
      ))}
    </div>
  );
};
/* ------------------------------------------------------------------ *
 * طبقة ٤ — محتوى البطاقة: المشهد النصي
 * ------------------------------------------------------------------ */
const TextScene = ({
  headline,
  subheadline,
  cardColor,
  fontColor,
  opacity,
  scale,
}) => {
  const headlineSize = 132 * scale;
  const subSize = 52 * scale;
  return (
    <AbsoluteFill style={{ backgroundColor: cardColor }}>
      <AbsoluteFill
        style={{
          opacity,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          // إزاحة بسيطة لأعلى: كتلة النص في المرجع تجلس أعلى مركز البطاقة قليلاً
          paddingBottom: "6%",
        }}
      >
        {headline.map((line, i) => (
          <div
            key={i}
            dir="rtl"
            style={{
              fontFamily: FONT_STACK,
              fontWeight: FONT_WEIGHT_BLACK,
              fontSize: headlineSize,
              color: fontColor,
              // ‎1.34 = المسافة بين مراكز الأسطر في المرجع (١٢٫٥٪ من الارتفاع)
              lineHeight: 1.34,
              whiteSpace: "nowrap",
              fontFeatureSettings: line.kashida ? FEATURE_KASHIDA : "normal",
            }}
          >
            {line.kashida ? kashidaLine(line.text) : line.text}
          </div>
        ))}
        {subheadline ? (
          <div
            dir="rtl"
            style={{
              fontFamily: FONT_STACK,
              fontWeight: FONT_WEIGHT_MEDIUM,
              fontSize: subSize,
              color: fontColor,
              opacity: 0.78,
              marginTop: headlineSize * 0.45,
              whiteSpace: "nowrap",
            }}
          >
            {subheadline}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
/* ------------------------------------------------------------------ *
 * طبقة ٥ — محتوى البطاقة: مشهد الوسائط
 * ------------------------------------------------------------------ */
const MediaScene = ({
  media,
  muted,
  cardColor,
  fontColor,
  strokeColor,
  caption,
  swashWordIndex,
  scale,
}) => {
  const fill = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };
  return (
    <AbsoluteFill style={{ backgroundColor: cardColor }}>
      {media ? (
        isVideoSource(media) ? (
          <Video
            src={resolveAsset(media, staticFile)}
            muted={muted}
            style={fill}
          />
        ) : (
          <Img src={resolveAsset(media, staticFile)} style={fill} />
        )
      ) : null}

      {/* تدرّج سفلي خفيف يفصل الكابشن عن الصورة */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0) 34%)",
        }}
      />

      {caption ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "flex-end",
            // الكابشن عند ٨٨٪ من ارتفاع البطاقة — داخلها لا فوق الإطار،
            // حتى يُقتص مع البطاقة أثناء دخولها.
            paddingBottom: "8%",
            paddingLeft: "6%",
            paddingRight: "6%",
          }}
        >
          <CaptionLine
            text={caption}
            swashWordIndex={swashWordIndex}
            color={fontColor}
            strokeColor={strokeColor}
            fontSize={58 * scale}
          />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
/* ------------------------------------------------------------------ *
 * المكوّن الرئيسي
 * ------------------------------------------------------------------ */
export const PaperCardTemplate = ({
  backgroundColor,
  fontColor,
  cardColor,
  brandColor,
  captionStrokeColor,
  logo,
  brandName,
  brandLetterSpacing,
  headline,
  subheadline,
  media,
  mediaMuted,
  voiceover,
  captions,
  captionSwashWordIndex,
  cardWidthPct,
  cardTopPct,
  cardHeightPct,
  cardRadiusPct,
  slideStartSec,
  slideDurationSec,
  slideDirection,
  textFadeSec,
  textFadeDurationSec,
  cutSec,
  grainOpacity,
  lightIntensity,
  shadowIntensity,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  // معامل التحجيم: كل الأحجام النصية مقاسة على ارتفاع ١٩٢٠
  const scale = height / REFERENCE_HEIGHT;
  // هندسة البطاقة بالبكسل
  const cardW = width * cardWidthPct;
  const cardH = height * cardHeightPct;
  const cardX = (width - cardW) / 2;
  const cardY = height * cardTopPct;
  const radius = cardW * cardRadiusPct;
  // ---------- حركة الدخول ----------
  const slideStartFrame = slideStartSec * fps;
  const slideEndFrame = (slideStartSec + slideDurationSec) * fps;
  const progress = interpolate(
    frame,
    [slideStartFrame, slideEndFrame],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      // ease-out cubic — مطابق لمنحنى Slide Up في المرجع:
      // انطلاقة سريعة ثم استقرار ناعم، بلا ارتداد.
      easing: (t) => 1 - Math.pow(1 - t, 3),
    },
  );
  // مسافة الخروج: البطاقة تبدأ خارج الإطار تماماً في الاتجاه المختار
  const offsets = {
    up: [0, height - cardY + radius],
    down: [0, -(cardY + cardH + radius)],
    left: [width - cardX + radius, 0],
    right: [-(cardX + cardW + radius), 0],
  };
  const [dx, dy] = offsets[slideDirection];
  const translateX = dx * (1 - progress);
  const translateY = dy * (1 - progress);
  // ---------- ظهور النص ----------
  const textOpacity = interpolate(
    frame,
    [textFadeSec * fps, (textFadeSec + textFadeDurationSec) * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // ---------- القطع ----------
  // قطع حاد بلا انتقال — هذا جزء أساسي من إحساس اللقطة.
  const cutFrame = Math.round(cutSec * fps);
  const showMedia = Boolean(media) && frame >= cutFrame;
  // ---------- الكابشن ----------
  const currentMs = (frame / fps) * 1000;
  const activeCaption = pickCaption(captions, currentMs);
  const cardBox = {
    position: "absolute",
    left: cardX,
    top: cardY,
    width: cardW,
    height: cardH,
    transform: `translate(${translateX}px, ${translateY}px)`,
  };
  return (
    <AbsoluteFill>
      <PaperBackground
        color={backgroundColor}
        grainOpacity={grainOpacity}
        lightIntensity={lightIntensity}
      />

      <BrandLockup
        logo={logo}
        brandName={brandName}
        color={brandColor}
        letterSpacing={brandLetterSpacing}
        scale={scale}
      />

      {/* ظل البطاقة — طبقة مستقلة حتى لا يُقتص مع محتوى البطاقة */}
      {progress > 0 ? (
        <div
          style={{
            ...cardBox,
            borderRadius: radius,
            // الظل يميل لأسفل قليلاً ليطابق زاوية إضاءة الورق
            boxShadow: `0 ${26 * scale}px ${52 * scale}px rgba(90,78,70,${shadowIntensity})`,
          }}
        />
      ) : null}

      {/* البطاقة نفسها — إطار ثابت، والمحتوى بداخله هو الذي يتبدّل */}
      {progress > 0 ? (
        <div
          style={{
            ...cardBox,
            borderRadius: radius,
            overflow: "hidden",
          }}
        >
          <Sequence from={0} durationInFrames={showMedia ? cutFrame : Infinity}>
            <TextScene
              headline={headline}
              subheadline={subheadline}
              cardColor={cardColor}
              fontColor={fontColor}
              opacity={textOpacity}
              scale={scale}
            />
          </Sequence>

          {media ? (
            <Sequence from={cutFrame}>
              <MediaScene
                media={media}
                muted={mediaMuted}
                cardColor={cardColor}
                fontColor={fontColor}
                strokeColor={captionStrokeColor}
                caption={activeCaption ? activeCaption.text : null}
                swashWordIndex={captionSwashWordIndex}
                scale={scale}
              />
            </Sequence>
          ) : null}
        </div>
      ) : null}

      {voiceover ? <Audio src={resolveAsset(voiceover, staticFile)} /> : null}
    </AbsoluteFill>
  );
};
