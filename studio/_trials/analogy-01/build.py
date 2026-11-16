#!/usr/bin/env python3
"""build.py — يحوّل captions.json (توقيت كل كلمة) إلى scene.json للمشهد التجريبي "الشرح بالتشبيه".
   python3 -I studio/_trials/analogy-01/build.py --captions work/trial-analogy-01/captions.json --out work/trial-analogy-01/scene.json
كل قص وكل حدث بصري وكل مؤثر مربوط برقم كلمة (نفس قاعدة تيربو: كل ظهور مربوط بكلمته)."""
import argparse, json
ap = argparse.ArgumentParser(); ap.add_argument("--captions", required=True); ap.add_argument("--out", required=True)
a = ap.parse_args()
W = [w for L in json.load(open(a.captions, encoding="utf-8"))["lines"] for w in L["words"]]
assert len(W) == 89, len(W)
s = lambda i: W[i]["start"]; e = lambda i: W[i]["end"]; mid = lambda i: round((e(i) + s(i + 1)) / 2, 3)
C = {
 "cut_answer": mid(3), "glow": s(9), "cut_white": mid(9), "cut_story": s(13),
 "taps1": s(14), "whip": mid(14) - 0.14, "bucket_in": s(16), "puff": s(19), "x_stamp": s(20),
 "freeze": mid(20), "unfreeze": s(22) - 0.06, "valve": s(23), "pan": s(25), "flow": s(27), "ok_stamp": s(28),
 "cut_link": mid(28), "underline": s(30), "cut_diag": mid(31),
 "d_monitor": s(32), "d_mobo": s(33), "d_line1": s(34), "d_dead": s(37), "d_gpu": s(44), "d_line2": s(46), "d_ok": s(47),
 "cut_e1": mid(47), "e1_move": s(52), "e1_lock": s(53),
 "cut_e2": mid(53), "e2_pushA": s(55), "e2_pushB": s(57), "e2_panel": mid(57), "e2_look": s(61), "e2_dead": s(65),
 "cut_e3": s(66) - 0.04, "e3_row2": s(67), "e3_row3": s(68), "e3_menu": s(70), "e3_on": s(73), "e3_ok": s(76),
 "cut_cta": mid(76), "cta_word": s(78), "cta_line2": s(79), "cut_close": mid(81), "logo": s(83), "voice_end": e(88),
}
C = {k: round(v, 3) for k, v in C.items()}
loop_start = round(C["voice_end"] + 0.10, 2); duration = round(loop_start + 1.0, 2)
# مقاطع الكابشن في الشريط العلوي: (أول كلمة، آخر كلمة، ينتهي عند)
chunks = [(4, 6, None), (7, 9, "cut_white"),
          (13, 14, None), (15, 18, None), (19, 20, "freeze"), (22, 24, None), (25, 26, None), (27, 28, "cut_link"),
          (32, 34, None), (35, 37, None), (38, 41, None), (42, 45, None), (46, 47, "cut_e1"),
          (48, 49, None), (50, 53, "cut_e2"), (54, 57, None), (58, 62, None), (63, 65, "cut_e3"),
          (66, 68, None), (69, 71, None), (72, 76, "cut_cta")]
caps = []
for k, (i0, i1, end) in enumerate(chunks):
    t1 = C[end] if end else s(chunks[k + 1][0]) - 0.02
    caps.append({"i0": i0, "i1": i1, "start": round(s(i0) - 0.02, 3), "end": round(t1, 3)})
F = lambda t, name, g=0: {"t": round(max(0, t), 3), "name": name, "gain_db": g}
sfx = [
 F(C["cut_answer"] - 0.14, "whoosh"), F(C["glow"], "gs_charging2", -4),
 F(C["cut_white"] - 0.20, "tick"), F(C["cut_white"] - 0.07, "tick"),
 F(C["cut_story"] - 0.12, "swoosh_up"), F(C["taps1"], "pop"), F(C["taps1"] + 0.22, "pop"),
 F(C["whip"], "gs_swipe2", 2), F(C["bucket_in"] + 0.24, "gs_drop_item2", -2), F(C["x_stamp"], "thud", 3), F(C["x_stamp"] + 0.02, "error", -5),
 F(C["freeze"], "snap", 1), F(C["valve"], "click"), F(C["pan"], "whoosh"), F(C["pan"] + 0.62, "gs_drop_item2", -2),
 F(C["ok_stamp"], "thud", 1), F(C["ok_stamp"] + 0.04, "success", -3),
 F(C["cut_link"] - 0.20, "tick"), F(C["cut_link"] - 0.07, "tick"),
 F(C["d_mobo"], "pop"), F(C["d_line1"], "tick"), F(C["d_dead"], "error", -4), F(C["d_gpu"], "pop"), F(C["d_line2"], "gs_charging2", -3), F(C["d_ok"], "ding", -2),
 F(C["cut_e1"] - 0.10, "whoosh", -3), F(C["cut_e1"] + 0.10, "pop"), F(C["e1_move"], "gs_swipe_grass2", -2), F(C["e1_lock"], "gs_lock", 2), F(C["e1_lock"] + 0.12, "success", -4),
 F(C["cut_e2"] - 0.10, "whoosh", -3), F(C["cut_e2"] + 0.10, "pop"), F(C["e2_pushA"], "snap"), F(C["e2_pushB"], "snap"),
 F(C["e2_panel"], "swoosh_up", -2), F(C["e2_dead"], "error", -2),
 F(C["cut_e3"] - 0.10, "whoosh", -3), F(C["cut_e3"] + 0.10, "pop"), F(C["e3_row2"], "click"), F(C["e3_row3"], "gs_selection12_fwd", -2),
 F(C["e3_on"], "gs_charging2", -2), F(C["e3_ok"], "success", -2),
 F(C["cut_cta"] - 0.14, "whoosh"), F(C["cta_word"], "thud", 2),
 F(C["cut_close"] - 0.14, "gs_swipe2"), F(C["logo"], "pop"),
]
scene = {"id": "trial-analogy-01", "series": "_trials/analogy-01", "style": "analogy-explainer", "fps": 30, "duration": duration,
         "words": [{"w": w["w"], "start": w["start"], "end": w["end"]} for w in W], "cues": C, "captions": caps,
         "sfx": sorted(sfx, key=lambda x: x["t"]), "loop": {"start": loop_start, "dur": 1.0}, "voice_offset": 0.0}
json.dump(scene, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"duration {duration}s · {len(caps)} caption chunks · {len(sfx)} sfx · loop @ {loop_start}")
print({k: C[k] for k in ("cut_answer", "cut_white", "cut_story", "cut_link", "cut_diag", "cut_e1", "cut_e2", "cut_e3", "cut_cta", "cut_close")})
