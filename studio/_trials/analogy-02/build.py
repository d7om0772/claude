#!/usr/bin/env python3
"""build.py — captions.json (توقيت كل كلمة) → scene.json للتجربة الثانية "الشرح بالتشبيه" (Win + Shift + S، تشبيه قطّاعة البسكوت).
   python3 -I studio/_trials/analogy-02/build.py --captions work/trial-analogy-02/captions.json --words work/trial-analogy-02/words_final.json --out work/trial-analogy-02/scene.json
كل قص وحدث ومؤثر مربوط برقم كلمة. ضغطات الأزرار تاخذ توقيتها من تفريغ Whisper الخام (--words) لأن الكابشن يكتب Win وهو ينطق Windows."""
import argparse, json
ap = argparse.ArgumentParser(); ap.add_argument("--captions", required=True); ap.add_argument("--words", required=True); ap.add_argument("--out", required=True)
a = ap.parse_args()
W = [w for L in json.load(open(a.captions, encoding="utf-8"))["lines"] for w in L["words"]]
R = json.load(open(a.words, encoding="utf-8"))["words"]
assert len(W) == 93, len(W)
def raw(word, nth=1, after=0.0):
    """بداية كلمة من التفريغ الخام (أول ظهور رقم nth بعد وقت after)."""
    hits = [x for x in R if x["start"] >= after and word in x["w"]]
    return hits[nth - 1]["start"]
# تصحيح توقيت الأزرار (Whisper: "ويندوز وشفت واسمع" / "Ctrl و V" / "ويندوز وشفت و R")
k1 = raw("ويندوز", 1, after=17.0); k1s = raw("وشفت", 1, after=k1) + 0.10; k1x = raw("واسمع", 1, after=k1s) + 0.06
kc = raw("Ctrl", 1); kv = raw("V", 1, after=kc)
bon = raw("وبون", 1, after=kv); k2 = raw("ويندوز", 1, after=bon); k2s = raw("وشفت", 1, after=k2) + 0.10; k2r = raw("R", 1, after=k2s)
for i, t in ((32, k1), (34, k1s), (36, k1x), (69, kc), (71, kv), (72, bon), (73, k2), (75, k2s), (77, k2r)): W[i]["start"] = round(t, 3)
for i in (33, 35, 74, 76): W[i]["start"] = round((W[i - 1]["start"] + W[i + 1]["start"]) / 2, 3)   # علامة +
s = lambda i: W[i]["start"]; e = lambda i: W[i]["end"]; mid = lambda i: round((e(i) + s(i + 1)) / 2, 3)
C = {
 "cut_answer": mid(3), "cutter": s(6), "ants": s(8), "cut_bridge": mid(11), "cut_story": mid(14),
 "knifeA": s(15), "liftA": s(17), "xA": s(18), "whip": s(19) - 0.14, "knifeB": s(19) + 0.2, "xB": s(21),
 "freeze": mid(22), "unfreeze": s(24) - 0.06, "cutter_in": s(24), "press": s(25), "okB": s(26), "batch": s(27), "okBatch": s(29),
 "cut_link": mid(29), "kWin": k1, "kShift": k1s, "kS": k1x, "together": s(37),
 "cut_diag": mid(38), "toolbar": s(39) + 0.1, "dim": s(44), "choose": s(45), "t1": s(46), "t2": s(48), "t3": s(51), "t4": s(53),
 "cut_e1": mid(54), "drag": s(55), "drag_end": e(59), "lift": s(60), "fly": s(61), "clip_ok": s(63),
 "cut_e2": mid(63), "tab_chat": s(65), "tab_file": s(67), "kCtrl": kc, "kV": kv,
 "cut_e3": round(kv + 0.28, 3), "bonus": bon, "kWin2": k2, "kShift2": k2s, "kR": k2r, "rec": s(78),
 "cut_cta": mid(82), "cta_word": s(84), "cta_line2": s(85), "cut_close": mid(86), "logo": s(88), "voice_end": e(92),
}
C = {k: round(v, 3) for k, v in C.items()}
loop_start = round(C["voice_end"] + 0.10, 2); duration = round(loop_start + 1.0, 2)
chunks = [(4, 6, None), (7, 11, "cut_bridge"),
          (15, 16, None), (17, 18, None), (19, 19, None), (20, 22, "freeze"), (24, 26, None), (27, 29, "cut_link"),
          (39, 42, None), (43, 44, None), (45, 49, None), (50, 54, "cut_e1"),
          (55, 59, None), (60, 63, "cut_e2"), (64, 67, None), (68, 71, "cut_e3"), (72, 77, None), (78, 82, "cut_cta")]
caps = []
for k, (i0, i1, end) in enumerate(chunks):
    t1 = C[end] if end else s(chunks[k + 1][0]) - 0.02
    caps.append({"i0": i0, "i1": i1, "start": round(s(i0) - 0.03, 3), "end": round(t1, 3)})
F = lambda t, name, g=0: {"t": round(max(0, t), 3), "name": name, "gain_db": g}
sfx = [
 F(C["cut_answer"] - 0.14, "whoosh"), F(C["cutter"], "gs_lock", -2), F(C["ants"], "gs_charging2", -4),
 F(C["cut_bridge"] - 0.20, "tick"), F(C["cut_bridge"] - 0.07, "tick"),
 F(C["cut_story"] - 0.12, "swoosh_up"), F(C["knifeA"] + 0.05, "gs_swipe_grass2", -2), F(C["liftA"], "pop", -2), F(C["xA"], "thud", 2), F(C["xA"] + 0.02, "error", -5),
 F(C["whip"], "gs_swipe2", 2), F(C["knifeB"], "gs_swipe_grass5", -3), F(C["xB"], "thud", 2), F(C["xB"] + 0.02, "error", -5),
 F(C["freeze"], "snap", 1), F(C["cutter_in"] - 0.05, "whoosh", -4), F(C["press"], "thud", 3), F(C["press"] + 0.03, "gs_drop_item2", -1),
 F(C["okB"], "success", -3), F(C["batch"], "whoosh", -3),
 *[F(C["batch"] + 0.12 + k * 0.17, "pop", -4) for k in range(6)], F(C["okBatch"], "success", -2),
 F(C["cut_link"] - 0.20, "tick"), F(C["cut_link"] - 0.07, "tick"),
 F(C["kWin"], "click", 2), F(C["kShift"], "click", 2), F(C["kS"], "click", 2), F(C["together"], "gs_lock", 1), F(C["together"] + 0.05, "gs_charging2", -4),
 F(C["cut_diag"] - 0.1, "whoosh", -3), F(C["toolbar"], "swoosh_up", -2), F(C["dim"], "tick"),
 F(C["t1"], "gs_selection12_fwd", -2), F(C["t2"], "pop"), F(C["t3"], "pop"), F(C["t4"], "pop"),
 F(C["cut_e1"] - 0.10, "whoosh", -3), F(C["cut_e1"] + 0.10, "pop"), F(C["drag"] + 0.05, "gs_swipe_grass2", -4), F(C["drag_end"] - 0.05, "snap", 1),
 F(C["lift"], "pop", -2), F(C["fly"], "gs_swipe2", -4), F(C["fly"] + 0.42, "gs_item_pickup4", -1), F(C["clip_ok"], "success", -3),
 F(C["cut_e2"] - 0.10, "whoosh", -3), F(C["cut_e2"] + 0.10, "pop"), F(C["tab_file"], "click", -3),
 F(C["kCtrl"], "click", 2), F(C["kV"], "click", 2), F(C["kV"] + 0.08, "gs_drop_item2", -1), F(C["kV"] + 0.16, "success", -4),
 F(C["cut_e3"] - 0.06, "whoosh", -4), F(C["bonus"], "gs_coins3", -2),
 F(C["kWin2"], "click", 2), F(C["kShift2"], "click", 2), F(C["kR"], "click", 2), F(C["rec"], "ding", -3),
 F(C["cut_cta"] - 0.14, "whoosh"), F(C["cta_word"], "thud", 2),
 F(C["cut_close"] - 0.14, "gs_swipe2"), F(C["logo"], "pop"),
]
scene = {"id": "trial-analogy-02", "series": "_trials/analogy-02", "style": "analogy-explainer · design 2 (light paper)", "fps": 30, "duration": duration,
         "words": [{"w": w["w"], "start": w["start"], "end": w["end"]} for w in W], "cues": C, "captions": caps,
         "sfx": sorted(sfx, key=lambda x: x["t"]), "loop": {"start": loop_start, "dur": 1.0}, "voice_offset": 0.0}
json.dump(scene, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"duration {duration}s · {len(caps)} caption chunks · {len(sfx)} sfx · loop @ {loop_start}")
print({k: C[k] for k in C if k.startswith(("cut_", "k", "bonus"))})
