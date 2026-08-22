import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import type { Caption, TemplateProps } from './schema';
import {
  FONT_STACK,
  FONT_WEIGHT_BLACK,
  FONT_WEIGHT_MEDIUM,
} from '../../lib/fonts';
import {
  sanitizeSaltIndices,
  saltFeatureSettings,
} from '../../lib/thmanyah-aesthetics';

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
} as const;

/* ------------------------------------------------------------------ *
 *  منحنى التسارع
 *  ليست easing جاهزة: هذي القيم مقيسة إطاراً بإطار من المرجع.
 *  البداية بطيئة قليلاً ثم تلحق بسرعة في الثلث الأخير — وهذا ما يعطي
 *  الحركة إحساس "الشد ثم الانفتاح" بدل الانزلاق الميكانيكي.
 * ------------------------------------------------------------------ */
const EASE_INPUT = [0, 0.145, 0.427, 0.573, 0.855, 1] as number[];
const EASE_OUTPUT = [0, 0.147, 0.326, 0.453, 0.832, 1] as number[];

const revealEase = (linearProgress: number): number =>
  interpolate(linearProgress, EASE_INPUT, EASE_OUTPUT, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** يحوّل مساراً نسبياً إلى staticFile، ويترك الروابط المطلقة كما هي. */
const resolveAsset = (path: string): string =>
  path.startsWith('http') || path.startsWith('/') || path.startsWith('data:')
    ? path
    : staticFile(path);

/** يختار الكابشن المطابق للفريم الحالي. */
const pickCaption = (captions: Caption[], currentMs: number): Caption | null => {
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
export const calculateMetadata: CalculateMetadataFunction<TemplateProps> = async ({
  props,
  defaultProps,
  abortSignal,
}) => {
  void defaultProps;
  void abortSignal;

  const fps = 30;

  // ١) لو فيه تعليق صوتي فهو صاحب القرار في طول الفيديو.
  if (props.voiceover) {
    const seconds = await getAudioDurationInSeconds(resolveAsset(props.voiceover));
    return {
      durationInFrames: Math.max(1, Math.ceil(seconds * fps)),
      fps,
    };
  }

  // ٢) وإلا فآخر كابشن يحدد النهاية، مع ذيل نصف ثانية للتنفّس.
  if (props.captions.length > 0) {
    const lastMs = Math.max(...props.captions.map((caption) => caption.endMs));
    return {
      durationInFrames: Math.max(1, Math.ceil((lastMs / 1000) * fps) + Math.round(fps * 0.5)),
      fps,
    };
  }

  // ٣) وإلا مدة ثابتة تكفي لعرض الحركة كاملة والاستقرار بعدها.
  const minimum = props.revealDelayInFrames + props.revealDurationInFrames + props.textDelayInFrames;
  return {
    durationInFrames: Math.max(minimum + Math.round(fps * 1.5), Math.round(fps * 2.5)),
    fps,
  };
};

/* ------------------------------------------------------------------ *
 *  المكوّن
 * ------------------------------------------------------------------ */
export const Template: React.FC<TemplateProps> = ({
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
  voiceover,
  voiceoverVolume,
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
  saltWordIndices,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // معامل واحد يربط المساحة المرجعية بأبعاد الفيديو الحقيقية.
  const scale = Math.min(width / REF_W, height / REF_H);
  const px = (value: number): number => value * scale;

  // مركزة لوح التصميم داخل الإطار مهما كانت النسبة.
  const stageLeft = (width - REF_W * scale) / 2;
  const stageTop = (height - REF_H * scale) / 2;

  /* ---------- حركة التمدد ---------- */
  const revealLinear = interpolate(
    frame,
    [revealDelayInFrames, revealDelayInFrames + revealDurationInFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const revealProgress = revealEase(revealLinear);

  // المحور القصير هو الذي يبدأ شبه معدوم؛ الطويل يبدأ شبه مكتمل.
  const minorScale = interpolate(revealProgress, [0, 1], [revealStartScaleMinor, 1]);
  const majorScale = interpolate(revealProgress, [0, 1], [revealStartScaleMajor, 1]);

  const isVertical = revealDirection === 'vertical';
  const scaleX = isVertical ? majorScale : minorScale;
  const scaleY = isVertical ? minorScale : majorScale;

  // الارتكاز يميل قليلاً نحو الأعلى، فتنزل الحافة السفلية أكثر مما تصعد العلوية.
  const originX = isVertical ? 50 : revealAnchor * 100;
  const originY = isVertical ? revealAnchor * 100 : 50;

  /* ---------- ظهور النص ---------- */
  const textStart = revealDelayInFrames + revealDurationInFrames + textDelayInFrames;
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
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      )
    : 0;

  const cardRadius = px(cardRadiusRatio * REF_W);
  const mediaRadius = px(mediaRadiusRatio * REF_W);
  const cardCenterX = LAYOUT.card.left + LAYOUT.card.width / 2;

  const mediaSource = media ? resolveAsset(media) : null;

  /* ---------- الأحرف المرسلة (salt) على العنوان ---------- */
  // العنوان فقط: قصير ومحدود بـ ٣٨ حرفاً، وهو الموضع الوحيد الذي يسمح فيه
  // دليل ثمانية بالأحرف المرسلة. الثانوي والكابشن نصوص طويلة فتُمنع عليهما.
  const headlineWords = useMemo(
    () => headline.split(/\s+/u).filter((w) => w.length > 0),
    [headline],
  );
  const approvedSalt = useMemo(
    () => new Set(sanitizeSaltIndices(headlineWords, saltWordIndices)),
    [headlineWords, saltWordIndices],
  );

  return (
    <AbsoluteFill style={{ backgroundColor, fontFamily: FONT_STACK, direction: 'rtl' }}>
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
            position: 'absolute',
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
              position: 'absolute',
              left: px(cardCenterX - LAYOUT.logo.width / 2),
              top: px(LAYOUT.logo.top),
              width: px(LAYOUT.logo.width),
              height: px(LAYOUT.logo.height),
            }}
          >
            <Img
              src={resolveAsset(logo)}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        ) : null}

        {/* الطبقة ٣ — المقطع، وهو بطل اللقطة */}
        <div
          style={{
            position: 'absolute',
            left: px(LAYOUT.media.left),
            top: px(LAYOUT.media.top),
            width: px(LAYOUT.media.width),
            height: px(LAYOUT.media.height),
            transform: `scale(${scaleX}, ${scaleY})`,
            transformOrigin: `${originX}% ${originY}%`,
            borderRadius: mediaRadius,
            overflow: 'hidden',
            boxShadow: `0 ${px(14)}px ${px(30)}px rgba(0,0,0,${0.45 * glowIntensity})`,
            // قبل بداية الحركة لا شيء معروض إطلاقاً.
            opacity: frame >= revealDelayInFrames ? 1 : 0,
            backgroundColor: mediaSource ? 'transparent' : `rgba(0,0,0,0.10)`,
          }}
        >
          {mediaSource ? (
            mediaIsImage ? (
              <Img
                src={mediaSource}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <OffthreadVideo
                src={mediaSource}
                startFrom={Math.round(mediaStartFromSeconds * fps)}
                volume={mediaVolume}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )
          ) : (
            /* Placeholder: مكان المقطع محجوز — بلا نص حتى لا تُثبَّت أي كلمة داخل القالب */
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `${px(3)}px dashed ${fontColor}`,
                borderRadius: mediaRadius,
                boxSizing: 'border-box',
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
              position: 'absolute',
              left: px(LAYOUT.card.left),
              top: px(LAYOUT.headline.top),
              width: px(LAYOUT.card.width),
              textAlign: 'center',
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
                <span
                  key={`${index}-${word}`}
                  style={{
                    fontFeatureSettings: saltFeatureSettings(
                      approvedSalt.has(index),
                    ),
                  }}
                >
                  {index === 0 ? word : ` ${word}`}
                </span>
              ))}
            </div>
            {subheadline ? (
              <div
                style={{
                  marginTop: px(LAYOUT.subheadline.top - LAYOUT.headline.top - LAYOUT.headline.lineHeight),
                  color: fontColor,
                  fontSize: px(LAYOUT.subheadline.fontSize),
                  lineHeight: `${px(LAYOUT.subheadline.lineHeight)}px`,
                  fontWeight: FONT_WEIGHT_MEDIUM,
                  // نص طويل ⇒ بلا أحرف مرسلة، وفق دليل ثمانية
                  fontFeatureSettings: 'normal',
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
              position: 'absolute',
              left: 0,
              width: REF_W * scale,
              bottom: px(LAYOUT.caption.bottom),
              display: 'flex',
              justifyContent: 'center',
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
                // الكابشن نص طويل متغيّر ⇒ بلا أحرف مرسلة
                fontFeatureSettings: 'normal',
                padding: `${px(LAYOUT.caption.paddingY)}px ${px(LAYOUT.caption.paddingX)}px`,
                borderRadius: px(18),
                textAlign: 'center',
              }}
            >
              {activeCaption.text}
            </div>
          </div>
        ) : null}
      </AbsoluteFill>

      {/* الطبقة ٦ — الصوت */}
      {voiceover ? <Audio src={resolveAsset(voiceover)} volume={voiceoverVolume} /> : null}
    </AbsoluteFill>
  );
};
