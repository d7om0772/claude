import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * محرّك ستايلات كشف الكلمات — مشترك بين القوالب.
 *
 * كان يعيش داخل «اصنع قالبك بنفسك» وحده. نُقل هنا حين احتاجه ريل كلوفا
 * الكريمي لكل لقطة على حدة: نسخُه كان يعني عشرة ستايلات تتفرّق نسختين
 * تنحرف إحداهما عن الأخرى مع أول تعديل.
 *
 * والقائمة أدناه هي المصدر الوحيد لأسماء الستايلات: يقرأها القالبان
 * لتصحيح المدخلات، وتقرأها الواجهة لرسم أزرار الاختيار — فلا يظهر زرّ
 * لستايل لا وجود له، ولا ستايلٌ بلا زرّ.
 */
export const TEXT_STYLE_OPTIONS = [
  { value: "karaoke", label: "تراكم", hint: "الكلمات تتراكم والنشطة داكنة" },
  { value: "pop", label: "قفزة", hint: "كل كلمة تكبر في مكانها" },
  { value: "kinetic", label: "سطر متحرك", hint: "سطر واحد ينزلق مع الكلمة" },
  { value: "boxed", label: "شريط", hint: "الكلمة النشطة على شريط ملوّن" },
  {
    value: "highlight",
    label: "تظليل",
    hint: "الجملة كلها ظاهرة، والنشطة تتلوّن — كاريوكي الأغاني",
  },
  { value: "underline", label: "تسطير", hint: "خط ملوّن تحت الكلمة النشطة" },
  { value: "slide", label: "انزلاق", hint: "الكلمة تصعد من خلف قناع" },
  { value: "stack", label: "تراص عمودي", hint: "كل كلمة في سطر مستقل" },
  {
    value: "oneWord",
    label: "كلمة واحدة",
    hint: "كلمة واحدة كبيرة في كل لحظة",
  },
  { value: "gradient", label: "تدرّج", hint: "تدرّج لوني على الكلمة النشطة" },
];

export const TEXT_STYLE_IDS = TEXT_STYLE_OPTIONS.map((o) => o.value);

/** أسماء الستايلات بمعرّفاتها — تضعها المخطّطات في `.meta({ labels })` */
export const TEXT_STYLE_LABELS = Object.fromEntries(
  TEXT_STYLE_OPTIONS.map((o) => [o.value, o.label]),
);

/** شروح الستايلات، تظهر عند مرور المؤشّر على الزرّ */
export const TEXT_STYLE_HINTS = Object.fromEntries(
  TEXT_STYLE_OPTIONS.map((o) => [o.value, o.hint]),
);

/* ==========================================================================
 * 1) الكلمات
 * ========================================================================== */

/**
 * توقيت كل كلمة صريح دائماً: الستايلات تحتاج لحظة ظهور كل كلمة، وتوزيعها
 * ضمنياً داخل كل ستايل يجعل الأربعة تختلف في التزامن بلا سبب.
 */
export const wordsOf = (cue) => {
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

const Word = ({ word, revealed, active, style, enterFrames, colors, font }) => {
  const { opacity, rise, scale } = useEnter(word, enterFrames);
  const common = {
    display: "inline-block",
    opacity: revealed ? opacity : 0,
    color: active ? colors.font : colors.muted,
    fontWeight: active ? font.heavy : font.medium,
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
          fontWeight: active ? font.heavy : font.medium,
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
          font={font}
        />
      ))}
    </div>
  );
};

export const StyledWords = ({
  words,
  style,
  revealMode,
  fontSize,
  widthPx,
  colors,
  enterFrames,
  font,
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
          fontFamily: font.stack,
          fontSize: fontSize * 1.5,
          fontWeight: font.heavy,
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
          font={font}
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
          fontFamily: font.stack,
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
            font={font}
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
          fontFamily: font.stack,
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
        fontFamily: font.stack,
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
          font={font}
        />
      ))}
    </div>
  );
};
