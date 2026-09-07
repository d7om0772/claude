import React, { useEffect, useMemo } from "react";
import { Thumbnail } from "@remotion/player";
import { cuesFromSrt } from "./srt-cues.js";

/**
 * محرّر مبني على اللقطات — نسخة القوالب التي مشاهدها مدداً بالفريمات
 * (`durationInFrames` تراكمية) لا نطاقات ms مباشرة (ريل كلوفا الكريمي،
 * الكرت الكريمي).
 *
 * نفس فكرة `Scenes.jsx`: المستخدم يفكّر «اللقطة الأولى: كلماتها ومقطعها
 * ومدّتها» لا «كل كلمات الفيديو في قائمة منفصلة عن ترتيب اللقطات» — وهو
 * بالضبط ما اشتكى منه: تعديل نص لقطة في مكان، ومدّتها في مكان آخر، كانا
 * ينفصلان فيتضارب توقيتهما (كلمة تفيض عن مدّة لقطتها فتظهر فوق التالية).
 *
 * الفرق الوحيد عن Scenes.jsx: حدود اللقطة هنا تُحسب تراكمياً من
 * `durationInFrames`، لا تُقرأ مباشرة من `startMs`/`endMs` — فتُحسب هنا
 * بنفس خوارزمية القالب (آخر لقطة تتمدّد لتغطي بقية الفيديو) ثم تُحوَّل
 * لملي ثانية لمطابقة مقاطع الكابشن.
 */

const WORD_SPAN_RATIO = 0.85;
const DEFAULT_IMPORT_MAX_WORDS = 4;

const splitWords = (text) => text.split(/\s+/u).filter((w) => w.length > 0);

const wordsOf = (cue) => {
  const words = splitWords(cue.text);
  const given = cue.wordStartsMs ?? [];
  const span = (cue.endMs - cue.startMs) * WORD_SPAN_RATIO;
  return words.map((text, i) => ({
    text,
    startMs:
      given[i] ??
      Math.round(cue.startMs + (span * i) / Math.max(1, words.length)),
  }));
};

const cueFromWords = (cue, words) => ({
  ...cue,
  text: words.map((w) => w.text).join(" "),
  wordStartsMs: words.map((w) => Math.round(w.startMs)),
});

const msToFrame = (ms, fps) => Math.round((ms / 1000) * fps);
const frameToMs = (frame, fps) => (frame / fps) * 1000;

const Frame = ({ value, onChange, title }) => (
  <input
    type="number"
    className="ms-input"
    dir="ltr"
    step={1}
    min={0}
    value={Math.round(value)}
    title={title}
    onChange={(e) => onChange(Number(e.target.value))}
  />
);

/** عدّاد +/- لعدد كلمات السطر — الزائد ينزل للسطر التالي والناقص يُسحب منه. */
const Stepper = ({ value, onChange, min = 1, max = 12, title }) => (
  <div className="stepper" title={title}>
    <button
      type="button"
      className="btn ghost tiny"
      onClick={() => onChange(Math.max(min, value - 1))}
    >
      −
    </button>
    <span className="stepper-value">{value}</span>
    <button
      type="button"
      className="btn ghost tiny"
      onClick={() => onChange(Math.min(max, value + 1))}
    >
      +
    </button>
  </div>
);

const TYPE_LABELS = {
  media: "بطاقة المقطع",
  empty: "كريمي فاضٍ",
  stack: "كلمات ضخمة",
  echo: "بطاقة ملوّنة",
};

/**
 * الفريم الذي تمثّله المعاينة المصغّرة: منتصفُ اللقطة تقريباً.
 *
 * أوّلُها لا يصلح — الكلمات تكون في أول ظهورها أو لم تظهر بعد، فتخرج
 * مصغّرات متشابهة فارغة لا تدلّ على شيء.
 */
const thumbFrameOf = (window) =>
  Math.max(
    window.fromFrame,
    Math.min(
      window.toFrame - 1,
      window.fromFrame + Math.round((window.toFrame - window.fromFrame) * 0.6),
    ),
  );

/**
 * معاينة مصغّرة للّقطة — إطارٌ واحد من القالب نفسه بنفس الخصائص الحيّة، فما
 * يظهر في المصغّرة هو ما سيُرندَر فعلاً، ويعرف المستخدم أي لقطة يعدّل.
 */
const SceneThumb = ({
  component,
  inputProps,
  width,
  height,
  fps,
  totalFrames,
  frame,
}) => {
  if (!component) return null;
  return (
    <div className="scene-thumb" aria-hidden="true">
      <Thumbnail
        component={component}
        inputProps={inputProps}
        compositionWidth={width}
        compositionHeight={height}
        durationInFrames={Math.max(totalFrames, frame + 1)}
        frameToDisplay={frame}
        fps={fps}
        style={{ width: "100%", height: "100%" }}
        acknowledgeRemotionLicense
      />
    </div>
  );
};

/** تلميح زرّ النقل: إلى أين، ومعه كم سطراً، وهل تفرغ اللقطة بعده. */
const moveTitle = (shot, companions, empties) =>
  [
    `نقل السطر إلى اللقطة ${shot}`,
    companions > 0 ? ` ومعه ${companions} من أسطر لقطته` : "",
    empties ? " — وتُطوى هذه اللقطة لأنها تبقى بلا كلمات ولا وقت" : "",
  ].join("");

const FrameCue = ({ cue, index, fps, onChange, onRemove, onResize, move }) => {
  const words = wordsOf(cue);
  const setWords = (next) => onChange(cueFromWords(cue, next));
  return (
    <div className="cue">
      <div className="cue-head">
        <span className="stage-label" style={{ position: "static" }}>
          سطر {index + 1}
        </span>
        {move ? (
          <span className="cue-move">
            <button
              type="button"
              className="icon-btn"
              disabled={!move.up}
              title={
                move.up
                  ? moveTitle(move.up, move.withUp, move.emptiesUp)
                  : "هذه أول لقطة — لا شيء قبلها"
              }
              onClick={() => move.onUp()}
            >
              ▲
            </button>
            <button
              type="button"
              className="icon-btn"
              disabled={!move.down}
              title={
                move.down
                  ? moveTitle(move.down, move.withDown, move.emptiesDown)
                  : "هذه آخر لقطة — لا شيء بعدها"
              }
              onClick={() => move.onDown()}
            >
              ▼
            </button>
          </span>
        ) : null}
        <Stepper
          value={words.length}
          onChange={(count) => onResize(count)}
          title="كلمات هذا السطر — الزائد ينزل للسطر التالي والناقص يُسحب منه"
        />
        <span className="cue-range" dir="ltr">
          <Frame
            value={msToFrame(cue.startMs, fps)}
            title="بداية السطر بالفريم"
            onChange={(f) => onChange({ ...cue, startMs: frameToMs(f, fps) })}
          />
          {" → "}
          <Frame
            value={msToFrame(cue.endMs, fps)}
            title="نهاية السطر بالفريم"
            onChange={(f) => onChange({ ...cue, endMs: frameToMs(f, fps) })}
          />
        </span>
        <button
          type="button"
          className="icon-btn"
          title="حذف السطر"
          onClick={onRemove}
        >
          ✕
        </button>
      </div>

      {words.map((word, i) => (
        <div className="word-row" key={i}>
          <span className="word-index">{i + 1}</span>
          <input
            type="text"
            value={word.text}
            onChange={(e) =>
              setWords(
                words.map((w, j) =>
                  j === i ? { ...w, text: e.target.value } : w,
                ),
              )
            }
          />
          <Frame
            value={msToFrame(word.startMs, fps)}
            title="لحظة ظهور الكلمة بالفريم"
            onChange={(f) =>
              setWords(
                words.map((w, j) =>
                  j === i ? { ...w, startMs: frameToMs(f, fps) } : w,
                ),
              )
            }
          />
          <button
            type="button"
            className="icon-btn"
            title="حذف الكلمة"
            onClick={() => setWords(words.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        className="btn ghost tiny"
        onClick={() =>
          setWords([
            ...words,
            {
              text: "كلمة",
              startMs: words.length
                ? words[words.length - 1].startMs + 300
                : cue.startMs,
            },
          ])
        }
      >
        + كلمة
      </button>
    </div>
  );
};

export const FrameScenes = ({
  scenes,
  captions,
  setScenes,
  setCaptions,
  accept,
  pickedAt,
  pickAsset,
  fps,
  totalFrames,
  textYDefaults = {},
  component,
  inputProps,
  compositionWidth,
  compositionHeight,
}) => {
  /**
   * ارتفاع نص اللقطة كنسبة مئوية من الإطار. الفارغ يعني موضع القالب العام،
   * فيُعرض رقمه كما هو ليبدأ المستخدم من الموضع الحالي لا من صفر.
   */
  const heightPercent = (scene) => {
    const ratio = scene.textYRatio ?? textYDefaults[scene.type];
    return ratio === undefined || ratio === null ? "" : Math.round(ratio * 100);
  };

  /** حدود كل لقطة بالفريم — نفس حساب القالب: آخر لقطة تتمدّد للنهاية. */
  const timeline = useMemo(() => {
    const entries = [];
    let cursor = 0;
    scenes.forEach((scene, index) => {
      const isLast = index === scenes.length - 1;
      const span = isLast
        ? Math.max(scene.durationInFrames, totalFrames - cursor)
        : scene.durationInFrames;
      entries.push({ fromFrame: cursor, toFrame: cursor + span, isLast });
      cursor += span;
    });
    return entries;
  }, [scenes, totalFrames]);

  const grouped = useMemo(() => {
    const map = new Map(scenes.map((_, i) => [i, []]));
    const orphans = [];
    captions.forEach((cue, index) => {
      const i = timeline.findIndex(
        (t) =>
          cue.startMs >= frameToMs(t.fromFrame, fps) &&
          cue.startMs < frameToMs(t.toFrame, fps),
      );
      if (i === -1) orphans.push(index);
      else map.get(i).push(index);
    });
    // ترتيب زمني ثابت داخل كل لقطة، فسلسلة الأسطر عبر اللقطات (أدناه) تطابق
    // ترتيب العرض ولا يهم ترتيب `captions` نفسه.
    map.forEach((list) =>
      list.sort((a, b) => captions[a].startMs - captions[b].startMs),
    );
    return { map, orphans };
  }, [scenes, captions, timeline, fps]);

  /**
   * كل أسطر اللقطات في سلسلة زمنية واحدة متصلة عبر اللقطات كلّها — بها
   * يعرف العدّاد أن آخر سطر في لقطة وأول سطر في التي تليها متجاوران، فينتقل
   * الفائض بينهما تلقائياً.
   */
  const sceneLines = useMemo(() => {
    const out = [];
    scenes.forEach((_, sceneIdx) => {
      (grouped.map.get(sceneIdx) ?? []).forEach((cueIndex) =>
        out.push({ sceneIdx, cueIndex }),
      );
    });
    return out;
  }, [scenes, grouped]);

  const setScene = (index, patch) =>
    setScenes(scenes.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  /**
   * مدد اللقطات تُشتقّ من الكلمات، فلا رقم يكتبه المستخدم.
   *
   * اللقطة تبدأ مع أول كلمة فيها وتنتهي قبل أول كلمة في التي تليها بفريم —
   * وهو ما يعنيه في التسلسل التراكمي: طولُها = فريمُ أول كلمة في التالية
   * ناقص بدايتها. أما اللقطة الأولى فبدايتها صفر الفيديو حتماً، وآخر لقطة
   * تتمدّد لتغطي ما بقي (يفعله القالب نفسه)، ولقطةٌ بلا كلمات لا بداية
   * تُشتقّ لها فتبقى بطولها كما هو ويُحسب لها مكانها في السلسلة.
   */
  /** أول كلمة في كل لقطة حسب توزيعٍ معطى: لقطة → مصفوفة مقاطعها. */
  const scenesFromFirstWords = (firstWordMs) => {
    const out = scenes.map((scene) => ({ ...scene }));
    let cursor = 0;
    for (let i = 0; i < out.length - 1; i += 1) {
      if (!firstWordMs.has(i)) {
        cursor += out[i].durationInFrames;
        continue;
      }
      // أقرب لقطة تالية فيها كلمات هي المرساة، وما بينهما من لقطات بلا
      // كلمات يحتفظ بطوله فيُطرح من المسافة
      let anchor = null;
      let gap = 0;
      for (let j = i + 1; j < out.length; j += 1) {
        const start = firstWordMs.get(j);
        if (start !== undefined) {
          /**
           * الفريم الذي لا يتجاوز الكلمة (floor) لا الأقرب إليها.
           *
           * الحدّ فريمٌ صحيح والانتماء يُقاس بالملي ثانية: فكلمةٌ عند
           * 4451ms (فريم 133.53) لو قُرِّب حدُّها إلى 134 بدأت لقطتها بعدها
           * فسقطت الكلمة في اللقطة السابقة — وهذا ما كان يُلغي نقل الأسطر
           * بعد استيراد SRT، لأن توقيتاته لا تقع على الفريمات كالنص
           * الافتراضي. وبالتقريب نزولاً تبدأ اللقطة عند كلمتها أو قبلها.
           */
          anchor = Math.floor((start / 1000) * fps);
          break;
        }
        gap += out[j].durationInFrames;
      }
      out[i].durationInFrames =
        anchor === null
          ? out[i].durationInFrames
          : Math.max(1, anchor - gap - cursor);
      cursor += out[i].durationInFrames;
    }
    return out;
  };

  const derivedScenes = (nextCaptions) => {
    const firstWordMs = new Map();
    nextCaptions.forEach((cue) => {
      const i = timeline.findIndex(
        (t) =>
          cue.startMs >= frameToMs(t.fromFrame, fps) &&
          cue.startMs < frameToMs(t.toFrame, fps),
      );
      if (i === -1) return;
      const seen = firstWordMs.get(i);
      if (seen === undefined || cue.startMs < seen) {
        firstWordMs.set(i, cue.startMs);
      }
    });
    return scenesFromFirstWords(firstWordMs);
  };

  /**
   * نقل سطر كامل إلى اللقطة المجاورة.
   *
   * لا يُمسّ توقيت السطر ولا كلماته: ما ينتقل هو **الحدّ** بين اللقطتين
   * فيقع السطر في الأخرى — فيبقى الكلام في لحظته من الفيديو ويتغيّر المشهد
   * الذي تحته، وهو المقصود من «انقل السطر إلى لقطة أخرى».
   *
   * ولهذا لا يُنقل إلا طرفُ اللقطة: أوّلُ أسطرها إلى ما قبلها، وآخرُها إلى
   * ما بعدها. سطرٌ بين سطرين نقلُه يعني قفزه فوق جاره في الزمن — أي إعادة
   * ترتيب السكربت لا نقل لقطة.
   */
  const moveCueToNeighbour = (sceneIndex, cuePos, direction) => {
    const targetIndex = sceneIndex + direction;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;
    const mine = grouped.map.get(sceneIndex) ?? [];
    const cueIndex = mine[cuePos];
    if (cueIndex === undefined) return;
    const cue = captions[cueIndex];

    /**
     * الحدّ الجديد: نازلاً يقع عند بداية السطر فيخرج من لقطته إلى التالية،
     * وصاعداً عند بداية السطر الذي يليه في لقطته — أو نهايةِ المنقول نفسه إن
     * كان آخرها — فتبتلعه اللقطة السابقة. والمجموع محفوظ: ما تأخذه واحدة
     * تعطيه الأخرى، فلا يزحف باقي الفيديو.
     *
     * واللقطة مدى زمنيّ متصل، فالحدّ حين ينتقل يأخذ معه ما بعده: سطرٌ بين
     * سطرين ينزل ومعه ما تحته في لقطته، ويصعد ومعه ما فوقه — وإلا لقفز فوق
     * جاره في الزمن فانقلب ترتيب السكربت. التلميح على الزر يقول كم سطراً
     * ينتقل قبل الضغط.
     */
    /**
     * التقريب هنا في اتجاه واحد لا إلى الأقرب.
     *
     * الحدّ فريمٌ صحيح، وانتماء السطر يُقاس بالملي ثانية: فسطرٌ يبدأ عند 50ms
     * (فريم 1.5) لو قُرِّب حدُّه إلى 2 صار الحدّ بعده بملي ثانية فيبقى مكانه
     * ولا ينتقل — وهو ما كان يعطّل نزول أسطر اللقطة الأولى. فالنازل يأخذ
     * الفريم الذي لا يتجاوزه (floor) ليقع الحدّ عنده أو قبله، والصاعد يأخذ
     * ما لا يقصر عنه (ceil) ليقع بعد السطر المنقول وقبل الذي يليه.
     */
    const leftIndex = direction === 1 ? sceneIndex : sceneIndex - 1;
    const wanted =
      direction === 1
        ? Math.floor((cue.startMs / 1000) * fps)
        : Math.ceil(
            ((captions[mine[cuePos + 1]]?.startMs ?? cue.endMs) / 1000) * fps,
          );

    const left = timeline[leftIndex];
    const right = timeline[leftIndex + 1];
    const boundary = Math.min(
      Math.max(wanted, left.fromFrame + 1),
      right.toFrame - 1,
    );
    let next = scenes.map((scene, i) => {
      if (i === leftIndex) {
        return { ...scene, durationInFrames: boundary - left.fromFrame };
      }
      if (i === leftIndex + 1) {
        return { ...scene, durationInFrames: right.toFrame - boundary };
      }
      return { ...scene };
    });

    // لقطة خرجت منها كلماتها كلّها ولم يبقَ لها وقت يُذكر: وجودُها وميضُ
    // فريمٍ لا معنى له، فتُطوى مع جارتها
    const emptied = direction === 1 ? cuePos === 0 : cuePos === mine.length - 1;
    if (emptied && next[sceneIndex].durationInFrames < 2) {
      const absorb = next[sceneIndex].durationInFrames;
      next = next
        .map((scene, i) =>
          i === sceneIndex - 1 || (sceneIndex === 0 && i === 1)
            ? { ...scene, durationInFrames: scene.durationInFrames + absorb }
            : scene,
        )
        .filter((_, i) => i !== sceneIndex);
    }
    setScenes(next);
  };

  /**
   * تبديل لقطة بجارتها — تصعد في الترتيب أو تنزل.
   *
   * اللقطة تنتقل بكلّ ما فيها: نوعها ومقطعها وارتفاع نصّها، **وكلماتها**.
   * فالكلمات تُزاح زمنياً بمقدار طول الجارة، وتلك بمقدار طول هذه — أي أن
   * الاثنتين تتبادلان موضعهما في الشريط بلا أن يتغيّر طول أيٍّ منهما ولا
   * مجموع الفيديو، فما كان يُقال على هذه اللقطة يُقال عليها في مكانها الجديد.
   */
  const moveScene = (index, direction) => {
    const other = index + direction;
    if (other < 0 || other >= scenes.length) return;
    const first = Math.min(index, other);
    const second = first + 1;
    // الطول الفعلي من الشريط لا المخزَّن: آخر لقطة تتمدّد لتغطية ما بقي
    const spanFirst = timeline[first].toFrame - timeline[first].fromFrame;
    const spanSecond = timeline[second].toFrame - timeline[second].fromFrame;

    const shift = (cue, deltaMs) => ({
      ...cue,
      startMs: Math.max(0, cue.startMs + deltaMs),
      endMs: Math.max(0, cue.endMs + deltaMs),
      wordStartsMs: (cue.wordStartsMs ?? []).map((ms) =>
        Math.max(0, ms + deltaMs),
      ),
    });
    const inFirst = new Set(grouped.map.get(first) ?? []);
    const inSecond = new Set(grouped.map.get(second) ?? []);
    const nextCaptions = captions.map((cue, i) => {
      if (inFirst.has(i)) return shift(cue, frameToMs(spanSecond, fps));
      if (inSecond.has(i)) return shift(cue, -frameToMs(spanFirst, fps));
      return cue;
    });

    const nextScenes = scenes.map((scene, i) => {
      if (i === first) {
        return { ...scenes[second], durationInFrames: spanSecond };
      }
      if (i === second) {
        return { ...scenes[first], durationInFrames: spanFirst };
      }
      return scene;
    });

    setCaptions(nextCaptions);
    setScenes(nextScenes);
  };

  /**
   * القيم المحفوظة في القالب قد تكون مكتوبة يدوياً من قبل، فتُضبط على القاعدة
   * أول ما تُفتح اللوحة — وإلا رأى المستخدم «تلقائي» مكتوباً وحدوداً لا تطابق
   * كلماتها. الاشتقاق نقطةٌ ثابتة: يكتب مرّة ثم يتّفق مع نفسه فيتوقّف.
   */
  useEffect(() => {
    const derived = derivedScenes(captions);
    const changed = derived.some(
      (scene, i) => scene.durationInFrames !== scenes[i].durationInFrames,
    );
    if (changed) setScenes(derived);
  });

  /** كل تغيير على الكلمات يعيد اشتقاق مدد اللقطات معه، فلا يفترقان. */
  const commitCaptions = (next) => {
    setCaptions(next);
    setScenes(derivedScenes(next));
  };

  const replaceCue = (index, cue) =>
    commitCaptions(captions.map((c, i) => (i === index ? cue : c)));
  const removeCue = (index) =>
    commitCaptions(captions.filter((_, i) => i !== index));

  /**
   * يغيّر عدد كلمات سطر واحد بتحريك حدّه مع السطر الذي يليه فقط، ضمن نفس
   * مجموعة الأسطر (لقطة واحدة أو «خارج اللقطات») — نفس فكرة عدّاد الأسطر في
   * محرّر الكلمات المسطّح: الزائد يُسحب من أول التالي، والناقص ينزل إليه.
   */
  const resizeGroup = (groupIndices, cuePos, count, fallbackEndMs) => {
    const lines = groupIndices.map((idx) => ({
      base: captions[idx],
      words: wordsOf(captions[idx]),
    }));
    const next = lines.map((l) => ({ ...l, words: l.words.slice() }));
    const target = next[cuePos];
    const delta = Math.max(1, count) - target.words.length;

    if (delta < 0) {
      const moved = target.words.splice(delta);
      const below = next[cuePos + 1];
      if (below) below.words.unshift(...moved);
      else next.push({ base: null, words: moved });
    } else {
      let need = delta;
      for (let i = cuePos + 1; i < next.length && need > 0; i += 1) {
        const taken = next[i].words.splice(0, need);
        target.words.push(...taken);
        need -= taken.length;
      }
    }

    const kept = next.filter((line) => line.words.length > 0);
    const rebuilt = kept.map((line, i) => {
      const first = line.words[0];
      const below = kept[i + 1];
      const endMs = below
        ? below.words[0].startMs
        : fallbackEndMs(first.startMs);
      const base = line.base ?? {
        text: "",
        startMs: 0,
        endMs: 0,
        wordStartsMs: [],
      };
      return cueFromWords(
        { ...base, startMs: first.startMs, endMs },
        line.words,
      );
    });

    const groupSet = new Set(groupIndices);
    commitCaptions([
      ...captions.filter((_, i) => !groupSet.has(i)),
      ...rebuilt,
    ]);
  };

  /**
   * عدّاد سطر داخل لقطة — الكلمات وحدها هي التي تنتقل.
   *
   * الأسطر كلها متصلة عبر اللقطات، فآخر سطر في لقطة يسحب من أول سطر في التي
   * تليها أو يدفع إليه، لا يتوقف عند حدود لقطته. لكن السطر نفسه لا يغادر
   * مربّعه: توزيع الأسطر على اللقطات بيد المستخدم وحده.
   */
  const resizeSceneCue = (sceneIndex, cuePos, count) => {
    const mine = grouped.map.get(sceneIndex) ?? [];
    const targetCueIndex = mine[cuePos];
    const flatIndex = sceneLines.findIndex(
      (l) => l.cueIndex === targetCueIndex,
    );
    if (flatIndex === -1) return;

    const lines = sceneLines.map((l) => ({
      sceneIdx: l.sceneIdx,
      words: wordsOf(captions[l.cueIndex]),
    }));
    const target = lines[flatIndex];
    const delta = Math.max(1, count) - target.words.length;

    if (delta < 0) {
      const moved = target.words.splice(delta);
      const below = lines[flatIndex + 1];
      if (below) below.words.unshift(...moved);
      else lines.push({ sceneIdx: target.sceneIdx, words: moved });
    } else {
      let need = delta;
      for (let i = flatIndex + 1; i < lines.length && need > 0; i += 1) {
        const taken = lines[i].words.splice(0, need);
        target.words.push(...taken);
        need -= taken.length;
      }
    }

    const kept = lines.filter((line) => line.words.length > 0);
    /**
     * السطر يبقى في لقطته مهما تحرّكت كلماته.
     *
     * بداية السطر تُحسب من أول كلماته، وكلماتُه تتبدّل بالعدّاد — فسطرٌ
     * قصير كانت بدايته تزحف حتى تخرج من نافذة لقطته فينتقل وحده إلى مربّع
     * اللقطة التالية (أو السابقة) بلا أن يطلب المستخدم ذلك. فتُحصر البداية
     * داخل نافذة لقطته: الكلمات تنتقل بين الأسطر كما هي، والأسطر لا تنتقل
     * بين اللقطات إلا بأمرٍ صريح — تعديلِ توقيت السطر أو مدّة اللقطة.
     */
    const frameMs = frameToMs(1, fps);
    let previous = Number.NEGATIVE_INFINITY;
    const clamped = kept.map((line) => {
      const window = timeline[line.sceneIdx];
      const fromMs = frameToMs(window.fromFrame, fps);
      const latest = Math.max(fromMs, frameToMs(window.toFrame, fps) - frameMs);
      const inShot = Math.min(Math.max(line.words[0].startMs, fromMs), latest);
      // سطران في لقطة واحدة لا يبدآن معاً، ما دام في نافذتها متّسع
      const startMs = Math.min(Math.max(inShot, previous + frameMs), latest);
      previous = startMs;
      return { ...line, startMs };
    });
    const rebuilt = clamped.map((line, i) => {
      const below = clamped[i + 1];
      const window = timeline[line.sceneIdx];
      const endMs = below
        ? Math.max(below.startMs, line.startMs + frameMs)
        : Math.max(line.startMs + 500, frameToMs(window.toFrame, fps));
      return cueFromWords(
        { text: "", startMs: line.startMs, endMs, wordStartsMs: [] },
        line.words,
      );
    });

    const sceneCueSet = new Set(sceneLines.map((l) => l.cueIndex));
    commitCaptions([
      ...captions.filter((_, i) => !sceneCueSet.has(i)),
      ...rebuilt,
    ]);
  };

  const resizeOrphanCue = (cuePos, count) => {
    resizeGroup(grouped.orphans, cuePos, count, (startMs) => startMs + 700);
  };

  /**
   * سطر جديد داخل اللقطة نفسها لا في التي تليها.
   *
   * اللقطة تضمّ ما **يبدأ** داخل نافذتها، ونهاية آخر سطر فيها تساوي عادةً
   * نهاية النافذة (هكذا تبنيها الاستيرادات والعدّاد)، فبدءُ الجديد عندها
   * كان يقع في نافذة اللقطة التالية فيظهر في مربّعها. فيبدأ الجديد قبل
   * نهاية اللقطة بفريم على الأقل، وإن لم يبقَ متّسع اقتُسم آخرُ سطر معه.
   */
  const addCue = (sceneIndex) => {
    const t = timeline[sceneIndex];
    const fromMs = frameToMs(t.fromFrame, fps);
    const toMs = frameToMs(t.toFrame, fps);
    const latestStart = Math.max(fromMs, toMs - frameToMs(1, fps));
    const mine = grouped.map.get(sceneIndex) ?? [];

    const freeStart = mine.length
      ? Math.max(fromMs, ...mine.map((i) => captions[i].endMs))
      : fromMs;
    const newCue = (startMs) => ({
      text: "سطر جديد",
      startMs,
      endMs: Math.max(startMs + 200, toMs),
      wordStartsMs: [],
    });

    if (freeStart <= latestStart) {
      commitCaptions([...captions, newCue(freeStart)]);
      return;
    }

    // لا متّسع بعد آخر سطر: يُقسم ما بقي من زمنه بينه وبين الجديد
    const lastIndex = mine[mine.length - 1];
    const last = captions[lastIndex];
    const split = Math.min(
      latestStart,
      Math.max(last.startMs + frameToMs(1, fps), (last.startMs + toMs) / 2),
    );
    commitCaptions([
      ...captions.map((cue, i) =>
        i === lastIndex ? { ...cue, endMs: split } : cue,
      ),
      newCue(split),
    ]);
  };

  /** SRT اللقطة: توقيتاته تُزاح لبداية اللقطة وتُقصّ عند نهايتها. */
  const importSrt = async (sceneIndex, file) => {
    if (!file) return;
    const t = timeline[sceneIndex];
    const offsetMs = frameToMs(t.fromFrame, fps);
    const limitMs = t.isLast
      ? Number.POSITIVE_INFINITY
      : frameToMs(t.toFrame, fps);
    const imported = cuesFromSrt(await file.text(), {
      offsetMs,
      limitMs,
      maxWords: DEFAULT_IMPORT_MAX_WORDS,
    });
    const mine = new Set(grouped.map.get(sceneIndex) ?? []);
    commitCaptions([...captions.filter((_, i) => !mine.has(i)), ...imported]);
  };

  /** SRT كامل القالب: يستبدل كل الكلمات في كل اللقطات دفعة واحدة. */
  const importFullSrt = async (file) => {
    if (!file) return;
    const imported = cuesFromSrt(await file.text(), {
      offsetMs: 0,
      limitMs: Number.POSITIVE_INFINITY,
      maxWords: DEFAULT_IMPORT_MAX_WORDS,
    });
    commitCaptions(imported);
  };

  const pickMedia = (index, file) => {
    const url = pickAsset(`scenes.${index}.media`, file);
    setScene(index, { media: url });
  };

  return (
    <div className="scenes">
      <div className="scene-row">
        <label className="btn ghost tiny">
          استيراد SRT لكامل القالب
          <input
            type="file"
            accept=".srt,.vtt,text/plain"
            style={{ display: "none" }}
            onChange={(e) => void importFullSrt(e.target.files?.[0] ?? null)}
          />
        </label>
        <span className="file-empty">
          يستبدل كلمات كل اللقطات دفعة واحدة وتُوزَّع كل لقطة على توقيتها —
          استيراد اللقطة الواحدة أدناه ما زال متاحاً لتعديل لقطة بعينها بعده
        </span>
      </div>

      {scenes.map((scene, index) => {
        const mine = grouped.map.get(index) ?? [];
        const picked = pickedAt(`scenes.${index}.media`);
        const t = timeline[index];
        return (
          <div className="scene" key={index}>
            <div className="scene-head">
              <SceneThumb
                component={component}
                inputProps={inputProps}
                width={compositionWidth}
                height={compositionHeight}
                fps={fps}
                totalFrames={totalFrames}
                frame={thumbFrameOf(t)}
              />
              <h4>اللقطة {index + 1}</h4>
              <select
                value={scene.type}
                onChange={(e) => setScene(index, { type: e.target.value })}
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <span className="cue-move">
                <button
                  type="button"
                  className="icon-btn"
                  disabled={index === 0}
                  title={
                    index === 0
                      ? "هذه أول لقطة — لا شيء قبلها"
                      : `تصعد اللقطة فتبادل مكانها مع اللقطة ${index} — بكلماتها ومقطعها`
                  }
                  onClick={() => moveScene(index, -1)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  disabled={index === scenes.length - 1}
                  title={
                    index === scenes.length - 1
                      ? "هذه آخر لقطة — لا شيء بعدها"
                      : `تنزل اللقطة فتبادل مكانها مع اللقطة ${index + 2} — بكلماتها ومقطعها`
                  }
                  onClick={() => moveScene(index, 1)}
                >
                  ▼
                </button>
              </span>
              <button
                type="button"
                className="icon-btn"
                title="حذف اللقطة"
                onClick={() => setScenes(scenes.filter((_, i) => i !== index))}
              >
                ✕
              </button>
            </div>

            <div className="scene-row">
              <span
                className="file-empty"
                title={
                  t.isLast
                    ? "آخر لقطة تتمدّد لتغطية بقية الفيديو"
                    : mine.length === 0
                      ? "لقطة بلا كلمات: لا بداية تُشتقّ لها فتبقى بطولها الحالي — أضف لها سطراً ليبدأ وقتها مع أول كلمة فيه"
                      : "وقت اللقطة تلقائي: يبدأ مع أول كلمة فيها وينتهي قبل أول كلمة في التي تليها بفريم"
                }
              >
                وقت اللقطة تلقائي — من الفريم {t.fromFrame} إلى{" "}
                {t.isLast ? "نهاية الفيديو" : t.toFrame - 1} (
                {t.toFrame - t.fromFrame} فريم)
              </span>
            </div>

            <div className="scene-row">
              <span className="file-empty">ارتفاع النص</span>
              <input
                type="number"
                className="ms-input"
                dir="ltr"
                step={1}
                min={2}
                max={98}
                value={heightPercent(scene)}
                title="ارتفاع نصّ هذه اللقطة كنسبة من ارتفاع الإطار — الأكبر أنزل. لكل لقطة ارتفاعها"
                onChange={(e) =>
                  setScene(index, {
                    textYRatio: Math.min(
                      0.98,
                      Math.max(0.02, Number(e.target.value) / 100),
                    ),
                  })
                }
              />
              <span className="file-empty">٪ من ارتفاع الإطار</span>
              {scene.textYRatio === undefined || scene.textYRatio === null ? (
                <span className="file-empty">— موضع القالب</span>
              ) : (
                <button
                  type="button"
                  className="btn ghost tiny"
                  title="إرجاع النص إلى موضع القالب العام"
                  onClick={() => setScene(index, { textYRatio: null })}
                >
                  ↺ موضع القالب
                </button>
              )}
            </div>

            {scene.type === "media" ? (
              <div className="scene-row">
                <label className="btn ghost tiny">
                  {picked || scene.media ? "تغيير الفيديو" : "+ فيديو اللقطة"}
                  <input
                    type="file"
                    accept={accept}
                    style={{ display: "none" }}
                    onChange={(e) =>
                      pickMedia(index, e.target.files?.[0] ?? null)
                    }
                  />
                </label>
                {scene.media ? (
                  <>
                    <span className="file-name">
                      {picked ? picked.name : scene.media}
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      title="إزالة الفيديو"
                      onClick={() => pickMedia(index, null)}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <span className="file-empty">
                    بلا فيديو — تظهر البطاقة فاضية
                  </span>
                )}
              </div>
            ) : null}

            {scene.type === "stack" || scene.type === "echo" ? (
              <p className="file-empty" style={{ margin: "4px 0 8px" }}>
                نصّ هذه اللقطة كلماتها أدناه — عدّلها كأي سطر آخر.
              </p>
            ) : null}

            <div className="scene-row">
              <label className="btn ghost tiny">
                استيراد SRT للّقطة
                <input
                  type="file"
                  accept=".srt,.vtt,text/plain"
                  style={{ display: "none" }}
                  onChange={(e) =>
                    void importSrt(index, e.target.files?.[0] ?? null)
                  }
                />
              </label>
              <span className="file-empty">
                توقيتات الملف تُزاح إلى بداية اللقطة وتستبدل كلماتها
              </span>
            </div>

            {mine.length === 0 ? (
              <p className="file-empty">لا كلمات في هذه اللقطة بعد.</p>
            ) : (
              mine.map((cueIndex, cuePos) => (
                <FrameCue
                  key={cueIndex}
                  cue={captions[cueIndex]}
                  index={cuePos}
                  fps={fps}
                  onChange={(cue) => replaceCue(cueIndex, cue)}
                  onRemove={() => removeCue(cueIndex)}
                  onResize={(count) => resizeSceneCue(index, cuePos, count)}
                  move={{
                    up: index > 0 ? index : null,
                    down: index < scenes.length - 1 ? index + 2 : null,
                    // ما يصحبه من أسطر لقطته، وهل تفرغ اللقطة بعده
                    withUp: cuePos,
                    withDown: mine.length - 1 - cuePos,
                    emptiesUp: cuePos === mine.length - 1,
                    emptiesDown: cuePos === 0,
                    onUp: () => moveCueToNeighbour(index, cuePos, -1),
                    onDown: () => moveCueToNeighbour(index, cuePos, 1),
                  }}
                />
              ))
            )}

            <button
              type="button"
              className="btn ghost tiny"
              onClick={() => addCue(index)}
            >
              + سطر
            </button>
          </div>
        );
      })}

      {grouped.orphans.length > 0 ? (
        <div className="scene">
          <div className="scene-head">
            <h4>خارج اللقطات</h4>
          </div>
          <p className="file-empty">
            مقاطع توقيتها لا يقع داخل أي لقطة — تظهر في الفيديو لكن لا لقطة
            تحتها.
          </p>
          {grouped.orphans.map((cueIndex, cuePos) => (
            <FrameCue
              key={cueIndex}
              cue={captions[cueIndex]}
              index={cuePos}
              fps={fps}
              onChange={(cue) => replaceCue(cueIndex, cue)}
              onRemove={() => removeCue(cueIndex)}
              onResize={(count) => resizeOrphanCue(cuePos, count)}
            />
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="btn ghost tiny"
        onClick={() =>
          setScenes([
            ...scenes,
            { type: "media", durationInFrames: 60, media: null },
          ])
        }
      >
        + لقطة جديدة
      </button>
    </div>
  );
};
