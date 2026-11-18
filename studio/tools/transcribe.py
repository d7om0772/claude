#!/usr/bin/env python3
"""
transcribe.py — تفريغ الصوت بـ faster-whisper (large-v3-turbo) + توقيت كل كلمة + مطابقة النص.

الاستخدام:
  python3 studio/tools/transcribe.py AUDIO [--expected voice_text.txt] [--out words.json] [--lang ar]

الناتج (JSON):
  {"text": "...", "duration": s, "words":[{"w":"...","start":s,"end":s,"p":prob}],
   "match": {"score":0..1, "expected_words":N, "missing":[...], "extra":[...]}}
score = نسبة كلمات النص المتوقع اللي طلعت في التفريغ بعد التطبيع (الأرقام كلها NUM، ومرادفات اللهجة/الإنجليزي).
المعيار: >= 0.85 مقبول. تحت كذا راجع قائمة missing: لو الفرق كلمات لهجة كتبها Whisper فصحى، عدّها مطابقة وأضفها لـ ALIASES.
--caption نص الكابشن الأصلي (اختياري): يُحسب التطابق معه أيضاً ويؤخذ الأعلى.
"""
import argparse, json, re, sys, difflib, os

LATIN_ACC = str.maketrans("öüäéèáàíóú", "ouaeeaaiou")  # Ragnarök = ragnarok
AR_DIAC = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")
def norm(s: str) -> str:
    s = AR_DIAC.sub("", s)
    s = s.replace("أ","ا").replace("إ","ا").replace("آ","ا").replace("ى","ي").replace("ة","ه").replace("ؤ","و").replace("ئ","ي")
    s = s.lower().translate(LATIN_ACC)
    s = re.sub(r"[^\w\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()

# كلمات الأرقام (عامي + فصحى + إنجليزي) — تتحول كلها إلى NUM، وأي رقم مكتوب بالأرقام كذلك.
NUM_WORDS = set(norm(w) for w in """
صفر واحد وحده وحدة اثنين ثنين اثنان ثلاث ثلاثه ثلاثة اربع اربعه اربعة خمس خمسه خمسة ست سته ستة سبع سبعه سبعة ثمان ثمانيه ثمانية ثمن تسع تسعه تسعة عشر عشره عشرة
احدعش احدعشر اطنعش اثنعش ثنعش اثنا ثلطعش ثلاثطعش اربعطعش اربعتعش خمسطعش خمستعش ستطعش سطعش سبعطعش سبعتعش ثمنطعش ثمانطعش تسعطعش تسعتعش
عشرين ثلاثين ثلاثين اربعين خمسين ستين سبعين ثمانين ثمنين تسعين مية ميه مئة مائة ميتين مئتين ثلاثمية ثلاثمية اربعمية خمسمية ستمية سبعمية ثمنمية ثمانمية تسعمية
الف الفين الاف ملايين مليون مليار نص ربع
zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand
""".split())
# مرادفات يكتبها Whisper بطريقة ثانية (لهجة→فصحى، عربي↔إنجليزي). المفتاح والقيمة يتحولون لنفس الرمز.
ALIASES = {
  "قيمنق":"gaming","قيمينق":"gaming","جيمنج":"gaming","جيمنق":"gaming","جيمينج":"gaming","جيمينغ":"gaming","جيمنغ":"gaming","قيمر":"gamer","جيمر":"gamer",
  "قيقا":"giga","جيجا":"giga","قيقابايت":"giga","جيجابايت":"giga","gb":"giga",
  "رام":"ram","تيرا":"tera","تيرابايت":"tera","tb":"tera",
  "تبي":"want","تبغي":"want","تريد":"want","تبا":"want","تبت":"want",
  "كرت":"card","كارت":"card","بطاقه":"card",
  "هلا":"hala","اهلا":"hala",
  "شفت":"shift","شيفت":"shift","كنترول":"ctrl","control":"ctrl","التر":"alt","الت":"alt","ويندوز":"windows","انتر":"enter","تاب":"tab",
  "فريم":"fps","فريمات":"fps","فريمز":"fps","اف":"f",
  "اس":"s","اكس":"x","زد":"z","دي":"d","سي":"c","جي":"g","ار":"r",
  "كيبل":"cable","كابل":"cable","كيبلات":"cable","سلك":"cable",
  "سوداء":"black","سوده":"black","سودا":"black","اسود":"black",
  "بيسي":"pc","كمبيوتر":"pc","جهاز":"pc",
  "اسكيب":"esc","اسكايب":"esc","ديليت":"del","ديلت":"del","سبيس":"space","انتير":"enter",
  "رايزن":"ryzen","كور":"core","ار تي اكس":"rtx",
  "بايوس":"bios","كينغستن":"kingston","كينجستون":"kingston","كينغستون":"kingston","كورسير":"corsair","كورسair":"corsair","ايسس":"asus","اسوس":"asus","واط":"w","ترا":"ultra","الترا":"ultra","دارك":"darkflash",
  "مذربورد":"mobo","ماذربورد":"mobo","مذربوردات":"mobo","بورده":"mobo","win":"windows","giga":"giga","بي":"p","تي":"t","اف ان":"fn",
}
PREFIX = re.compile(r"^(و|ب|ل|ف)(?=\d)")
def canon(t):
    t = PREFIX.sub("", t)
    if t.startswith("ال") and len(t) > 4: t = t[2:]   # نفس المعاملة للطرفين، فـ"الكيبل" = "كيبل"
    if re.fullmatch(r"[\d.,]+", t) or t in NUM_WORDS: return "NUM"
    for pre in ("و", "ب"):
        if t.startswith(pre) and t[len(pre):] in NUM_WORDS: return "NUM"
    return ALIASES.get(t, t)

def tokens(s):
    out = []
    for t in norm(s).split(" "):
        if not t: continue
        # فصل الأرقام الملتصقة بحروف مثل و16 أو 5060Ti
        pieces = re.findall(r"\d+|[a-z]+|[^\da-z]+", t)
        # "وشفت" = و + Shift ، "واس" = و + S: نفصل حرف العطف/الجر لو الباقي كلمة معروفة
        if len(pieces) == 1 and len(t) > 2 and t[0] in "وبف":
            rest = t[1:]; rr = rest[2:] if rest.startswith("ال") and len(rest) > 4 else rest
            if rest in ALIASES or rest in NUM_WORDS or rr in ALIASES:
                out.append(t[0]); pieces = [rest]
        for piece in pieces:
            c = canon(piece)
            if c == "NUM" and out and out[-1] == "NUM": continue  # "خمسين ستين" = رقم واحد
            out.append(c)
    return out

def match(expected: str, got: str):
    e, g = tokens(expected), tokens(got)
    sm = difflib.SequenceMatcher(a=e, b=g, autojunk=False)
    matched = sum(b.size for b in sm.get_matching_blocks())
    missing, extra = [], []
    for op, a0, a1, b0, b1 in sm.get_opcodes():
        if op in ("replace", "delete"): missing += e[a0:a1]
        if op in ("replace", "insert"): extra += g[b0:b1]
    return {"score": round(matched / max(1, len(e)), 3), "expected_words": len(e),
            "missing": missing[:60], "extra": extra[:60]}

def load_audio(path, sr=16000):
    """فك الصوت بـ ffmpeg مباشرة (بدون PyAV) إلى float32 mono 16k."""
    import subprocess, numpy as np
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr),
                          "-f", "f32le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio"); ap.add_argument("--expected"); ap.add_argument("--caption"); ap.add_argument("--out")
    ap.add_argument("--lang", default="ar"); ap.add_argument("--model", default=os.environ.get("WHISPER_MODEL","large-v3-turbo"))
    a = ap.parse_args()
    from faster_whisper import WhisperModel
    m = WhisperModel(a.model, device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4)
    audio = load_audio(a.audio)
    segs, info = m.transcribe(audio, language=a.lang, word_timestamps=True, vad_filter=False,
                              beam_size=5, condition_on_previous_text=False)
    words, text = [], []
    for s in segs:
        text.append(s.text.strip())
        for w in (s.words or []):
            words.append({"w": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3), "p": round(w.probability, 3)})
    res = {"text": " ".join(text), "duration": round(info.duration, 3), "words": words}
    if a.expected:
        exp = open(a.expected, encoding="utf-8").read() if os.path.exists(a.expected) else a.expected
        res["match"] = match(exp, res["text"])
        if a.caption:  # النص الأصلي (بالأرقام والإنجليزي) — نأخذ الأعلى
            cap = open(a.caption, encoding="utf-8").read() if os.path.exists(a.caption) else a.caption
            mc = match(cap, res["text"])
            if mc["score"] > res["match"]["score"]: res["match"] = dict(mc, against="caption")
    out = json.dumps(res, ensure_ascii=False, indent=1)
    if a.out: open(a.out, "w", encoding="utf-8").write(out)
    print(json.dumps({k: v for k, v in res.items() if k != "words"}, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
