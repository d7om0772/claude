import React from "react";
import { wordsOfCue } from "./srt-cues.js";

/**
 * تحرير الكلمات كلمةً كلمة، والأسطر تتكوّن منها.
 *
 * المقطع في القالب وحدةُ سطر: كلماته تُرصف معاً ويظهر بعضها بعد بعض. لكن
 * وحدة التحرير هي الكلمة — نصّها وتوقيتها — فيعرض هذا المكوّن صفاً لكل كلمة
 * داخل صندوق يمثّل السطر.
 *
 * الأسطر تُقرأ من المقاطع المخزَّنة لا من عدد ثابت، فيصحّ أن يختلف طول سطر
 * عن آخر. والعدّاد العام يبقى أداة توزيع شامل حين يريد المستخدم تسوية الكل.
 *
 * ستايل السطر وموضعه محفوظان على كلماته: أيّ إعادة توزيع تعيد بناء الأسطر
 * من الكلمات، فحفظُهما على السطر وحده يضيّعهما عند أول تغيير.
 */

/** المسافة بعد آخر كلمة حين لا يوجد ما بعدها يحدّد النهاية. */
const TAIL_MS = 700;

/** الأسطر كما هي مخزَّنة: كل مقطع سطر، وكلماته صفوفه. */
export const linesOfCues = (cues) =>
  cues
    .map((cue) => ({ words: wordsOfCue(cue) }))
    .filter((l) => l.words.length > 0);

/** كل الكلمات بترتيبها، مسطّحة من الأسطر. */
export const flattenWords = (lines) => lines.flatMap((line) => line.words);

/** يبني المقاطع من الأسطر: نهاية السطر بداية الذي يليه. */
export const cuesOfLines = (lines, lastEndMs) => {
  const kept = lines.filter((line) => line.words.length > 0);
  return kept.map((line, index) => {
    const next = kept[index + 1];
    const first = line.words[0];
    const last = line.words[line.words.length - 1];
    // نهاية السطر بداية التالي: بلا هذا يبقى السطر معروضاً فوق الذي يليه
    const end = next
      ? next.words[0].startMs
      : Math.max(lastEndMs ?? 0, last.startMs + TAIL_MS);
    return {
      text: line.words.map((w) => w.text).join(" "),
      startMs: Math.round(first.startMs),
      endMs: Math.round(end),
      wordStartsMs: line.words.map((w) => Math.round(w.startMs)),
      style: first.style ?? null,
      yRatio: first.yRatio ?? null,
    };
  });
};

/** يقطّع قائمة كلمات إلى أسطر بأطوال معطاة، وما زاد يأخذ الطول الأخير. */
const cut = (words, lengths) => {
  const out = [];
  let cursor = 0;
  let i = 0;
  while (cursor < words.length) {
    const take = Math.max(1, lengths[i] ?? lengths[lengths.length - 1] ?? 1);
    out.push({ words: words.slice(cursor, cursor + take) });
    cursor += take;
    i += 1;
  }
  return out;
};

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

/** مواضع السطر الجاهزة — نِسب من ارتفاع الإطار. */
const POSITIONS = [
  { value: "", label: "موضع القالب" },
  { value: "0.18", label: "أعلى" },
  { value: "0.5", label: "وسط" },
  { value: "0.84", label: "أسفل" },
];

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

export const WordLines = ({
  cues,
  setCues,
  perLine,
  setPerLine,
  perWordTiming = true,
  styles = [],
  defaultStyle = null,
}) => {
  const lines = linesOfCues(cues);
  const words = flattenWords(lines);
  const lastEndMs = cues.reduce((max, c) => Math.max(max, c.endMs), 0);
  const commitLines = (next) => setCues(cuesOfLines(next, lastEndMs));

  /** يبدّل كلمات سطر واحد ويترك البقية كما هي. */
  const patchLine = (index, nextWords) =>
    commitLines(
      lines.map((line, i) => (i === index ? { words: nextWords } : line)),
    );

  /** الكلمة المنتقلة تأخذ ستايل السطر الذي دخله وموضعه، لا ستايل سطرها القديم. */
  const stamp = (items, host) =>
    items.map((w) => ({
      ...w,
      style: host?.style ?? null,
      yRatio: host?.yRatio ?? null,
    }));

  /**
   * يغيّر كلمات سطر واحد بتحريك حدّه مع الذي يليه فقط.
   *
   * إعادة تقطيع ما بعده كاملاً تُخلّف أسطراً من كلمة واحدة كلما نقص سطر —
   * جرّبناه فتكاثرت الأسطر. الصواب: ما نقص ينزل لأول التالي، وما زاد يُسحب
   * من أوله، وما فرغ من الأسطر يُحذف.
   */
  const resizeLine = (index, count) => {
    const next = lines.map((line) => ({ words: line.words.slice() }));
    const target = next[index];
    const delta = Math.max(1, count) - target.words.length;

    if (delta < 0) {
      const moved = target.words.splice(delta);
      const below = next[index + 1];
      if (below) below.words.unshift(...stamp(moved, below.words[0]));
      else next.push({ words: moved });
    } else {
      let need = delta;
      for (let i = index + 1; i < next.length && need > 0; i += 1) {
        const taken = next[i].words.splice(0, need);
        target.words.push(...stamp(taken, target.words[0]));
        need -= taken.length;
      }
    }
    commitLines(next.filter((line) => line.words.length > 0));
  };

  /**
   * العدّاد العام يسوّي كل الأسطر على طول واحد.
   *
   * الاكتفاء بتغيير الرقم يترك المخزَّن على تقسيمه القديم، فتختلف القائمة عن
   * المعاينة. والتوزيع يجري على الكلمات نفسها لا على ملف SRT، فيصمد التحرير
   * اليدوي.
   */
  const changePerLine = (count) => {
    setPerLine(count);
    if (words.length > 0) commitLines(cut(words, [count]));
  };

  /** خاصية تُكتب على كل كلمات السطر — ستايله أو موضعه. */
  const setLineProp = (index, patch) =>
    patchLine(
      index,
      lines[index].words.map((w) => ({ ...w, ...patch })),
    );

  const replaceWord = (lineIndex, wordIndex, patch) =>
    patchLine(
      lineIndex,
      lines[lineIndex].words.map((w, i) =>
        i === wordIndex ? { ...w, ...patch } : w,
      ),
    );

  const removeWord = (lineIndex, wordIndex) =>
    patchLine(
      lineIndex,
      lines[lineIndex].words.filter((_, i) => i !== wordIndex),
    );

  const addWordAfter = (lineIndex, wordIndex) => {
    const line = lines[lineIndex].words;
    const current = line[wordIndex];
    const next = line[wordIndex + 1] ?? lines[lineIndex + 1]?.words[0];
    const startMs = next
      ? (current.startMs + next.startMs) / 2
      : current.startMs + 400;
    const copy = line.slice();
    // الكلمة الجديدة ترث ستايل سطرها وموضعه، وإلا انقسم السطر على نفسه
    copy.splice(wordIndex + 1, 0, {
      text: "كلمة",
      startMs,
      style: current.style ?? null,
      yRatio: current.yRatio ?? null,
    });
    patchLine(lineIndex, copy);
  };

  let counter = 0;

  return (
    <div className="field">
      <label>الكلمات ({words.length})</label>

      <div className="scene-row">
        <span className="file-empty">
          {perWordTiming ? "توزيع كل الأسطر" : "توزيع كل الأسطر (تظهر معاً)"}
        </span>
        <Stepper
          value={perLine}
          min={1}
          max={10}
          onChange={changePerLine}
          title="يسوّي كل الأسطر على هذا العدد. لتغيير سطر وحده استعمل عدّاده"
        />
      </div>

      {words.length === 0 ? (
        <div className="note">
          لا كلمات بعد — ارفع ملف SRT، أو أضف كلمة يدوياً.
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn ghost tiny"
              onClick={() =>
                commitLines([
                  { words: [{ text: "كلمة", startMs: 0, style: null }] },
                ])
              }
            >
              + كلمة
            </button>
          </div>
        </div>
      ) : (
        lines.map((line, lineIndex) => (
          <div className="cue" key={lineIndex}>
            <div className="cue-head">
              <span className="stage-label" style={{ position: "static" }}>
                سطر {lineIndex + 1}
              </span>
              <Stepper
                value={line.words.length}
                onChange={(count) => resizeLine(lineIndex, count)}
                title="كلمات هذا السطر — ما زاد ينزل للسطر التالي"
              />
              {perWordTiming ? null : (
                <span className="cue-range">
                  <MS
                    value={line.words[0].startMs}
                    title="لحظة ظهور السطر بالملي ثانية"
                    onChange={(v) => setLineProp(lineIndex, { startMs: v })}
                  />
                </span>
              )}
              <button
                type="button"
                className="icon-btn"
                title="حذف السطر بكلماته"
                onClick={() =>
                  commitLines(lines.filter((_, i) => i !== lineIndex))
                }
              >
                ✕
              </button>
            </div>

            <div className="cue-head">
              {styles.length > 0 ? (
                <select
                  className="line-style"
                  title="ستايل هذا السطر وحده"
                  value={line.words[0].style ?? ""}
                  onChange={(e) =>
                    setLineProp(lineIndex, {
                      style: e.target.value === "" ? null : e.target.value,
                    })
                  }
                >
                  <option value="">
                    ستايل القالب
                    {defaultStyle
                      ? ` (${styles.find((s) => s.value === defaultStyle)?.label ?? defaultStyle})`
                      : ""}
                  </option>
                  {styles.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              ) : null}
              <select
                className="line-style"
                title="موضع هذا السطر رأسياً"
                value={
                  line.words[0].yRatio === null ||
                  line.words[0].yRatio === undefined
                    ? ""
                    : String(line.words[0].yRatio)
                }
                onChange={(e) =>
                  setLineProp(lineIndex, {
                    yRatio:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              >
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {line.words.map((word, i) => {
              counter += 1;
              const number = counter;
              return (
                <div className="word-row" key={i}>
                  <span className="word-index">{number}</span>
                  <input
                    type="text"
                    value={word.text}
                    onChange={(e) =>
                      replaceWord(lineIndex, i, { text: e.target.value })
                    }
                  />
                  {perWordTiming ? (
                    <MS
                      value={word.startMs}
                      title="لحظة ظهور الكلمة بالملي ثانية"
                      onChange={(v) =>
                        replaceWord(lineIndex, i, { startMs: v })
                      }
                    />
                  ) : null}
                  <button
                    type="button"
                    className="icon-btn"
                    title="كلمة جديدة بعدها"
                    onClick={() => addWordAfter(lineIndex, i)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="حذف الكلمة"
                    onClick={() => removeWord(lineIndex, i)}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
};
