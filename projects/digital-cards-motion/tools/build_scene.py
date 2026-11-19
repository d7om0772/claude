#!/usr/bin/env python3
"""
build_scene.py — يبني work/scene.json من captions.json: المدة، أسطر الترجمة، وجدول المؤثرات (مربوط بالكلمات).
  python3 -I tools/build_scene.py --captions work/captions.json --out work/scene.json
المؤثرات من studio/sfx (مولّدة بالكود أو CC0/CC BY) — بدون أي موسيقى أو لحن.
"""
import argparse, json, re

ap = argparse.ArgumentParser()
ap.add_argument("--captions", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--tail", type=float, default=3.3)
a = ap.parse_args()

cap = json.load(open(a.captions, encoding="utf-8"))
words = [w for ln in cap["lines"] for w in ln["words"]]
norm = lambda s: re.sub(r"[أإآ]", "ا", re.sub(r"[ً-ْـ،؟?!.,:…]", "", s))


def W(txt, nth=1, edge="start"):
    k = 0
    for w in words:
        if norm(w["w"]) == norm(txt):
            k += 1
            if k == nth:
                return w[edge]
    raise SystemExit(f"word not found: {txt}")


T = dict(s1=W("أولاً"), most=W("أغلب"), acct=W("حسابك"), saudi=W("سعودية"), s2=W("ثانياً"), code=W("الكود"), cash=W("الكاش"),
         photo=W("تصوّره"), send=W("ترسله"), anyone=W("أي", 2), uses=W("يستخدمه"), before=W("قبلك"), s3=W("ثالثاً"),
         charge=W("اشحن"), app=W("التطبيق"), official=W("الرسمي"), notFrom=W("مو"), msg=W("برسالة"), out=W("اختر"))
three, things = W("هالثلاث"), W("أشياء")

sfx = [
    (0.05, "swoosh_up", 0), (three - 0.05, "pop", -2), (three + 0.3, "pop", -2), (things, "pop", -2),
    (T["s1"] - 0.3, "whoosh", 0), (T["most"], "pop", -2), (T["most"] + 0.15, "pop", -2), (T["acct"] + 0.05, "pop", -2),
    (T["saudi"], "success", 0), (T["saudi"] + 0.25, "error", -2),
    (T["s2"] - 0.3, "whoosh", 0), (T["code"] + 0.15, "swoosh_up", -3), (T["cash"] - 0.1, "gs_coins3", -2),
    (T["photo"], "pop", -2), (T["send"], "pop", -2), (T["anyone"], "snap", -2),
    *[(T["uses"] + i * 0.1, "tick", -4) for i in range(6)], (T["before"], "thud", 0),
    (T["s3"] - 0.3, "whoosh", 0), (T["official"], "success", 0), (T["notFrom"], "whoosh", -3), (T["msg"], "error", -1), (T["msg"], "thud", -2),
    (T["out"] - 0.3, "whoosh", 0), (T["out"] + 0.9, "pop", -2), (T["out"] + 1.5, "pop", -2), (T["out"] + 2.25, "success", 0),
]
# نقرات الكتابة: تتوزع على مدة كتابة الكود (نفس معادلة scene.js)
t0, dur, n = T["charge"] + 0.15, max(0.6, T["app"] - T["charge"] - 0.2), 14
sfx += [(t0 + dur * (i / n), "click", -3) for i in range(1, n + 1, 2)]

scene = {"duration": round(cap["lines"][-1]["end"] + a.tail, 2), "voice_offset": 0.0, "lines": cap["lines"],
         "sfx": sorted([{"t": round(t, 3), "name": nm, "gain_db": g} for t, nm, g in sfx], key=lambda c: c["t"]),
         "times": {k: round(v, 3) for k, v in T.items()}}
json.dump(scene, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"duration {scene['duration']}s · {len(scene['sfx'])} sfx")
