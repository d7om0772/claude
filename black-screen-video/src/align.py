# Align whisper word timings to the ORIGINAL caption text (captions keep the original wording),
# snapping word starts that fall inside detected silences to the end of that silence.
import json, re, subprocess, sys
TRIM = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
orig = open("audio/script_spoken.txt", encoding="utf-8").read().split()
ww = json.load(open(sys.argv[1], encoding="utf-8"))
assert len(orig) == len(ww), (len(orig), len(ww))
log = subprocess.run(["ffmpeg", "-v", "info", "-i", "audio/vo_take1.wav", "-af", "silencedetect=n=-40dB:d=0.15", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
sil = list(zip(st, en))
out = []
for o, w in zip(orig, ww):
    s, e = w["s"], w["e"]
    for a, b in sil:
        if a - 0.1 <= s < b and b < e:
            s = b
        if a < e <= b + 0.02 and a > s:
            e = a
    out.append({"w": o, "heard": w["w"], "s": round(max(0, s - TRIM), 3), "e": round(e - TRIM, 3)})
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for i, x in enumerate(out):
    print(i, x["w"], x["heard"], x["s"], x["e"])
