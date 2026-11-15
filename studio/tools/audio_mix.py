#!/usr/bin/env python3
"""
audio_mix.py — يمكس التعليق الصوتي + المؤثرات حسب scene.json، مع ducking، ويطبّع على −14 LUFS.

  python3 -I studio/tools/audio_mix.py --voice work/<ID>/voice.wav --scene work/<ID>/scene.json --out work/<ID>/mix.wav

scene.json → "sfx": [{"t": 3.2, "name": "thud", "gain_db": 0}, ...]   (name من studio/sfx/manifest.json)
             "voice_offset": 0.0   (اختياري: متى يبدأ الصوت)
القواعد (من الحزم/البرومبت): لا موسيقى إطلاقاً. المؤثرات أخفض من الكلام بـ 10dB على الأقل (نستهدف 12dB)،
وتنخفض أكثر (ducking ~6dB) وقت الكلام. الناتج: WAV ستيريو 48kHz بمستوى −14 LUFS و true peak ≤ −1.5 dBTP.
يطبع تقرير JSON ويكتبه في <out>.report.json. كود الخروج 1 لو الناتج خارج −14±1 LUFS.
"""
import argparse, json, os, re, subprocess, sys
import numpy as np

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SFX_DIR = os.path.join(ROOT, "studio", "sfx")
SFX_BELOW_DB = 12.0   # هدفنا 12 (الحد الأدنى المطلوب 10؛ الحزم: بين −12 و −24)
# لو مؤثر الحزمة (Openverse) ما انتزّل: بديل مولّد بالكود بنفس الدور
FALLBACK = {"gs_swipe2": "swoosh_up", "gs_swipe_grass2": "whoosh", "gs_swipe_grass5": "whoosh", "gs_lock": "snap", "gs_drop_item2": "thud",
            "gs_coins3": "tick", "gs_charging2": "rise", "gs_item_pickup4": "pop", "gs_selection12_fwd": "ding", "gs_selection9_fwd": "ding",
            "gs_notification2": "ding", "gs_soft_keyboard": "click", "gs_select_option11": "click", "gs_watch_tick": "tick", "gs_error5": "error"}
DUCK_DB = 4.0   # الحزم: المؤثرات تنخفض 35–40% تحت الكلام (≈ −4dB)

def load(path):
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)

def lufs(path):
    p = subprocess.run(["ffmpeg", "-nostdin", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    I = re.findall(r"I:\s+(-?[\d.]+) LUFS", p.stderr); TP = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", p.stderr)
    return (float(I[-1]) if I else None), (float(TP[-1]) if TP else None)

def peak_window_db(x, win=0.05):
    n = int(SR * win)
    if len(x) < n: return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
    c = np.cumsum(np.concatenate([[0], x ** 2]))
    rms = np.sqrt((c[n:] - c[:-n]) / n)
    return 20 * np.log10(rms.max() + 1e-9)

def envelope(x, win=0.08):
    n = int(SR * win); k = np.ones(n) / n
    return np.sqrt(np.convolve(x ** 2, k, mode="same"))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", required=True); ap.add_argument("--scene", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--lufs", type=float, default=-14.0)
    a = ap.parse_args()
    scene = json.load(open(a.scene, encoding="utf-8"))
    manifest = json.load(open(os.path.join(SFX_DIR, "manifest.json"), encoding="utf-8"))
    dur = float(scene["duration"]); n = int(dur * SR)
    voice = load(a.voice); off = int(float(scene.get("voice_offset", 0.0)) * SR)
    v = np.zeros(n); seg = voice[: max(0, n - off)]; v[off: off + len(seg)] = seg
    Lv, _ = lufs(a.voice)
    if Lv is None or Lv < -60: raise SystemExit("voice loudness unreadable")
    # ducking: خفض المؤثرات وقت الكلام
    env = envelope(v); thr = np.percentile(env[env > 1e-4], 30) if np.any(env > 1e-4) else 1.0
    duck = 10 ** (-DUCK_DB * np.clip(env / thr, 0, 1) / 20)
    fx = np.zeros(n); used = []
    for cue in scene.get("sfx", []):
        name = cue.get("name") or cue.get("file")
        if (name not in manifest or not os.path.exists(os.path.join(ROOT, manifest[name]["file"]))) and name in FALLBACK: name = FALLBACK[name]
        if name not in manifest: print(f"⚠ unknown sfx {name}", file=sys.stderr); continue
        x = load(os.path.join(ROOT, manifest[name]["file"]))
        if cue.get("dur"): n_keep = int(float(cue["dur"]) * SR); x = x[:n_keep] * np.concatenate([np.ones(max(0, n_keep - 480)), np.linspace(1, 0, min(480, n_keep))])[:len(x[:n_keep])]
        lvl = peak_window_db(x)
        target = Lv - SFX_BELOW_DB + min(0.0, float(cue.get("gain_db", 0)))  # gain_db يقدر ينزّل بس، ما يرفع فوق الحد
        g = 10 ** ((target - lvl) / 20)
        i = int(float(cue["t"]) * SR)
        if i >= n: continue
        m = min(len(x), n - i); fx[i:i + m] += x[:m] * g
        used.append({"t": cue["t"], "name": name, "level_vs_voice_db": round(target - Lv, 1), "license": manifest[name].get("license"), "attribution": manifest[name].get("attribution")})
    mix = v + fx * duck
    tmp = a.out + ".pre.wav"
    pcm = np.clip(mix, -1, 1)
    import wave
    with wave.open(tmp, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((pcm * 32767).astype(np.int16).tobytes())
    # loudnorm بمرحلتين (قياس ثم تطبيق خطي)
    p = subprocess.run(["ffmpeg", "-nostdin", "-i", tmp, "-af", f"loudnorm=I={a.lufs}:TP=-2:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    meas = json.loads(p.stderr[p.stderr.rindex("{"): p.stderr.rindex("}") + 1])
    af = (f"loudnorm=I={a.lufs}:TP=-2:LRA=11:measured_I={meas['input_i']}:measured_TP={meas['input_tp']}:"
          f"measured_LRA={meas['input_lra']}:measured_thresh={meas['input_thresh']}:offset={meas['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", tmp, "-af", af + ",aresample=48000", "-ac", "2", "-ar", "48000",
                    "-c:a", "pcm_s16le", a.out], check=True)
    os.remove(tmp)
    I, TP = lufs(a.out)
    # تصحيح نهائي: loudnorm أحياناً يقصر في المقاطع القصيرة — كسب ثابت بدون ما نتجاوز True Peak −2 dBTP
    if I is not None and TP is not None and abs(I - a.lufs) > 0.3:
        gain = min(a.lufs - I, -2.0 - TP)
        if abs(gain) > 0.05:
            fixed = a.out + ".fix.wav"
            subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", a.out, "-af", f"volume={gain:.2f}dB", "-c:a", "pcm_s16le", fixed], check=True)
            os.replace(fixed, a.out); I, TP = lufs(a.out)
    rep = {"out": a.out, "duration": dur, "voice_lufs_raw": Lv, "final_lufs": I, "final_true_peak_dbfs": TP,
           "sfx_count": len(used), "sfx_below_voice_db": SFX_BELOW_DB, "ducking_db": DUCK_DB, "sfx": used, "music": "none"}
    json.dump(rep, open(a.out + ".report.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in rep.items() if k != "sfx"}, ensure_ascii=False))
    sys.exit(0 if I is not None and abs(I - a.lufs) <= 1.0 else 1)

if __name__ == "__main__":
    main()
