import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
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
import { WordClicks, cueWordOnsets } from "../../lib/word-clicks.jsx";

/**
 * خط القالب هو خط المشروع لا خط جوجل.
 *
 * الأصل كان يحمّل Cairo من @remotion/google-fonts. كل قوالب هذا المشروع
 * تشترك في ملفَّي خط واحدين داخل public/fonts، وتحميل عائلة ثانية يعني
 * delayRender إضافياً وخطاً غريباً عن بقية المعرض — فاستُبدل بالمكدّس
 * المشترك بوزنيه: الأسود للنص الرئيسي والمتوسط للثانوي.
 */
const fontFamily = FONT_STACK;

/* -------------------------------------------------------------------------- */
/*  ثوابت الهوية البصرية                                                       */
/*  كل الأرقام مقاسة من الفيديو المرجعي بدقة 1080×1920 ثم تُحوَّل لنِسب،        */
/*  عشان القالب يشتغل صح على أي مقاس بدون ما تتغيّر النسب بين العناصر.          */
/* -------------------------------------------------------------------------- */

const REF_WIDTH = 1080;
const REF_HEIGHT = 1920;

/** كرت الوسائط: مقاس من الفريم عند الثانية 23.3 — x[121,960] y[211,1708] */
const MEDIA_CARD = {
  left: 121,
  top: 211,
  width: 839,
  height: 1497,
};

/** كرت الصدى: مقاس من الفريم عند الثانية 24.0 — x[108,971] y[434,1583] */
const ECHO_CARD = {
  left: 108,
  top: 434,
  width: 863,
  height: 1149,
};

/** مقاس خط النص المكرر: 106px مرجعي يعطي عرض نص 618px المقاس في الأصل */
const ECHO_FONT_SIZE = 106;

/** المسافة بين مراكز الأسطر المكررة: 177px مقاسة بين حزم البكسل (755→932→1108) */
const ECHO_LINE_PITCH = 177;

/**
 * إزاحة كتلة النص لأعلى. كتلة النص الأصلية مركزها y=998 بينما مركز الكرت 1008.5،
 * يعني النص مرفوع 10px عن المنتصف — تفصيلة صغيرة لكنها جزء من إحساس التصميم.
 */
const ECHO_BLOCK_NUDGE = -10;

/** مقاس النص الثانوي داخل الكرت */
const SUBHEADLINE_FONT_SIZE = 44;

/** مقاسات الكابشن حسب موضعه */
const CAPTION_FONT_SIZE_BACKGROUND = 68;
const CAPTION_FONT_SIZE_OVER_CARD = 34;

/** مسافة الكابشن عن حواف الكرت في وضع overCard */
const CAPTION_CARD_PADDING = 28;

/** إزاحة الظل لأسفل وقوة تنعيمه — يقابل Gaussian blur بنصف قطر 26 في الأصل */
const SHADOW_OFFSET_Y = 14;
const SHADOW_BLUR = 52;

/* -------------------------------------------------------------------------- */
/*  دوال مساعدة                                                                */
/* -------------------------------------------------------------------------- */

/** يحوّل مسار نسبي إلى ملف داخل public، ويترك المطلق و blob: كما هو */
const resolveSrc = (src) => resolveAsset(src, staticFile);

/**
 * منحنى دخول الكرت.
 * قِسْتُ موضع الكرت في 12 فريم متتالية من الفيديو الأصلي وطابقتها رياضياً،
 * والنتيجة كانت ease-out cubic بالضبط: p = 1 - (1-x)³ — بدون أي ارتداد.
 */
const SLIDE_EASING = Easing.out(Easing.cubic);

/**
 * يحسب إزاحة الكرت في الفريم الحالي.
 * ملاحظة على `localFrame + 1`: في الفريم رقم 0 يكون الكرت قد تحرّك خطوة واحدة
 * أصلاً — هذا مطابق للفيديو الأصلي، حيث أول فريم ظاهر للكرت يكون قد قطع 40% من المسافة.
 */
const getSlideOffset = ({
  localFrame,
  slideDurationInFrames,
  direction,
  card,
  canvasWidth,
  canvasHeight,
}) => {
  const progress = interpolate(
    localFrame + 1,
    [0, slideDurationInFrames],
    [0, 1],
    {
      easing: SLIDE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const remaining = 1 - progress;

  switch (direction) {
    case "bottom":
      return {
        translateX: 0,
        translateY: (canvasHeight - card.top) * remaining,
      };
    case "top":
      return {
        translateX: 0,
        translateY: -(card.top + card.height) * remaining,
      };
    case "left":
      return {
        translateX: -(card.left + card.width) * remaining,
        translateY: 0,
      };
    case "right":
      return {
        translateX: (canvasWidth - card.left) * remaining,
        translateY: 0,
      };
    default:
      return { translateX: 0, translateY: 0 };
  }
};

/**
 * يحسب شفافية النص داخل الكرت.
 * في الأصل: النص معدوم حتى الفريم 9، نصف ظاهر في الفريم 10، كامل في الفريم 11.
 */
const getTextOpacity = ({ localFrame, delayFrames, fadeFrames }) =>
  interpolate(localFrame + 1, [delayFrames, delayFrames + fadeFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/* -------------------------------------------------------------------------- */
/*  طبقة الظل + جسم الكرت                                                      */
/* -------------------------------------------------------------------------- */

const useScale = () => {
  const { width, height } = useVideoConfig();
  return {
    sx: (px) => (px / REF_WIDTH) * width,
    sy: (px) => (px / REF_HEIGHT) * height,
  };
};

const Card = ({
  card,
  color,
  cornerRadius,
  shadowOpacity,
  offset,
  children,
}) => {
  const { sx, sy } = useScale();

  return (
    <div
      style={{
        position: "absolute",
        left: sx(card.left),
        top: sy(card.top),
        width: sx(card.width),
        height: sy(card.height),
        backgroundColor: color,
        borderRadius: sx(cornerRadius),
        boxShadow: `0 ${sy(SHADOW_OFFSET_Y)}px ${sx(
          SHADOW_BLUR,
        )}px rgba(60, 48, 40, ${shadowOpacity})`,
        transform: `translate(${sx(offset.translateX)}px, ${sy(
          offset.translateY,
        )}px)`,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  مشهد كرت الصدى                                                             */
/* -------------------------------------------------------------------------- */

const EchoScene = ({
  headline,
  subheadline,
  cardColor,
  cardTextColor,
  echoScene,
  motion,
}) => {
  const localFrame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { sx, sy } = useScale();

  const offset = getSlideOffset({
    localFrame,
    slideDurationInFrames: motion.slideDurationInFrames,
    direction: motion.slideDirection,
    card: ECHO_CARD,
    canvasWidth: REF_WIDTH,
    canvasHeight: REF_HEIGHT,
  });

  const lines = Array.from(
    { length: echoScene.repeatCount },
    (_, index) => index,
  );

  // ارتفاع كتلة النص كاملة، عشان نوسّطها رأسياً داخل الكرت
  const blockHeight = echoScene.repeatCount * ECHO_LINE_PITCH;
  const blockTop = (ECHO_CARD.height - blockHeight) / 2 + ECHO_BLOCK_NUDGE;

  return (
    <AbsoluteFill>
      <Card
        card={ECHO_CARD}
        color={cardColor}
        cornerRadius={motion.cornerRadius}
        shadowOpacity={motion.shadowOpacity}
        offset={offset}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: sy(blockTop),
            width: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {lines.map((index) => {
            const lineOpacity = getTextOpacity({
              localFrame,
              delayFrames:
                motion.textDelayFrames + index * echoScene.staggerFrames,
              fadeFrames: motion.textFadeFrames,
            });

            return (
              <div
                key={index}
                style={{
                  height: sy(ECHO_LINE_PITCH),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily,
                  fontWeight: FONT_WEIGHT_BLACK,
                  fontSize: sx(ECHO_FONT_SIZE),
                  lineHeight: 1,
                  color: cardTextColor,
                  direction: "rtl",
                  whiteSpace: "nowrap",
                  opacity: lineOpacity * (1 - index * echoScene.opacityFalloff),
                }}
              >
                {headline}
              </div>
            );
          })}
        </div>

        {subheadline === null ? null : (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: sy(blockTop + blockHeight),
              width: "100%",
              textAlign: "center",
              fontFamily,
              fontWeight: FONT_WEIGHT_MEDIUM,
              fontSize: sx(SUBHEADLINE_FONT_SIZE),
              lineHeight: 1.4,
              color: cardTextColor,
              direction: "rtl",
              opacity:
                getTextOpacity({
                  localFrame,
                  // النص الثانوي يتأخر فريمين إضافيين عن آخر سطر مكرر
                  delayFrames:
                    motion.textDelayFrames +
                    echoScene.repeatCount * echoScene.staggerFrames +
                    2,
                  fadeFrames: motion.textFadeFrames,
                }) * 0.85,
              paddingLeft: sx(60),
              paddingRight: sx(60),
              boxSizing: "border-box",
            }}
          >
            {subheadline}
          </div>
        )}
      </Card>
      {/* width و height مستخدمتان لضمان إعادة الحساب عند تغيّر مقاس التركيب */}
      <div style={{ display: "none" }}>{`${width}x${height}`}</div>
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------------------- */
/*  مشهد الوسائط                                                               */
/* -------------------------------------------------------------------------- */

const MediaScene = ({ media, mediaFit, mediaMuted, cardColor, motion }) => {
  const localFrame = useCurrentFrame();

  const offset = getSlideOffset({
    localFrame,
    slideDurationInFrames: motion.slideDurationInFrames,
    direction: motion.slideDirection,
    card: MEDIA_CARD,
    canvasWidth: REF_WIDTH,
    canvasHeight: REF_HEIGHT,
  });

  // @remotion/media يتجاهل objectFit داخل style ويطبع تحذيراً — يمرَّر خاصيةً
  const fillStyle = {
    width: "100%",
    height: "100%",
  };

  return (
    <AbsoluteFill>
      <Card
        card={MEDIA_CARD}
        color={cardColor}
        cornerRadius={motion.cornerRadius}
        shadowOpacity={motion.shadowOpacity}
        offset={offset}
      >
        {isVideoSource(media) ? (
          <Video
            src={resolveSrc(media)}
            muted={mediaMuted}
            objectFit={mediaFit}
            style={fillStyle}
          />
        ) : (
          <Img
            src={resolveSrc(media)}
            style={{ ...fillStyle, objectFit: mediaFit }}
          />
        )}
      </Card>
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------------------- */
/*  طبقة الكابشن                                                               */
/* -------------------------------------------------------------------------- */

const CaptionLayer = ({ captions, captionStyle, fontColor, cardTextColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { sx, sy } = useScale();

  const currentMs = (frame / fps) * 1000;
  const active = captions.find(
    (cue) => currentMs >= cue.startMs && currentMs < cue.endMs,
  );

  if (active === undefined) {
    return null;
  }

  // حركة الدخول تُحسب من فريم بداية الكابشن نفسه، مو من بداية الفيديو
  const cueStartFrame = (active.startMs / 1000) * fps;
  const framesSinceStart = frame - cueStartFrame;

  const appear = interpolate(
    framesSinceStart,
    [0, captionStyle.enterFrames],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // ارتفاع بسيط أثناء الظهور — 20px مرجعي، خفيف بحيث ما يسرق الانتباه
  const riseY = interpolate(appear, [0, 1], [20, 0]);

  const isOverCard = captionStyle.placement === "overCard";

  const boxStyle = isOverCard
    ? {
        position: "absolute",
        left: sx(MEDIA_CARD.left + CAPTION_CARD_PADDING),
        top: sy(MEDIA_CARD.top + CAPTION_CARD_PADDING),
        width: sx(MEDIA_CARD.width - CAPTION_CARD_PADDING * 2),
        textAlign: "right",
        fontSize: sx(CAPTION_FONT_SIZE_OVER_CARD),
        color: cardTextColor,
      }
    : {
        position: "absolute",
        left: "11%",
        width: "78%",
        top: `${captionStyle.yRatio * 100}%`,
        transform: "translateY(-50%)",
        textAlign: "center",
        fontSize: sx(CAPTION_FONT_SIZE_BACKGROUND),
        color: fontColor,
      };

  return (
    <AbsoluteFill>
      <div
        style={{
          ...boxStyle,
          fontFamily,
          fontWeight: FONT_WEIGHT_BLACK,
          lineHeight: 1.35,
          direction: "rtl",
          opacity: appear,
          translate: `0 ${sy(riseY)}px`,
        }}
      >
        {active.text}
      </div>
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------------------- */
/*  المكوّن الرئيسي                                                            */
/* -------------------------------------------------------------------------- */

export const Template = ({
  backgroundColor,
  cardColor,
  cardTextColor,
  fontColor,
  logo,
  logoWidthRatio,
  logoTopRatio,
  headline,
  subheadline,
  echoScene,
  media,
  mediaFit,
  mediaMuted,
  mediaScene,
  motion,
  voiceover,
  clickSfx,
  clickVolume,
  captions,
  captionStyle,
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  // نقرة مع كل كلمة: الكابشن هنا يظهر كتلةً، فتوزَّع كلماته على مدّته ما لم
  // يوفّر ملف SRT توقيتاً صريحاً لكل كلمة
  const clickOnsets = useMemo(
    () => (clickSfx ? cueWordOnsets(captions) : []),
    [captions, clickSfx],
  );

  const hasMediaScene = Boolean(media);

  /**
   * موضع كرت الصدى في التايم لاين: يقعد آخر المدة كلما سبقه محتوى — نفس
   * ترتيب الفيديو المرجعي — ويصير الفيديو كلَّه حين لا يسبقه شيء.
   *
   * الأصل كان يشترط وجود وسائط وحدها، فمن يرفع ملف SRT بلا مقطع كان كرت
   * الصدى يبتلع أول 49 فريماً وتُقصّ نافذة الكابشن إلى فريم واحد: ترجمة
   * مستوردة لا تظهر أبداً.
   */
  const hasIntro = hasMediaScene || captions.length > 0 || voiceover !== null;
  const echoStart =
    echoScene.startFrame ??
    (hasIntro ? Math.max(0, durationInFrames - echoScene.durationInFrames) : 0);

  const mediaSceneDuration = Math.max(1, echoStart);

  // نستخدم mediaScene.minDurationInFrames كأرضية بصرية، عشان ما يومض المشهد
  const effectiveMediaDuration = Math.max(
    mediaSceneDuration,
    hasMediaScene ? Math.min(mediaScene.minDurationInFrames, echoStart) : 1,
  );

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {voiceover === null ? null : <Audio src={resolveSrc(voiceover)} />}

      <WordClicks
        src={clickSfx}
        volume={clickVolume}
        onsetsMs={clickOnsets}
        fps={fps}
      />

      {hasMediaScene ? (
        <Sequence
          from={0}
          durationInFrames={effectiveMediaDuration}
          layout="none"
        >
          <MediaScene
            media={media}
            mediaFit={mediaFit}
            mediaMuted={mediaMuted}
            cardColor={cardColor}
            motion={motion}
          />
        </Sequence>
      ) : null}

      <Sequence
        from={echoStart}
        durationInFrames={echoScene.durationInFrames}
        layout="none"
      >
        <EchoScene
          headline={headline}
          subheadline={subheadline}
          cardColor={cardColor}
          cardTextColor={cardTextColor}
          echoScene={echoScene}
          motion={motion}
        />
      </Sequence>

      {captions.length === 0 ? null : (
        <Sequence
          from={0}
          durationInFrames={
            captionStyle.showDuringEchoScene
              ? durationInFrames
              : Math.max(1, echoStart)
          }
          layout="none"
        >
          <CaptionLayer
            captions={captions}
            captionStyle={captionStyle}
            fontColor={fontColor}
            cardTextColor={cardTextColor}
          />
        </Sequence>
      )}

      {logo === null ? null : (
        <AbsoluteFill>
          <Img
            src={resolveSrc(logo)}
            style={{
              position: "absolute",
              top: `${logoTopRatio * 100}%`,
              left: "50%",
              width: `${logoWidthRatio * 100}%`,
              transform: "translateX(-50%)",
              objectFit: "contain",
            }}
          />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
