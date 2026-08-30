import React, { useCallback, useMemo, useState } from "react";
import { srtToCaptions } from "../../lib/srt.js";

/**
 * محرّر مبني على اللقطات لا على الحقول.
 *
 * الـ schema يحفظ المشاهد في مصفوفة والكابشن في مصفوفة أخرى، وهذا صحيح
 * للقالب لكنه غير صالح للتعبئة: المستخدم يفكّر «اللقطة الأولى: كلماتها
 * وفيديوها»، لا «كل كلمات الفيديو في مكان واحد ثم كل المشاهد في مكان آخر».
 * هذا المكوّن يعرض الشكل الذي يفكّر به ويكتب في البنية التي يفهمها القالب.
 */

const WORD_SPAN_RATIO = 0.85; // نفس نسبة التوزيع في القالب

/** المقطع يتبع اللقطة التي تبدأ داخلها. */
const sceneOfCue = (cue, scenes) =>
  scenes.findIndex((s) => cue.startMs >= s.startMs && cue.startMs < s.endMs);

const splitWords = (text) => text.split(/\s+/u).filter((w) => w.length > 0);

/** توقيتات صريحة دائماً: الحقل الفارغ لا يمكن تحريره، والفراغ يعني توزيعاً ضمنياً. */
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

const MS = ({ value, onChange, title }) => (
  <input
    type="number"
    className="ms-input"
    dir="ltr"
    step={10}
    min={0}
    value={Math.round(value)}
    title={title}
    onChange={(e) => onChange(Number(e.target.value))}
  />
);

const STYLE_LABELS = {
  over: "أبيض فوق البطاقة",
  above: "غامق فوق بطاقة أفقية",
  full: "غامق على شاشة فاضية",
};

const MAX_WIDTH_BY_STYLE = { over: 480, above: 440, full: 620 };

/** أقصى عدد كلمات في المقطع الواحد، من حدود المحتوى في دليل القالب. */
const MAX_WORDS_BY_STYLE = { over: 4, above: 4, full: 7 };

/** فجوة تكفي لاعتبار ما بعدها جملة جديدة. */
const SENTENCE_GAP_MS = 700;

/**
 * ملفات SRT على نوعين: مقطع لكل جملة، ومقطع لكل كلمة (مخرج Whisper وأمثاله).
 *
 * المقطع في هذا القالب وحدةُ عرض: يظهر ثم يختفي ليحلّ محلّه التالي. فلو
 * أخذنا كل بلوك مقطعاً، صار ملف الكلمات يعرض كلمة واحدة في كل لحظة وتختفي
 * قبلها — بدل أن تتراكم الجملة. لذلك نكتشف النوع ونجمع الكلمات في جمل،
 * ونستعمل توقيت كل بلوك توقيتاً لكلمته.
 */
const isWordLevel = (blocks) => {
  if (blocks.length < 3) return false;
  const singles = blocks.filter((b) => splitWords(b.text).length === 1).length;
  return singles / blocks.length >= 0.7;
};

/** يجمع بلوكات الكلمات في مقاطع: تنتهي بالحد الأقصى للكلمات أو بفجوة. */
const groupWordBlocks = (blocks, maxWords) => {
  const groups = [];
  let current = [];
  for (const block of blocks) {
    const previous = current[current.length - 1];
    const gap = previous ? block.startMs - previous.endMs : 0;
    if (
      current.length >= maxWords ||
      (previous !== undefined && gap > SENTENCE_GAP_MS)
    ) {
      groups.push(current);
      current = [];
    }
    current.push(block);
  }
  if (current.length > 0) groups.push(current);
  return groups;
};

const Cue = ({ cue, styles, onChange, onRemove }) => {
  const words = wordsOf(cue);
  const setWords = (next) => onChange(cueFromWords(cue, next));
  return (
    <div className="cue">
      <div className="cue-head">
        {styles.length > 1 ? (
          <select
            value={cue.style}
            onChange={(e) => {
              const style = e.target.value;
              onChange({
                ...cue,
                style,
                maxWidthPx: MAX_WIDTH_BY_STYLE[style] ?? cue.maxWidthPx,
              });
            }}
          >
            {styles.map((s) => (
              <option key={s} value={s}>
                {STYLE_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        ) : null}
        <span className="cue-range" dir="ltr">
          <MS
            value={cue.startMs}
            title="بداية المقطع بالملي ثانية"
            onChange={(v) => onChange({ ...cue, startMs: v })}
          />
          {" → "}
          <MS
            value={cue.endMs}
            title="نهاية المقطع بالملي ثانية"
            onChange={(v) => onChange({ ...cue, endMs: v })}
          />
        </span>
        <button
          type="button"
          className="icon-btn"
          title="حذف المقطع"
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
          <MS
            value={word.startMs}
            title="لحظة ظهور الكلمة بالملي ثانية"
            onChange={(v) =>
              setWords(
                words.map((w, j) => (j === i ? { ...w, startMs: v } : w)),
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

export const Scenes = ({
  scenes,
  captions,
  styles,
  setScenes,
  setCaptions,
  accept,
  pickedAt,
  pickAsset,
}) => {
  const [srtNames, setSrtNames] = useState({});

  /** فهارس الكابشن مرتّبة تحت كل لقطة، ومقاطع خارج كل اللقطات على حدة. */
  const grouped = useMemo(() => {
    const map = new Map(scenes.map((_, i) => [i, []]));
    const orphans = [];
    captions.forEach((cue, index) => {
      const scene = sceneOfCue(cue, scenes);
      if (scene === -1) orphans.push(index);
      else map.get(scene).push(index);
    });
    return { map, orphans };
  }, [scenes, captions]);

  const replaceCue = useCallback(
    (index, cue) =>
      setCaptions(captions.map((c, i) => (i === index ? cue : c))),
    [captions, setCaptions],
  );
  const removeCue = useCallback(
    (index) => setCaptions(captions.filter((_, i) => i !== index)),
    [captions, setCaptions],
  );

  const addCue = (sceneIndex) => {
    const scene = scenes[sceneIndex];
    const mine = grouped.map.get(sceneIndex) ?? [];
    const lastEnd = mine.length
      ? Math.max(...mine.map((i) => captions[i].endMs))
      : scene.startMs;
    const style = scene.media ? styles[0] : (styles[styles.length - 1] ?? "");
    setCaptions([
      ...captions,
      {
        text: "كلمة جديدة",
        startMs: Math.min(lastEnd, scene.endMs - 100),
        endMs: scene.endMs,
        style,
        wordStartsMs: [],
        maxWidthPx: MAX_WIDTH_BY_STYLE[style] ?? 620,
      },
    ]);
  };

  /**
   * SRT لكل لقطة: توقيتات الملف نسبية لبدايتها فتُزاح إليها، والمقاطع
   * القديمة لتلك اللقطة تُستبدل. الملف الواحد لكل الفيديو يُستورد على أول
   * لقطة بإزاحة صفر لأن بدايتها صفر أصلاً.
   */
  const importSrt = async (sceneIndex, file) => {
    if (!file) return;
    const scene = scenes[sceneIndex];
    const style = scene.media ? styles[0] : (styles[styles.length - 1] ?? "");
    const maxWidthPx = MAX_WIDTH_BY_STYLE[style] ?? 620;
    const maxWords = MAX_WORDS_BY_STYLE[style] ?? 7;
    const shift = (ms) => ms + scene.startMs;
    // كلمة تبدأ بعد نهاية اللقطة لن تُعرض أبداً، فإبقاؤها يوهم أنها ستظهر
    const blocks = srtToCaptions(await file.text()).filter(
      (b) => shift(b.startMs) < scene.endMs,
    );
    const imported = isWordLevel(blocks)
      ? groupWordBlocks(blocks, maxWords).map((group) => ({
          text: group.map((b) => b.text.trim()).join(" "),
          startMs: shift(group[0].startMs),
          endMs: Math.min(shift(group[group.length - 1].endMs), scene.endMs),
          style,
          wordStartsMs: group.map((b) => shift(b.startMs)),
          maxWidthPx,
        }))
      : blocks.map((cue) => {
          const startMs = shift(cue.startMs);
          const endMs = Math.min(shift(cue.endMs), scene.endMs);
          const words = splitWords(cue.text);
          const span = (endMs - startMs) * WORD_SPAN_RATIO;
          return {
            text: cue.text,
            startMs,
            endMs,
            style,
            wordStartsMs: words.map((_, i) =>
              Math.round(startMs + (span * i) / Math.max(1, words.length)),
            ),
            maxWidthPx,
          };
        });

    const mine = new Set(grouped.map.get(sceneIndex) ?? []);
    setCaptions([...captions.filter((_, i) => !mine.has(i)), ...imported]);
    setSrtNames((prev) => ({
      ...prev,
      [sceneIndex]: `${file.name} — ${imported.length} مقاطع`,
    }));
  };

  const setScene = (index, patch) =>
    setScenes(scenes.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const pickVideo = (index, file) => {
    const url = pickAsset(`scenes.${index}.media.src`, file);
    const current = scenes[index].media;
    setScene(index, {
      media:
        url === null
          ? null
          : {
              src: url,
              aspect: current?.aspect ?? "9:16",
              startFromMs: current?.startFromMs ?? 0,
              muted: current?.muted ?? true,
            },
    });
  };

  return (
    <div className="scenes">
      {scenes.map((scene, index) => {
        const mine = grouped.map.get(index) ?? [];
        const picked = pickedAt(`scenes.${index}.media.src`);
        return (
          <div className="scene" key={index}>
            <div className="scene-head">
              <h4>اللقطة {index + 1}</h4>
              <span className="scene-range">
                تظهر من
                <MS
                  value={scene.startMs}
                  title="لحظة ظهور بطاقة اللقطة بالملي ثانية"
                  onChange={(v) => setScene(index, { startMs: v })}
                />
                إلى
                <MS
                  value={scene.endMs}
                  title="لحظة اختفاء بطاقة اللقطة بالملي ثانية"
                  onChange={(v) => setScene(index, { endMs: v })}
                />
                م.ث
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
              <label className="btn ghost tiny">
                {picked || scene.media ? "تغيير الفيديو" : "+ فيديو اللقطة"}
                <input
                  type="file"
                  accept={accept}
                  style={{ display: "none" }}
                  onChange={(e) =>
                    pickVideo(index, e.target.files?.[0] ?? null)
                  }
                />
              </label>
              {scene.media ? (
                <>
                  <span className="file-name">
                    {picked ? picked.name : scene.media.src}
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    title="إزالة الفيديو"
                    onClick={() => pickVideo(index, null)}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <span className="file-empty">
                  بلا فيديو — تظهر اللقطة كشاشة نص
                </span>
              )}
            </div>

            {scene.media ? (
              <div className="scene-row">
                <span className="file-empty">يبدأ الفيديو من داخله عند</span>
                <MS
                  value={scene.media.startFromMs ?? 0}
                  title="تقديم بداية المقطع نفسه بالملي ثانية"
                  onChange={(v) =>
                    setScene(index, {
                      media: { ...scene.media, startFromMs: Math.max(0, v) },
                    })
                  }
                />
                <span className="file-empty">م.ث</span>
                <label className="switch" style={{ marginInlineStart: 8 }}>
                  <input
                    type="checkbox"
                    checked={scene.media.muted !== false}
                    onChange={(e) =>
                      setScene(index, {
                        media: { ...scene.media, muted: e.target.checked },
                      })
                    }
                  />
                  <span>كتم صوت المقطع</span>
                </label>
              </div>
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
                {srtNames[index] ??
                  "توقيتات الملف تُزاح إلى بداية اللقطة وتستبدل كلماتها"}
              </span>
            </div>

            {mine.length === 0 ? (
              <p className="file-empty">لا كلمات في هذه اللقطة بعد.</p>
            ) : (
              mine.map((cueIndex) => (
                <Cue
                  key={cueIndex}
                  cue={captions[cueIndex]}
                  styles={styles}
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
              + مقطع كلمات
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
            <Cue
              key={cueIndex}
              cue={captions[cueIndex]}
              styles={styles}
              onChange={(cue) => replaceCue(cueIndex, cue)}
              onRemove={() => removeCue(cueIndex)}
            />
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="btn ghost tiny"
        onClick={() => {
          const last = scenes[scenes.length - 1];
          const startMs = last ? last.endMs : 0;
          setScenes([
            ...scenes,
            {
              startMs,
              endMs: startMs + 3000,
              media: null,
              placeholderLabel: `لقطة ${scenes.length + 1}`,
            },
          ]);
        }}
      >
        + لقطة جديدة
      </button>
    </div>
  );
};
