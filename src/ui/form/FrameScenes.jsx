import React, { useMemo } from "react";
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

const FrameCue = ({ cue, index, fps, onChange, onRemove, onResize }) => {
  const words = wordsOf(cue);
  const setWords = (next) => onChange(cueFromWords(cue, next));
  return (
    <div className="cue">
      <div className="cue-head">
        <span className="stage-label" style={{ position: "static" }}>
          سطر {index + 1}
        </span>
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
}) => {
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
  const replaceCue = (index, cue) =>
    setCaptions(captions.map((c, i) => (i === index ? cue : c)));
  const removeCue = (index) =>
    setCaptions(captions.filter((_, i) => i !== index));

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
      const endMs = below ? below.words[0].startMs : fallbackEndMs(first.startMs);
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
    setCaptions([...captions.filter((_, i) => !groupSet.has(i)), ...rebuilt]);
  };

  /**
   * عدّاد سطر داخل لقطة — لكن الأسطر كلها متصلة عبر اللقطات، فآخر سطر في
   * لقطة يسحب من أول سطر في التي تليها أو يدفع إليه، لا يتوقف عند حدود
   * لقطته وحدها.
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
    // كل سطر يُشدّ إلى بداية لقطته على الأقل — بلا هذا يبقى سطرٌ انتقل
    // إلى لقطة تالية مصنّفاً على توقيته القديم فيُحسب على لقطته السابقة
    const clamped = kept.map((line) => ({
      ...line,
      startMs: Math.max(
        line.words[0].startMs,
        frameToMs(timeline[line.sceneIdx].fromFrame, fps),
      ),
    }));
    const rebuilt = clamped.map((line, i) => {
      const below = clamped[i + 1];
      const window = timeline[line.sceneIdx];
      const endMs = below
        ? below.startMs
        : Math.max(line.startMs + 500, frameToMs(window.toFrame, fps));
      return cueFromWords(
        { text: "", startMs: line.startMs, endMs, wordStartsMs: [] },
        line.words,
      );
    });

    const sceneCueSet = new Set(sceneLines.map((l) => l.cueIndex));
    setCaptions([
      ...captions.filter((_, i) => !sceneCueSet.has(i)),
      ...rebuilt,
    ]);
  };

  const resizeOrphanCue = (cuePos, count) => {
    resizeGroup(grouped.orphans, cuePos, count, (startMs) => startMs + 700);
  };

  const addCue = (sceneIndex) => {
    const t = timeline[sceneIndex];
    const mine = grouped.map.get(sceneIndex) ?? [];
    const startMs = mine.length
      ? Math.max(...mine.map((i) => captions[i].endMs))
      : frameToMs(t.fromFrame, fps);
    const endMs = Math.max(startMs + 500, frameToMs(t.toFrame, fps));
    setCaptions([
      ...captions,
      { text: "سطر جديد", startMs, endMs, wordStartsMs: [] },
    ]);
  };

  /** SRT اللقطة: توقيتاته تُزاح لبداية اللقطة وتُقصّ عند نهايتها. */
  const importSrt = async (sceneIndex, file) => {
    if (!file) return;
    const t = timeline[sceneIndex];
    const offsetMs = frameToMs(t.fromFrame, fps);
    const limitMs = t.isLast ? Number.POSITIVE_INFINITY : frameToMs(t.toFrame, fps);
    const imported = cuesFromSrt(await file.text(), {
      offsetMs,
      limitMs,
      maxWords: DEFAULT_IMPORT_MAX_WORDS,
    });
    const mine = new Set(grouped.map.get(sceneIndex) ?? []);
    setCaptions([...captions.filter((_, i) => !mine.has(i)), ...imported]);
  };

  const pickMedia = (index, file) => {
    const url = pickAsset(`scenes.${index}.media`, file);
    setScene(index, { media: url });
  };

  return (
    <div className="scenes">
      {scenes.map((scene, index) => {
        const mine = grouped.map.get(index) ?? [];
        const picked = pickedAt(`scenes.${index}.media`);
        const t = timeline[index];
        return (
          <div className="scene" key={index}>
            <div className="scene-head">
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
              <span className="file-empty">وقت اللقطة</span>
              <Frame
                value={scene.durationInFrames}
                title={
                  t.isLast
                    ? "طول اللقطة بالفريمات — آخر لقطة تتمدّد تلقائياً لتغطية بقية الفيديو مهما كتبت هنا"
                    : "طول اللقطة بالفريمات"
                }
                onChange={(v) =>
                  setScene(index, { durationInFrames: Math.max(1, v) })
                }
              />
              <span className="file-empty">
                من الفريم {t.fromFrame} إلى{" "}
                {t.isLast ? "نهاية الفيديو" : t.toFrame}
              </span>
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
          setScenes([...scenes, { type: "media", durationInFrames: 60, media: null }])
        }
      >
        + لقطة جديدة
      </button>
    </div>
  );
};
