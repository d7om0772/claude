#!/usr/bin/env python3
"""build.py — captions.json (+ words_final.json) → scene.json لتجربة "طرق معالجة القهوة" (التصميم: طباعة ريزو).
   python3 -I studio/_trials/coffee-02/build.py --captions work/trial-coffee-02/captions.json --words work/trial-coffee-02/words_final.json --out work/trial-coffee-02/scene.json"""
import argparse, json
ap = argparse.ArgumentParser(); ap.add_argument("--captions", required=True); ap.add_argument("--words", required=True); ap.add_argument("--out", required=True)
a = ap.parse_args()
W = [w for L in json.load(open(a.captions, encoding="utf-8"))["lines"] for w in L["words"]]
R = json.load(open(a.words, encoding="utf-8"))["words"]
assert len(W) == 70, len(W)
def raw(word, after=0.0):
    return next(x for x in R if x["start"] >= after and word in x["w"])["start"]
# تصحيح كلمات توقيتها متقدّر بالتناسب (Whisper سمعها بشكل ثاني)
W[41]["start"] = round(raw("الطبيعية", 18.3), 3)
W[59]["start"] = round(raw("مغصولة", 27.5), 3) if any("مغصولة" in x["w"] for x in R) else W[59]["start"]
s = lambda i: W[i]["start"]; e = lambda i: W[i]["end"]; mid = lambda i: round((e(i) + s(i + 1)) / 2, 3)
C = {
 "cut_answer": mid(2), "xray": s(6), "picked": s(10), "cut_bridge": mid(10), "cut_diag": mid(13),
 "beans": s(14), "fruit": s(16), "l_skin": s(18), "l_pulp": s(19), "l_muc": s(20),
 "zoom": s(22), "cycle": s(25), "dry": s(31), "cut_ex": mid(31),
 "wsh": s(32), "wsh_c1": s(35), "wsh_c2": s(38), "wsh_c3": s(40),
 "nat": s(41), "nat_c1": s(44), "nat_c2": s(46), "nat_c3": s(48),
 "hon": s(49), "hon_c1": s(53), "hon_c2": s(55), "hon_c3": s(57),
 "cut_cta": mid(57), "cta_a": s(59), "cta_or": s(60), "cta_b": s(61), "cut_close": mid(61), "six": s(68), "voice_end": e(69),
}
C["to_nat"] = round(C["nat"] - 0.08, 3); C["to_hon"] = round(C["hon"] - 0.2, 3)
C = {k: round(v, 3) for k, v in C.items()}
loop_start = round(C["voice_end"] + 0.10, 2); duration = round(loop_start + 1.0, 2)
chunks = [(3, 7, None), (8, 10, "cut_bridge"),
          (14, 16, None), (17, 21, None), (22, 25, None), (26, 29, None), (30, 31, "cut_ex"),
          (32, 36, None), (37, 40, None), (41, 44, None), (45, 48, None), (49, 53, None), (54, 57, "cut_cta")]
caps = []
for k, (i0, i1, end) in enumerate(chunks):
    t1 = C[end] if end else s(chunks[k + 1][0]) - 0.02
    caps.append({"i0": i0, "i1": i1, "start": round(s(i0) - 0.03, 3), "end": round(t1, 3)})
F = lambda t, name, g=0: {"t": round(max(0, t), 3), "name": name, "gain_db": g}
sfx = [
 F(C["cut_answer"] - 0.14, "whoosh"), F(C["xray"], "gs_charging2", -4), F(C["picked"], "snap", 1), F(C["picked"] + 0.2, "thud", -2),
 F(C["cut_bridge"] - 0.20, "tick"), F(C["cut_bridge"] - 0.07, "tick"), F(C["cut_bridge"], "thud", -2),
 F(C["cut_diag"] - 0.12, "swoosh_up"), F(C["beans"], "pop"), F(C["fruit"], "gs_selection12_fwd", -3),
 F(C["l_skin"], "pop"), F(C["l_pulp"], "pop"), F(C["l_muc"], "pop"),
 F(C["zoom"] - 0.1, "whoosh", -3), F(C["zoom"] + 0.1, "pop"), *[F(C["cycle"] + k * 0.32, "click", -3) for k in range(3)], F(C["dry"], "rise", -4),
 F(C["cut_ex"] - 0.20, "tick"), F(C["cut_ex"] - 0.07, "tick"), F(C["wsh"], "whoosh", -3),
 F(C["wsh_c1"], "pop", -2), F(C["wsh_c2"], "pop", -2), F(C["wsh_c3"], "pop", -2),
 F(C["to_nat"], "gs_swipe_grass2", -2), F(C["nat_c1"], "pop", -2), F(C["nat_c2"], "pop", -2), F(C["nat_c3"], "pop", -2),
 F(C["to_hon"], "gs_swipe2", 2), F(C["hon_c1"], "pop", -2), F(C["hon_c2"], "pop", -2), F(C["hon_c3"], "pop", -2),
 F(C["cut_cta"] - 0.14, "whoosh"), F(C["cta_a"], "thud", 2), F(C["cta_b"], "thud", 2),
 F(C["cut_close"] - 0.14, "gs_swipe2"), F(C["six"], "ding", -3),
]
scene = {"id": "trial-coffee-02", "series": "_trials/coffee-02", "style": "explainer v2 · riso print", "fps": 30, "duration": duration,
         "words": [{"w": w["w"], "start": w["start"], "end": w["end"]} for w in W], "cues": C, "captions": caps,
         "sfx": sorted(sfx, key=lambda x: x["t"]), "loop": {"start": loop_start, "dur": 1.0}, "voice_offset": 0.0}
json.dump(scene, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"duration {duration}s · {len(caps)} chunks · {len(sfx)} sfx · loop @ {loop_start}")
print({k: C[k] for k in C if k.startswith(("cut_", "to_")) or k in ("nat", "cta_a")})
