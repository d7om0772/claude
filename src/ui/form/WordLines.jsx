import React from "react";
import { wordsOfCue } from "./srt-cues.js";

/**
 * تحرير الكلمات كلمةً كلمة، والأسطر تتكوّن منها.
 *
 * المقطع في القالب وحدةُ سطر: كلماته تُرصف معاً ويظهر بعضها بعد بعض. لكن
 * وحدة التحرير هي الكلمة — نصّها وتوقيتها — فيعرض هذا المكوّن صفاً لكل كلمة
 * داخل صندوق يمثّل السطر، ويعيد توزيع الكلمات على الأسطر عند تغيير عددها.
 *
 * إعادة التوزيع تجري على الكلمات نفسها لا على ملف SRT، فتعمل بعد التحرير
 * اليدوي كما تعمل بعد الاستيراد.
 */

/** المسافة بعد آخر كلمة حين لا يوجد ما بعدها يحدّد النهاية. */
const TAIL_MS = 700;

/** كل الكلمات بترتيبها الزمني، مسطّحة من الأسطر. */
export const flattenWords = (cues) =>
  cues.flatMap((cue) => wordsOfCue(cue)).sort((a, b) => a.startMs - b.startMs);

/** يعيد بناء الأسطر من قائمة الكلمات، كل سطر بعدد ثابت. */
export const reflow = (words, perLine, lastEndMs) => {
  const lines = [];
  for (let i = 0; i < words.length; i += perLine) {
    lines.push(words.slice(i, i + perLine));
  }
  return lines.map((line, index) => {
    const next = lines[index + 1];
    const start = line[0].startMs;
    // نهاية السطر بداية التالي: بلا هذا يبقى السطر معروضاً فوق الذي يليه
    const end = next
      ? next[0].startMs
      : Math.max(lastEndMs ?? 0, line[line.length - 1].startMs + TAIL_MS);
    return {
      text: line.map((w) => w.text).join(" "),
      startMs: Math.round(start),
      endMs: Math.round(end),
      wordStartsMs: line.map((w) => Math.round(w.startMs)),
    };
  });
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

export const WordLines = ({ cues, setCues, perLine, setPerLine }) => {
  const words = flattenWords(cues);
  const lastEndMs = cues.reduce((max, c) => Math.max(max, c.endMs), 0);
  const commit = (next, count = perLine) =>
    setCues(reflow(next, count, lastEndMs));

  /**
   * تغيير عدد الكلمات يعيد توزيع الكلمات الحالية فوراً.
   *
   * الاكتفاء بتغيير الرقم يترك المخزَّن على تقسيمه القديم، فتختلف القائمة عن
   * المعاينة. وإعادة الاشتقاق من ملف SRT كانت تمحو التحرير اليدوي — فالتوزيع
   * يجري على الكلمات نفسها.
   */
  const changePerLine = (count) => {
    setPerLine(count);
    if (words.length > 0) commit(words, count);
  };

  const replaceWord = (index, patch) =>
    commit(words.map((w, i) => (i === index ? { ...w, ...patch } : w)));

  const removeWord = (index) => commit(words.filter((_, i) => i !== index));

  const addWordAfter = (index) => {
    const current = words[index];
    const next = words[index + 1];
    const startMs = next
      ? (current.startMs + next.startMs) / 2
      : current.startMs + 400;
    const copy = words.slice();
    copy.splice(index + 1, 0, { text: "كلمة", startMs });
    commit(copy);
  };

  const lines = [];
  for (let i = 0; i < words.length; i += perLine) {
    lines.push({ start: i, words: words.slice(i, i + perLine) });
  }

  return (
    <div className="field">
      <label>الكلمات ({words.length})</label>

      <div className="scene-row">
        <span className="file-empty">كلمات السطر</span>
        <div className="stepper">
          <button
            type="button"
            className="btn ghost tiny"
            onClick={() => changePerLine(Math.max(1, perLine - 1))}
          >
            −
          </button>
          <span className="stepper-value">{perLine}</span>
          <button
            type="button"
            className="btn ghost tiny"
            onClick={() => changePerLine(Math.min(10, perLine + 1))}
          >
            +
          </button>
        </div>
      </div>

      {words.length === 0 ? (
        <div className="note">
          لا كلمات بعد — ارفع ملف SRT من «الصوت والتزامن»، أو أضف كلمة يدوياً.
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn ghost tiny"
              onClick={() => commit([{ text: "كلمة", startMs: 0 }])}
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
              <button
                type="button"
                className="icon-btn"
                title="حذف السطر بكلماته"
                onClick={() =>
                  commit(
                    words.filter(
                      (_, i) => i < line.start || i >= line.start + perLine,
                    ),
                  )
                }
              >
                ✕
              </button>
            </div>
            {line.words.map((word, i) => {
              const index = line.start + i;
              return (
                <div className="word-row" key={index}>
                  <span className="word-index">{index + 1}</span>
                  <input
                    type="text"
                    value={word.text}
                    onChange={(e) =>
                      replaceWord(index, { text: e.target.value })
                    }
                  />
                  <MS
                    value={word.startMs}
                    title="لحظة ظهور الكلمة بالملي ثانية"
                    onChange={(v) => replaceWord(index, { startMs: v })}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    title="كلمة جديدة بعدها"
                    onClick={() => addWordAfter(index)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="حذف الكلمة"
                    onClick={() => removeWord(index)}
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
