#!/usr/bin/env python3
"""build.py — captions.json → scene.json لتجربة "محاصيل القهوة" (الأسلوب بدون تشبيه).
   python3 -I studio/_trials/coffee-01/build.py --captions work/trial-coffee-01/captions.json --out work/trial-coffee-01/scene.json
كل قص وحدث ومؤثر مربوط برقم كلمة."""
import argparse, json
ap = argparse.ArgumentParser(); ap.add_argument("--captions", required=True); ap.add_argument("--out", required=True)
a = ap.parse_args()
W = [w for L in json.load(open(a.captions, encoding="utf-8"))["lines"] for w in L["words"]]
assert len(W) == 71, len(W)
s = lambda i: W[i]["start"]; e = lambda i: W[i]["end"]; mid = lambda i: round((e(i) + s(i + 1)) / 2, 3)
C = {
 "cut_answer": mid(3), "pin": s(6), "beans": s(10), "cut_bridge": mid(10), "cut_diag": mid(13),
 "hub": s(14), "slots": s(18), "t1": s(19), "t2": s(20), "t3": s(21),
 "alt": s(22), "rise": s(24), "slow": s(28), "complex": s(31),
 "cut_map": mid(31), "eth": s(32), "eth_c1": s(33), "eth_c2": s(37), "eth_c3": s(38),
 "yem": s(39), "yem_c1": s(40), "yem_c2": s(44), "yem_c3": s(48),
 "bra": s(49), "bra_c1": s(50), "bra_c2": s(54), "bra_c3": s(55),
 "cut_cta": mid(56), "cta_word": s(58), "cut_close": mid(60), "forty": s(65), "voice_end": e(70),
}
C["to_yem"] = round(C["yem"] - 0.12, 3); C["to_bra"] = round(C["bra"] - 0.2, 3)
C = {k: round(v, 3) for k, v in C.items()}
loop_start = round(C["voice_end"] + 0.10, 2); duration = round(loop_start + 1.0, 2)
chunks = [(4, 7, None), (8, 10, "cut_bridge"),
          (14, 18, None), (19, 21, None), (22, 25, None), (26, 28, None), (29, 31, "cut_map"),
          (32, 34, None), (35, 38, None), (39, 43, None), (44, 48, None), (49, 52, None), (53, 56, "cut_cta")]
caps = []
for k, (i0, i1, end) in enumerate(chunks):
    t1 = C[end] if end else s(chunks[k + 1][0]) - 0.02
    caps.append({"i0": i0, "i1": i1, "start": round(s(i0) - 0.03, 3), "end": round(t1, 3)})
F = lambda t, name, g=0: {"t": round(max(0, t), 3), "name": name, "gain_db": g}
sfx = [
 F(C["cut_answer"] - 0.14, "whoosh"), F(C["pin"], "gs_drop_item2", 1), F(C["pin"] + 0.05, "gs_charging2", -5),
 *[F(C["beans"] + k * 0.07, "tick", -3) for k in range(6)],
 F(C["cut_bridge"] - 0.20, "tick"), F(C["cut_bridge"] - 0.07, "tick"), F(C["cut_bridge"], "thud", -2),
 F(C["cut_diag"] - 0.12, "swoosh_up"), F(C["hub"], "pop"), F(C["slots"], "gs_selection12_fwd", -3),
 F(C["t1"], "pop"), F(C["t2"], "pop"), F(C["t3"], "pop"),
 F(C["alt"] - 0.1, "whoosh", -3), F(C["alt"] + 0.1, "pop"), F(C["rise"], "rise", -4), F(C["slow"], "gs_coins3", -4), F(C["complex"], "gs_charging2", -4),
 F(C["cut_map"] - 0.20, "tick"), F(C["cut_map"] - 0.07, "tick"),
 F(C["eth"] - 0.05, "whoosh", -3), F(C["eth"] + 0.35, "gs_drop_item2", -1), F(C["eth_c1"], "pop", -2), F(C["eth_c2"], "pop", -2), F(C["eth_c3"], "pop", -2),
 F(C["to_yem"], "gs_swipe_grass2", -2), F(C["yem"] + 0.35, "gs_drop_item2", -1), F(C["yem_c1"], "pop", -2), F(C["yem_c2"], "pop", -2), F(C["yem_c3"], "pop", -2),
 F(C["to_bra"], "gs_swipe2", 2), F(C["bra"] + 0.3, "gs_drop_item2", -1), F(C["bra_c1"], "pop", -2), F(C["bra_c2"], "pop", -2), F(C["bra_c3"], "pop", -2),
 F(C["cut_cta"] - 0.14, "whoosh"), F(C["cta_word"], "thud", 2),
 F(C["cut_close"] - 0.14, "gs_swipe2"), F(C["forty"], "ding", -3),
]
scene = {"id": "trial-coffee-01", "series": "_trials/coffee-01", "style": "explainer (بدون تشبيه) · قهوة", "fps": 30, "duration": duration,
         "words": [{"w": w["w"], "start": w["start"], "end": w["end"]} for w in W], "cues": C, "captions": caps,
         "sfx": sorted(sfx, key=lambda x: x["t"]), "loop": {"start": loop_start, "dur": 1.0}, "voice_offset": 0.0}
json.dump(scene, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"duration {duration}s · {len(caps)} caption chunks · {len(sfx)} sfx · loop @ {loop_start}")
print({k: C[k] for k in C if k.startswith(("cut_", "to_"))})
