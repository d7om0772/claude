#!/usr/bin/env python3
"""يقص الفراغات الطويلة في التعليق (حد أقصى MAXGAP) ويعيد حساب توقيت الكلمات، ثم يبطّئ الناتج شوي (TEMPO).
يشتغل من داخل مجلد العمل (فيه voice.wav و words.json من voice_pipeline). أسلوب الشرح بالتشبيه: فراغ ≤ 0.25ث."""
import json, re, subprocess, sys
MAXGAP, KEEP = 0.20, {"خربان": 0.34}   # الوقفة الوحيدة: بعد سؤال التجميد
src, out_wav, out_words = "voice.wav", "voice_tight.wav", "words_tight.json"
rep = json.load(open("words.json", encoding="utf-8")); words = rep["words"]
p = subprocess.run(["ffmpeg","-nostdin","-i",src,"-af","silencedetect=noise=-36dB:d=0.09","-f","null","-"],capture_output=True,text=True).stderr
ss = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", p)]; se = [float(x) for x in re.findall(r"silence_end: (-?[\d.]+)", p)]
dur = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",src],capture_output=True,text=True).stdout)
sil = [(max(0,a), b) for a, b in zip(ss, se + [dur])]
# 1) تصحيح حدود الكلمات: لو فيه سكوت داخل بداية الكلمة، البداية = نهاية السكوت؛ ولو السكوت في آخرها، النهاية = بداية السكوت
for w in words:
    for a, b in sil:
        if a <= w["start"] + 0.06 and b > w["start"] + 0.02 and b < w["end"] - 0.05: w["start"] = round(b, 3)
        if a > w["start"] + 0.08 and a < w["end"] - 0.02 and b >= w["end"] - 0.06: w["end"] = round(a, 3)
# 2) القص: كل سكوت أطول من الحد ينقص للحد (نخلي نصه قبل ونصه بعد)
cuts = []
for a, b in sil:
    prev = [w for w in words if w["end"] <= a + 0.12]
    keep = MAXGAP
    if prev:
        for k, v in KEEP.items():
            if k in prev[-1]["w"]: keep = v
    if a <= 0.01: keep = 0.04          # البداية: أول كلمة تجي على طول
    if b >= dur - 0.01: keep = 0.10    # النهاية
    if b - a > keep + 0.02: cuts.append((a + keep / 2, b - keep / 2))
def remap(t):
    s = 0.0
    for a, b in cuts:
        if t >= b: s += b - a
        elif t > a: s += t - a
    return round(t - s, 3)
segs, pos = [], 0.0
for a, b in cuts: segs.append((pos, a)); pos = b
segs.append((pos, dur))
flt = ";".join(f"[0:a]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st={max(0,b-a-0.008):.4f}:d=0.008[s{i}]" for i,(a,b) in enumerate(segs))
flt += ";" + "".join(f"[s{i}]" for i in range(len(segs))) + f"concat=n={len(segs)}:v=0:a=1[o]"
subprocess.run(["ffmpeg","-nostdin","-v","error","-y","-i",src,"-filter_complex",flt,"-map","[o]","-ar","48000","-ac","1",out_wav],check=True)
for w in words: w["start"], w["end"] = remap(w["start"]), remap(w["end"])
nd = remap(dur); rep["words"] = words; rep["duration"] = nd; rep["tightened"] = {"max_gap": MAXGAP, "removed_s": round(dur - nd, 3), "cuts": len(cuts)}
rep["words_per_s"] = round(len(words) / nd, 2)
json.dump(rep, open(out_words, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{dur:.2f}s -> {nd:.2f}s  ({len(cuts)} cuts)  {rep['words_per_s']} w/s")
# 3) تبطيء خفيف (TEMPO) عشان السرعة بعد قص الفراغات ما تصير مستعجلة ← voice_final.wav / words_final.json
TEMPO = 0.94
subprocess.run(["ffmpeg","-nostdin","-v","error","-y","-i",out_wav,"-af",f"atempo={TEMPO}","-ar","48000","-ac","1","voice_final.wav"],check=True)
for w in words: w["start"], w["end"] = round(w["start"] / TEMPO, 3), round(w["end"] / TEMPO, 3)
fd = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0","voice_final.wav"],capture_output=True,text=True).stdout)
rep["duration"] = round(fd, 3); rep["tempo_total"] = round(rep.get("tempo", 1.0) * TEMPO, 4); rep["words_per_s"] = round(len(words) / fd, 2)
json.dump(rep, open("words_final.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"final {fd:.2f}s @ tempo {TEMPO}")
