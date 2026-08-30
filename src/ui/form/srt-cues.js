import { srtToCaptions } from "../../lib/srt.js";

/**
 * تحويل ملف SRT إلى مقاطع كلمات للقوالب التي تكشف الكلمة كلمةً.
 *
 * فُصل عن محرّر اللقطات ليستعمله محرّر «اصنع قالبك» أيضاً: القاعدتان اللتان
 * ضبطناهما هنا — سقف الكلمات، والكشف عن ملفات مستوى الكلمة — تخصّان شكل
 * العرض لا قالباً بعينه.
 */

/** أقصى عدد كلمات تظهر معاً، ثم يبدأ مقطع جديد من الصفر. */
export const MAX_WORDS_PER_CUE = 3;

/** فجوة تكفي لاعتبار ما بعدها جملة جديدة. */
const SENTENCE_GAP_MS = 700;

const WORD_SPAN_RATIO = 0.85;

export const splitWords = (text) =>
  String(text)
    .split(/\s+/u)
    .filter((w) => w.length > 0);

/**
 * ملفات SRT على نوعين: مقطع لكل جملة، ومقطع لكل كلمة (مخرج Whisper وأمثاله).
 * المقطع وحدةُ عرض تظهر ثم يحلّ محلّها التالي، فلو أخذنا كل بلوك مقطعاً
 * لعرض ملفُ الكلمات كلمةً واحدة في كل لحظة بدل أن تتراكم الجملة.
 */
const isWordLevel = (blocks) => {
  if (blocks.length < 3) return false;
  const singles = blocks.filter((b) => splitWords(b.text).length === 1).length;
  return singles / blocks.length >= 0.7;
};

const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

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

/**
 * يبني المقاطع من نص SRT.
 *
 * `offsetMs` يزيح التوقيتات (لبداية لقطة مثلاً)، و`limitMs` يسقط ما يبدأ
 * بعد نهاية المدى — كلمة لن تُعرض أبداً وجودُها في البيانات يوهم بخلاف ذلك.
 */
export const cuesFromSrt = (
  raw,
  {
    offsetMs = 0,
    limitMs = Number.POSITIVE_INFINITY,
    maxWords = MAX_WORDS_PER_CUE,
    decorate,
  } = {},
) => {
  const shift = (ms) => ms + offsetMs;
  const blocks = srtToCaptions(raw).filter((b) => shift(b.startMs) < limitMs);
  const finish = (cue) => (decorate ? { ...cue, ...decorate(cue) } : cue);

  if (isWordLevel(blocks)) {
    return groupWordBlocks(blocks, maxWords).map((group) =>
      finish({
        text: group.map((b) => b.text.trim()).join(" "),
        startMs: shift(group[0].startMs),
        endMs: Math.min(shift(group[group.length - 1].endMs), limitMs),
        wordStartsMs: group.map((b) => shift(b.startMs)),
      }),
    );
  }

  return blocks.flatMap((cue) => {
    const startMs = shift(cue.startMs);
    const endMs = Math.min(shift(cue.endMs), limitMs);
    const words = splitWords(cue.text);
    if (words.length === 0) return [];
    const step = (endMs - startMs) / words.length;
    const timed = words.map((text, i) => ({
      text,
      startMs: Math.round(startMs + step * i),
    }));
    return chunk(timed, maxWords).map((group, index, all) =>
      finish({
        text: group.map((w) => w.text).join(" "),
        startMs: group[0].startMs,
        endMs: index === all.length - 1 ? endMs : all[index + 1][0].startMs,
        wordStartsMs: group.map((w) => w.startMs),
      }),
    );
  });
};

/** توقيتات صريحة لكل كلمة، حتى لو خلا المقطع منها. */
export const wordsOfCue = (cue) => {
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
