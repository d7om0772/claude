#!/usr/bin/env python3
"""
caption_align.py — يربط كلمات نص الكابشن (اللي يظهر على الشاشة) بتوقيت كلمات الصوت (words.json من Whisper)،
ويقسمها لأسطر ترجمة قصيرة. الناتج يتحط مباشرة في scene.json → "captions".

  python3 -I studio/tools/caption_align.py --caption work/<ID>/caption.txt --words work/<ID>/words.json --out work/<ID>/captions.json
       [--max-chars 26] [--max-words 6]

الطريقة: تطبيع الطرفين (الأرقام = NUM، مرادفات اللهجة) ← مطابقة تسلسلية ← الكلمات اللي ما تطابقت تاخذ توقيت
بالتناسب بين أقرب كلمتين متطابقتين. التقسيم: نهاية جملة/فاصلة، أو سكتة > 0.45ث، أو تجاوز الحد.
يطبع نسبة التطابق: لو أقل من 0.7 راجع النصين (يمكن الكابشن والتعليق مختلفين في المعنى).
"""
import argparse, difflib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import transcribe as T  # noqa: E402

END_PUNCT = re.compile(r"[\.\!\؟\?…:؛،,]$")
STRIP_END = re.compile(r"[\.،,:؛]+$")

def canon_tokens(word):
    """كلمة واحدة → رموز مطبّعة (قد تكون صفر لو كانت رمز فقط)."""
    return T.tokens(word)

def flatten(words):
    """[(canon, word_index)] مع دمج NUM المتتالية."""
    out = []
    for i, w in enumerate(words):
        for c in canon_tokens(w):
            if c == "NUM" and out and out[-1][0] == "NUM": out[-1] = ("NUM", out[-1][1]); continue
            out.append((c, i))
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--caption", required=True); ap.add_argument("--words", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--max-chars", type=int, default=26); ap.add_argument("--max-words", type=int, default=6)
    a = ap.parse_args()
    cap_text = open(a.caption, encoding="utf-8").read().strip() if os.path.exists(a.caption) else a.caption
    cap_text = re.sub(r"\s*\+\s*", " + ", cap_text)
    cw = [w for w in cap_text.split() if w]
    ww = json.load(open(a.words, encoding="utf-8"))["words"]
    A = flatten(cw); B = flatten([w["w"] for w in ww])
    sm = difflib.SequenceMatcher(a=[x[0] for x in A], b=[x[0] for x in B], autojunk=False)
    times = [None] * len(cw)
    matched = 0
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            ci = A[blk.a + k][1]; wi = B[blk.b + k][1]
            # لو الرمز NUM: الكلمة تمتد على كل كلمات الرقم في Whisper
            wj = wi
            if A[blk.a + k][0] == "NUM":
                while wj + 1 < len(ww) and all(c == "NUM" for c in canon_tokens(ww[wj + 1]["w"])) and canon_tokens(ww[wj + 1]["w"]): wj += 1
            st, en = ww[wi]["start"], ww[wj]["end"]
            if times[ci] is None: times[ci] = [st, en]; matched += 1
            else: times[ci][1] = max(times[ci][1], en)
    # تعبئة الفراغات بالتناسب حسب طول الكلمة
    n = len(cw); i = 0
    t_end = ww[-1]["end"] if ww else 0.0
    while i < n:
        if times[i] is not None: i += 1; continue
        j = i
        while j < n and times[j] is None: j += 1
        left = times[i - 1][1] if i > 0 else (ww[0]["start"] if ww else 0.0)
        right = times[j][0] if j < n else t_end
        span = max(0.05, right - left); lens = [max(1, len(cw[k])) for k in range(i, j)]; tot = sum(lens); acc = left
        for k, L in zip(range(i, j), lens):
            d = span * L / tot; times[k] = [round(acc, 3), round(acc + d, 3)]; acc += d
        i = j
    # تقسيم الأسطر
    lines, cur, chars = [], [], 0
    for k, w in enumerate(cw):
        st, en = times[k]
        gap = (st - times[k - 1][1]) if k else 0
        over = chars + len(w) > a.max_chars and not (END_PUNCT.search(w) and chars + len(w) <= a.max_chars + 8)
        if cur and (over or len(cur) >= a.max_words or gap > 0.45):
            lines.append(cur); cur, chars = [], 0
        cur.append({"w": w, "start": round(st, 3), "end": round(en, 3)}); chars += len(w) + 1
        if END_PUNCT.search(w): lines.append(cur); cur, chars = [], 0
    if cur: lines.append(cur)
    out = []
    for L in lines:
        # "+" ما يبدأ ولا ينهي سطر
        while L and L[0]["w"] == "+" and out: out[-1]["words"].append(L.pop(0))
        if not L: continue
        L[-1]["w"] = STRIP_END.sub("", L[-1]["w"]) or L[-1]["w"]
        out.append({"start": L[0]["start"], "end": L[-1]["end"], "words": L})
    for L in out: L["start"], L["end"] = L["words"][0]["start"], L["words"][-1]["end"]
    res = {"lines": out, "match_ratio": round(matched / max(1, n), 3), "caption_words": n}
    json.dump(res, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps({"lines": len(out), "match_ratio": res["match_ratio"], "caption_words": n}, ensure_ascii=False))

if __name__ == "__main__":
    main()
