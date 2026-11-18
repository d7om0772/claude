#!/usr/bin/env python3
"""build_scene.py — يبني scene.json لقالب studio/metaphor من captions.json + voice_report.json (مثال EX-ping)."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
caps = json.load(open(os.path.join(HERE, "captions.json"), encoding="utf-8"))
vr = json.load(open(os.path.join(HERE, "voice_report.json"), encoding="utf-8"))
W = [w for L in caps["lines"] for w in L["words"]]
assert len(W) == 89, len(W)

# وقت ظهور كل كلمة = بداية النطق الفعلية من طاقة الصوت (Whisper أحياناً يلصق السكتة على بداية الكلمة)
import subprocess, numpy as np
SR = 16000
raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", os.path.join(HERE, "voice.wav"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
hop = SR // 100
env = np.array([np.sqrt(np.mean(x[i:i + 2 * hop] ** 2)) + 1e-9 for i in range(0, len(x) - 2 * hop, hop)])
db = 20 * np.log10(env); thr = db.max() - 36
rt, prev = [], -1
for w in W:
    f0, f1 = int(w["start"] * 100), max(int(w["start"] * 100) + 1, int(w["end"] * 100))
    on = w["start"]
    if f0 < len(db) and db[f0] < thr:
        for f in range(f0, min(f1, len(db) - 2)):
            if db[f] >= thr and db[f + 1] >= thr: on = f / 100; break
    on = max(on, prev + 0.04); rt.append(round(on, 3)); prev = on
S = lambda i: W[i]["start"]
R = lambda i: rt[i]
E_ = lambda i: W[i]["end"]

voice_end = E_(88)
D = round(voice_end + 0.45 + 0.85, 3)
loop = {"start": round(D - 0.85, 3), "dur": 0.85}

hero_start = round(S(3), 3)                    # البنق
gate_start = round(S(10), 3)                   # تخيّل
story_start = round(S(14), 3)                  # على الواي فاي
reveal_start = round(S(46), 3)                 # وكيبل
diag_start = round(S(50), 3)                   # خط مباشر
ex1, ex2, ex3 = round(S(55), 3), round(S(62), 3), round(S(71), 3)
cta_start = round(S(78) - 0.05, 3)             # اكتب
close_start = round(E_(82) - 0.02, 3)          # بعد «وايرلس»؟

A = {"x": 2952, "y": 1110, "stamp": [0.80, 0.42]}
B = {"x": 650, "y": 1070, "stamp": [0.24, 0.40]}
prev_pts = [(820, 355), (760, 330), (700, 330), (620, 350), (550, 365), (470, 355), (400, 330), (320, 305), (240, 295), (170, 268)]
k = 3840 / 1067
route = [[round(x * k), round(y * k)] for x, y in prev_pts]

story = {
    "start": story_start,
    "places": {"A": A, "B": B},
    "route": route,
    "seq": [
        {"t": story_start, "cam": "A"},
        {"t": round(E_(24) - 0.02, 3), "travel": ["A", "B"], "dur": 0.5},     # بعد «ضعيفة»
        {"t": round(S(40) - 0.06, 3), "travel": ["B", "A"], "dur": 0.48},     # «لا جدار»
        {"t": round(S(43) - 0.06, 3), "travel": ["A", "B"], "dur": 0.48},     # «ولا زحمة»
    ],
    "freeze": {"t": round(R(34), 3), "until": round(R(35) - 0.04, 3), "word": "صح؟"},
    "swaps": [{"place": "B", "t": round(R(38), 3)}, {"place": "A", "t": round(R(41), 3)}],
    "stamps": [
        {"place": "A", "kind": "x", "t": round(R(24), 3), "until": round(R(41), 3)},
        {"place": "A", "kind": "ok", "t": round(R(42), 3)},
        {"place": "B", "kind": "x", "t": round(R(30), 3), "until": round(R(38), 3)},
        {"place": "B", "kind": "ok", "t": round(R(45), 3)},
    ],
    "sparks": [{"place": "A", "t": round(R(42), 3)}, {"place": "B", "t": round(R(45), 3)}],
}

def seg(a, b, until, acc=()):
    return {"a": a, "b": b, "from": round(R(a) - 0.06, 3), "until": round(until, 3), "acc": list(acc)}

caps_segs = []
plan = [  # (a, b, acc, part_end)
    (3, 9, [3], gate_start),
    (14, 16, [16], None), (17, 21, [], None), (22, 24, [], None), (25, 28, [], None), (29, 30, [], None), (31, 33, [], R(34) - 0.02),
    (35, 39, [38], None), (40, 42, [], None), (43, 45, [], reveal_start - 0.1),
    (50, 54, [], None), (55, 57, [], None), (58, 61, [59], None), (62, 64, [], None), (65, 70, [], None), (71, 72, [], None), (73, 77, [75], cta_start - 0.08),
]
for n, (a, b, acc, pend) in enumerate(plan):
    nxt = plan[n + 1] if n + 1 < len(plan) else None
    until = pend if pend is not None else (R(nxt[0]) - 0.06 if nxt else cta_start)
    caps_segs.append(seg(a, b, until, acc))

mx = {
    "rt": rt,
    "hook": {"text": "نتك سريع… **وتقطّع؟**"},
    "hero": {"start": hero_start, "glow_at": round(R(6), 3), "ball": [0.75, 0.075]},
    "flashes": [round(gate_start - 0.2, 3), round(reveal_start - 0.2, 3)],
    "gate": {"start": gate_start, "w": [10, 13], "shrink_at": round(E_(13) - 0.24, 3), "end": story_start},
    "story": story,
    "reveal": {"start": reveal_start, "w": [46, 49], "acc": [47], "br": 47, "line_at": round(R(47), 3), "end": diag_start},
    "diagram": {"start": diag_start, "router": [540, 820], "router_label": "الراوتر",
                "devices": [{"icon": "laptop", "x": 215, "y": 600}, {"icon": "monitor", "x": 865, "y": 600}, {"icon": "phone", "x": 190, "y": 1090}, {"icon": "gamepad", "x": 890, "y": 1090}],
                "dev_times": [round(diag_start + 0.25 + 0.15 * i, 3) for i in range(4)],
                "pc": [540, 1250], "pc_label": "جهازك", "pc_at": round(R(53), 3), "cable": [round(R(53), 3), round(R(54) + 0.2, 3)],
                "router_at": round(diag_start + 0.08, 3), "walls": [960, 1050], "closer_dy": 50, "cable_label": "كيبل"},
    "ex1": {"start": ex1, "win_at": round(R(56), 3), "plug_at": round(R(58), 3), "graph_at": round(R(60), 3)},
    "ex2": {"start": ex2, "cut_at": round(R(63), 3), "closer_at": round(R(65), 3), "walls_at": round(R(68), 3)},
    "ex3": {"start": ex3, "win_at": round(ex3 + 0.2, 3), "five_at": round(R(75), 3), "less_at": round(R(76), 3)},
    "cta": {"start": cta_start, "w_top": [78, 79], "line_at": round(R(79) + 0.1, 3), "big": "«كيبل»", "big_at": round(R(80), 3), "w_bottom": [81, 82]},
    "close": {"start": close_start, "w1": [83, 85], "w2": [86, 88], "acc": [86], "glow_at": round(R(86), 3), "logo_at": round(R(84) + 0.15, 3)},
    "caps": caps_segs,
}

# المؤثرات (بدون موسيقى): whoosh للانتقالات، glitch للانعكاس، thud/ding للأختام، pops للعناصر، chime للـCTA
sfx = []
add = lambda t, n, **kw: sfx.append({"t": round(t, 3), "name": n, **kw})
add(hero_start - 0.15, "gs_swipe2"); add(mx["hero"]["glow_at"], "gs_charging2")
for f in mx["flashes"]: add(f, "gs_select_option11")
add(mx["gate"]["shrink_at"], "swoosh_up"); add(story_start - 0.12, "gs_swipe_grass2")
for x in story["seq"][1:]: add(x["t"] - 0.05, "gs_swipe2")
for s in story["stamps"]: add(s["t"], "thud" if s["kind"] == "x" else "gs_selection12_fwd")
add(story["freeze"]["t"], "thud"); add(story["swaps"][0]["t"], "gs_charging2")
add(mx["reveal"]["line_at"], "gs_charging2"); add(diag_start - 0.12, "gs_swipe2")
add(mx["diagram"]["router_at"], "gs_item_pickup4")
for t in mx["diagram"]["dev_times"]: add(t, "pop")
add(mx["diagram"]["pc_at"], "gs_item_pickup4"); add(mx["diagram"]["cable"][0], "gs_charging2")
add(ex1 - 0.1, "gs_swipe_grass2"); add(mx["ex1"]["win_at"], "gs_item_pickup4"); add(mx["ex1"]["plug_at"] + 0.3, "gs_lock"); add(mx["ex1"]["graph_at"], "gs_charging2")
add(ex2 - 0.08, "gs_swipe2"); add(mx["ex2"]["cut_at"] + 0.12, "thud"); add(mx["ex2"]["closer_at"], "gs_swipe_grass5"); add(mx["ex2"]["walls_at"], "whoosh")
add(ex3 - 0.08, "gs_swipe_grass2"); add(mx["ex3"]["win_at"], "gs_item_pickup4"); add(mx["ex3"]["five_at"] + 0.1, "gs_selection12_fwd")
add(cta_start - 0.12, "gs_notification2"); add(cta_start - 0.06, "click"); add(mx["cta"]["big_at"], "thud")
add(close_start - 0.05, "gs_swipe2"); add(mx["close"]["logo_at"], "gs_item_pickup4")
sfx.sort(key=lambda s: s["t"])

scene = {
    "id": "EX-ping", "series": "metaphor", "style": "video-style-system (الاستعارة الشارحة)", "fps": 30,
    "duration": D, "loop": loop, "closing": {"start": round(voice_end + 0.2, 3)},
    "captions": {"lines": caps["lines"]},
    "assets": {k: f"../../work/EX-ping/assets/{v}" for k, v in
               {"hero": "hero.png", "canvas": "canvas.jpg", "cardA": "cardA.jpg", "cardA_fix": "cardA_fix.jpg", "cardB": "cardB.jpg", "cardB_fix": "cardB_fix.jpg", "logo": "logo_crop.png"}.items()},
    "mx": mx, "sfx": sfx,
}
json.dump(scene, open(os.path.join(HERE, "scene.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps({"duration": D, "sfx": len(sfx), "parts": {"hero": hero_start, "gate": gate_start, "story": story_start, "reveal": reveal_start,
      "diagram": diag_start, "ex1": ex1, "ex2": ex2, "ex3": ex3, "cta": cta_start, "close": close_start}}, ensure_ascii=False))
