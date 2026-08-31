import React from "react";
import { Sequence, staticFile } from "remotion";
import { Audio } from "./media.js";
import { resolveAsset } from "./asset-url.js";

/**
 * نقرة صوتية مع كل كلمة تظهر.
 *
 * جُمع هنا لأن القوالب الخمسة تشترك في السلوك وتختلف في مصدر اللحظات: منها
 * ما يكون كل مقطع فيه كلمة، ومنها ما يعرض الجملة كتلةً، ومنها ما تتحرّك
 * كلماته على محطات. لذلك تأخذ `WordClicks` اللحظات جاهزة، وتبقى الحسبة في
 * القالب حيث تُعرف حركته.
 */

/** نسبة مدة المقطع التي تُوزَّع عليها كلماته حين لا يوجد توقيت صريح. */
const WORD_SPAN_RATIO = 0.85;

/**
 * لحظات ظهور الكلمات داخل مقاطع الترجمة.
 *
 * `wordStartsMs` — حين توفّره الواجهة من ملف SRT على مستوى الكلمة — أدقّ من
 * أي توزيع، فيُقدَّم. وإلا وُزِّعت كلمات المقطع على مدّته، وهو تقريب مقصود:
 * المقطع يظهر كتلةً فالنقرات تتبع الإيقاع لا الظهور.
 */
export const cueWordOnsets = (captions) => {
  const onsets = [];
  for (const cue of captions ?? []) {
    const words = String(cue.text ?? "")
      .split(/\s+/u)
      .filter((w) => w.length > 0);
    if (words.length === 0) continue;
    const explicit = cue.wordStartsMs ?? [];
    if (explicit.length >= words.length) {
      onsets.push(...explicit.slice(0, words.length));
      continue;
    }
    const span = (cue.endMs - cue.startMs) * WORD_SPAN_RATIO;
    for (let i = 0; i < words.length; i += 1) {
      onsets.push(cue.startMs + (span * i) / words.length);
    }
  }
  return onsets.sort((a, b) => a - b);
};

/** نقرة واحدة عند كل لحظة. `src` فارغ يوقف الصوت كله. */
export const WordClicks = ({ src, volume, onsetsMs, fps }) => {
  if (!src || onsetsMs.length === 0) return null;
  const resolved = resolveAsset(src, staticFile);
  return (
    <>
      {onsetsMs.map((onsetMs, i) => (
        <Sequence
          key={`click-${i}-${Math.round(onsetMs)}`}
          from={Math.max(0, Math.round((onsetMs / 1000) * fps))}
          layout="none"
        >
          <Audio src={resolved} volume={volume} />
        </Sequence>
      ))}
    </>
  );
};
