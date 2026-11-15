#!/usr/bin/env python3
"""
voice_profile.py — بصمة صوت بسيطة للمقارنة بين فهد (ElevenLabs) و Charon (Gemini):
  طبقة الصوت F0 (الوسيط والمدى)، وسرعة الكلام (كلمة/ثانية من ملف words.json)، ونسبة السكتات.
الاستخدام: python3 studio/tools/voice_profile.py AUDIO [words.json]
"""
import sys, json, subprocess, numpy as np

def load(path, sr=16000):
    raw = subprocess.run(["ffmpeg","-nostdin","-v","error","-i",path,"-ac","1","-ar",str(sr),"-f","f32le","-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32), sr

def f0_track(x, sr, fmin=60, fmax=300, win=0.04, hop=0.01):
    n, h = int(win*sr), int(hop*sr); out = []
    rms_all = np.sqrt(np.mean(x**2)) + 1e-9
    for i in range(0, len(x)-n, h):
        f = x[i:i+n] - np.mean(x[i:i+n])
        if np.sqrt(np.mean(f**2)) < 0.3*rms_all: continue
        ac = np.correlate(f, f, "full")[n-1:]
        lo, hi = int(sr/fmax), int(sr/fmin)
        if ac[0] <= 0: continue
        k = lo + np.argmax(ac[lo:hi]); 
        if ac[k]/ac[0] > 0.45: out.append(sr/k)
    return np.array(out)

def main():
    x, sr = load(sys.argv[1]); dur = len(x)/sr
    f0 = f0_track(x, sr)
    frame = int(0.02*sr); e = np.array([np.sqrt(np.mean(x[i:i+frame]**2)) for i in range(0, len(x)-frame, frame)])
    silent = float(np.mean(e < 0.1*np.median(e[e>0]) + 1e-9)) if len(e) else 0
    res = {"file": sys.argv[1], "duration_s": round(dur,2),
           "f0_median_hz": round(float(np.median(f0)),1) if len(f0) else None,
           "f0_p10_p90_hz": [round(float(np.percentile(f0,10)),1), round(float(np.percentile(f0,90)),1)] if len(f0) else None,
           "pause_ratio": round(silent,3)}
    if len(sys.argv) > 2:
        w = json.load(open(sys.argv[2]))["words"]
        if w:
            speech = w[-1]["end"] - w[0]["start"]
            res["words"] = len(w); res["words_per_s"] = round(len(w)/max(0.1,speech),2)
    print(json.dumps(res, ensure_ascii=False))

if __name__ == "__main__": main()
