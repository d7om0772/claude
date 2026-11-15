#!/usr/bin/env python3
"""
generate_sfx.py — يولّد مكتبة المؤثرات الصوتية بالكود (numpy) → studio/sfx/*.wav + manifest.json.
كلها أصوات قصيرة بدون لحن (نغمة وحدة أو ضجيج مشكّل). مُنتجة داخلياً = بدون قيود رخصة (CC0).
الاستخدام: python3 -I studio/sfx/generate_sfx.py   (آمن للتكرار؛ نفس الناتج كل مرة لأن البذرة ثابتة)
"""
import json, os, wave
import numpy as np

SR = 48000
OUT = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(20261115)

def t_(d): return np.arange(int(SR * d)) / SR
def env(n, a=0.005, d=0.2, shape=4.0):
    t = np.arange(n) / SR
    att = np.clip(t / max(a, 1e-4), 0, 1)
    return att * np.exp(-shape * np.clip(t - a, 0, None) / max(d, 1e-4))
def lowpass(x, cutoff):
    """فلتر تمرير منخفض بمعامل متغير (cutoff مصفوفة أو رقم)."""
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.zeros_like(x); acc = 0.0
    for i in range(len(x)): acc += a[i] * (x[i] - acc); y[i] = acc
    return y
def highpass(x, cutoff): return x - lowpass(x, cutoff)
def sine_sweep(f0, f1, d):
    t = t_(d); f = np.geomspace(f0, f1, len(t)); return np.sin(2 * np.pi * np.cumsum(f) / SR)
def norm(x, peak_db=-3.0):
    p = np.max(np.abs(x)) or 1.0; return x / p * (10 ** (peak_db / 20))
def fade_out(x, ms=8):
    n = int(SR * ms / 1000); x[-n:] *= np.linspace(1, 0, n); return x

SFX = {}
def sfx(name, desc, use):
    def deco(fn): SFX[name] = (fn, desc, use); return fn
    return deco

@sfx("whoosh", "مرور هوائي ناعم (ضجيج بتردد صاعد ثم نازل)", "انتقال كاميرا، دخول بطاقة كبيرة")
def _():
    d = 0.5; n = int(SR * d); x = rng.standard_normal(n)
    cut = 300 + 3200 * np.sin(np.linspace(0, np.pi, n)) ** 2
    y = lowpass(x, cut) * np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return y
@sfx("swoosh_up", "مرور صاعد قصير", "ظهور الهوك/العنوان")
def _():
    d = 0.35; n = int(SR * d); x = rng.standard_normal(n)
    y = lowpass(x, np.geomspace(400, 6000, n)) * np.linspace(0, 1, n) ** 1.2 * np.exp(-np.linspace(0, 1, n) * 0.5)
    return fade_out(y, 30)
@sfx("pop", "فرقعة خفيفة (نغمة وحدة بتردد نازل)", "ظهور ملصق/شريحة/بطاقة صغيرة")
def _():
    d = 0.12; y = sine_sweep(900, 260, d) * env(int(SR * d), 0.002, 0.05, 3)
    return y + 0.15 * highpass(rng.standard_normal(len(y)), 2000) * env(len(y), 0.001, 0.01, 6)
@sfx("click", "نقرة زر كيبورد", "ضغط زر في سلسلة الاختصارات")
def _():
    d = 0.06; n = int(SR * d); x = highpass(rng.standard_normal(n), 1800) * env(n, 0.0008, 0.012, 5)
    tick = np.sin(2 * np.pi * 2400 * t_(d)) * env(n, 0.0005, 0.008, 6)
    return x + 0.5 * tick
@sfx("thud", "ارتطام خفيف منخفض", "نزول قطعة في الكيس")
def _():
    d = 0.35; n = int(SR * d); body = sine_sweep(110, 48, d) * env(n, 0.002, 0.12, 3.5)
    hit = lowpass(rng.standard_normal(n), 900) * env(n, 0.001, 0.03, 6)
    return body + 0.6 * hit
@sfx("snap", "تركيب/تثبيت (نقرتين سريعتين)", "قطعة تثبتت في مكانها، كيبل انشبك")
def _():
    d = 0.14; n = int(SR * d); y = np.zeros(n)
    for off in (0, int(SR * 0.045)):
        m = int(SR * 0.03); c = highpass(rng.standard_normal(m), 2500) * env(m, 0.0005, 0.006, 6)
        y[off:off + m] += c
    return y
@sfx("tick", "تكة عداد قصيرة جداً", "عداد السعر/الأرقام")
def _():
    d = 0.025; n = int(SR * d); return np.sin(2 * np.pi * 3200 * t_(d)) * env(n, 0.0005, 0.006, 6)
@sfx("ding", "نغمة وحدة صافية (بدون لحن)", "معلومة مهمة، رقم نهائي")
def _():
    d = 0.7; t = t_(d); y = (np.sin(2 * np.pi * 1320 * t) + 0.25 * np.sin(2 * np.pi * 2640 * t)) * env(len(t), 0.003, 0.25, 2.5)
    return y
@sfx("error", "طنين منخفض قصير", "حالة المشكلة (أحمر)")
def _():
    d = 0.32; t = t_(d); sq = np.sign(np.sin(2 * np.pi * 150 * t)) * 0.6 + np.sin(2 * np.pi * 150 * t) * 0.4
    y = lowpass(sq, 1200) * (0.75 + 0.25 * np.sin(2 * np.pi * 18 * t)) * env(len(t), 0.004, 0.2, 2.0)
    return fade_out(y, 20)
@sfx("success", "نغمة إيجابية وحدة ناعمة (بدون لحن)", "حالة الحل (أخضر)، علامة صح")
def _():
    d = 0.5; t = t_(d); f = 880 * (1 + 0.02 * np.minimum(t / 0.05, 1))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.004, 0.18, 2.2)
    return y + 0.2 * np.sin(2 * np.pi * 1760 * t) * env(len(t), 0.004, 0.08, 3)
@sfx("rise", "ضجيج صاعد قصير قبل الكشف", "قبل كشف رقم/نتيجة")
def _():
    d = 0.8; n = int(SR * d); x = rng.standard_normal(n)
    y = lowpass(x, np.geomspace(200, 5000, n)) * np.linspace(0, 1, n) ** 2
    return fade_out(y, 40)

def write(path, y):
    y = np.clip(y, -1, 1); pcm = (y * 32767).astype(np.int16)
    with wave.open(path, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

def main():
    manifest = {}
    for name, (fn, desc, use) in SFX.items():
        y = norm(np.asarray(fn(), dtype=float), -3.0)
        write(os.path.join(OUT, f"{name}.wav"), y)
        manifest[name] = {"file": f"studio/sfx/{name}.wav", "duration_s": round(len(y) / SR, 3), "peak_dbfs": -3.0,
                          "description": desc, "use": use, "source": "مولّد بالكود: studio/sfx/generate_sfx.py", "license": "CC0 (إنتاج داخلي — بدون حقوق لطرف ثالث)"}
    json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("✓", ", ".join(manifest))

if __name__ == "__main__":
    main()
