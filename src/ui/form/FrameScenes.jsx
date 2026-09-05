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

const TYPE_LABELS = {
  media: "بطاقة المقطع",
  empty: "كريمي فاضٍ",
  stack: "كلمات ضخمة",
  echo: "بطاقة ملوّنة",
};

const FrameCue = ({ cue, fps, onChange, onRemove }) => {
  const words = wordsOf(cue);
  const setWords = (next) => onChange(cueFromWords(cue, next));
  return (
    <div className="cue">
      <div className="cue-head">
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
    return { map, orphans };
  }, [scenes, captions, timeline, fps]);

  const setScene = (index, patch) =>
    setScenes(scenes.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const replaceCue = (index, cue) =>
    setCaptions(captions.map((c, i) => (i === index ? cue : c)));
  const removeCue = (index) =>
    setCaptions(captions.filter((_, i) => i !== index));

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
              mine.map((cueIndex) => (
                <FrameCue
                  key={cueIndex}
                  cue={captions[cueIndex]}
                  fps={fps}
                  onChange={(cue) => replaceCue(cueIndex, cue)}
                  onRemove={() => removeCue(cueIndex)}
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
          {grouped.orphans.map((cueIndex) => (
            <FrameCue
              key={cueIndex}
              cue={captions[cueIndex]}
              fps={fps}
              onChange={(cue) => replaceCue(cueIndex, cue)}
              onRemove={() => removeCue(cueIndex)}
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
