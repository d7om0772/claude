#!/usr/bin/env python3
"""
scene_build.py — يحوّل مسودة المشهد (scene_draft.json اللي يكتبها صانع الفيديو من جدول المشاهد) إلى scene.json نهائي:
  - يدمج الترجمة (captions.json) ويحسب المدة والختام من نهاية الصوت.
  - يحل التوقيتات المرجعية للكلمات: كل start/end/t ممكن يكون:
        رقم بالثواني            3.25
        "w12"                   بداية كلمة الكابشن رقم 12 (العد من 0 على كل كلمات الكابشن)
        "w12.end"               نهاية الكلمة 12
        {"find": "RTX", "nth": 1, "edge": "start"|"end", "shift": -0.1}   أول (أو nth) كلمة فيها النص
  - auto_sfx: true يضيف المؤثرات الافتراضية لكل عنصر (تقدر تضيف/تعدل يدوياً في "sfx").
  - يتحقق: كل حدث داخل [0, الختام]، و start < end، والعناصر معروفة للسلسلة.

  python3 -I studio/tools/scene_build.py --draft work/<ID>/scene_draft.json --captions work/<ID>/captions.json \
          --voice-report work/<ID>/voice_report.json --out work/<ID>/scene.json
"""
import argparse, json, os, re, sys

KNOWN = {  # عناصر كل حزمة (02_elements) + X01/X02 إضافات بنفس الأسلوب + T (حالة عنوان فقط)
    "budget-builds": {f"E{i:02d}" for i in range(1, 16)} | {"T"},
    "shortcuts": {f"E{i:02d}" for i in range(1, 18)} | {"X01", "T"},
    "troubleshooting": {f"E{i:02d}" for i in range(1, 18)} | {"X01", "T"},
    "tech-news": {f"E{i:02d}" for i in range(1, 17)} | {"X01"},
}
SERIES_DEFAULTS = {  # مدة الختام بعد آخر كلمة، ومدة ذوبان الحلقة (حسب الحزمة)
    "tech-news": {"closing": 1.25, "loop": 0.85},   # الختام (E14) منطوق؛ بعده وقفة + ذوبان 0.85ث (E15)
}
# المؤثرات الافتراضية حسب جدول "المؤثرات" في 04_design_style/design_style.md لكل حزمة.
# كل عنصر → [(المرجع، الإزاحة، الاسم، مدة القص اختيارية)]. المرجع: "start" أو اسم حقل وقت في params (drop_at, fix_at...).
AUTO = {
    "budget-builds": {
        "E01": [("start", 0.1, "gs_item_pickup4")], "E02": [("start", 0.0, "gs_selection12_fwd")], "E03": [("start", 0.0, "gs_swipe_grass2")],
        "E04": [("drop_at", 0.0, "gs_swipe2"), ("drop_at", 0.5, "gs_drop_item2"), ("drop_at", 0.55, "gs_lock")],
        "E05": [("start", 0.0, "gs_coins3")], "E06": [("start", 0.0, "gs_lock")],
        "E07": [("drop_at", 0.0, "gs_swipe2"), ("drop_at", 0.5, "gs_lock"), ("price_at", 0.0, "gs_coins3")],
        "E08": [("start", 0.0, "gs_swipe_grass2"), ("start", 0.4, "gs_selection12_fwd")], "E09": [("start", 0.0, "gs_swipe_grass2")],
        "E10": [("drop_at", 0.0, "gs_swipe2"), ("drop_at", 0.8, "gs_lock")], "E11": [("start", 0.0, "gs_swipe2"), ("start", 0.3, "gs_charging2")],
        "E12": [("start", 0.4, "gs_notification2")], "E13": [("start", 0.3, "gs_charging2"), ("start", 1.4, "gs_item_pickup4")],
    },
    "shortcuts": {
        "E01": [("start", 0.1, "gs_item_pickup4")], "E02": [("start", 0.0, "gs_watch_tick")], "E05": [("start", 0.0, "gs_swipe2")],
        "E06": [("start", 0.0, "gs_swipe_grass2")], "E07": [("start", 0.0, "gs_charging2")], "E08": [("start", 0.0, "gs_swipe2")],
        "E09": [("start", 0.45, "gs_select_option11"), ("start", 0.6, "gs_drop_item2")], "E10": [("start", 0.0, "gs_item_pickup4")],
        "E11": [("start", 0.0, "gs_selection9_fwd")], "E12": [("start", 0.2, "gs_select_option11"), ("start", 0.65, "gs_item_pickup4")],
        "E13": [("start", 0.55, "gs_swipe_grass5")], "E15": [("start", 0.0, "gs_notification2")], "E16": [("start", 0.0, "gs_item_pickup4")],
        "X01": [("start", 0.0, "gs_selection12_fwd")],
    },
    "troubleshooting": {
        "E01": [("start", 0.1, "gs_item_pickup4")], "E02": [("start", 0.0, "gs_error5")],
        "E03": [("start", 0.0, "gs_swipe_grass2"), ("fix_at", 0.0, "gs_selection12_fwd"), ("fix_at", 0.05, "gs_item_pickup4")],
        "E04": [("start", 0.0, "gs_swipe_grass2"), ("swap_at", 0.0, "gs_drop_item2"), ("swap_at", 0.6, "gs_lock")],
        "E05": [("start", 0.0, "gs_selection12_fwd")], "E06": [("at", 0.0, "gs_select_option11")],
        "E07": [("start", 0.0, "gs_item_pickup4"), ("start", 0.2, "gs_error5")], "E08": [("start", 0.0, "gs_swipe2"), ("plug_at", 0.6, "gs_lock")],
        "E09": [("start", 0.3, "gs_error5")], "E13": [("key_at", 0.15, "gs_selection12_fwd")], "E14": [("start", 0.3, "gs_swipe2"), ("start", 1.0, "gs_item_pickup4")],
        "E15": [("start", 0.0, "gs_item_pickup4")], "E16": [("start", 0.0, "gs_notification2")], "X01": [("start", 0.0, "gs_selection12_fwd")],
    },
}
KEY_TIME_FIELDS = ("key_times",)   # كل وقت ضغطة زر = نقرة كيبورد قصيرة

def tn_auto_sfx(evs, words=()):
    """مؤثرات حزمة 16_quick_explainer (جدول المؤثرات في 04_design_style): whoosh قبل كل قص بـ 0.15ث، tick مع الوميض،
    thud على الجسر وكلمة الـ CTA، pop للشارات والعوامل، drop للدبوس، bump للختم، shimmer للتوهج، rise للخطوط."""
    out = []; add = lambda t, n, **k: out.append({"t": round(t, 3), "name": n, **k}) if t is not None else None
    first = True
    for e in evs:
        p = e.get("params", {}); el = e["el"]; st = e["start"]
        if p.get("sfx") is False: continue
        cut = not first and el not in ("E03",)
        first = False if el != "E03" else first
        if el == "E01": continue
        if el == "E03": add(st, "gs_select_option11"); continue
        if el == "E04": add(st, "gs_punch_gut"); continue
        if el in ("E05", "E09", "E10", "E11", "E13") and cut: add(st - 0.15, "gs_swipe2")
        if el == "E02":
            add(st - 0.15, "gs_swipe2"); sa = p.get("stamp_at", st + 0.9); add(sa, "gs_bump1"); add(sa + 0.08, "gs_reflect2")
        elif el == "E05":
            for i, sl in enumerate(p.get("slots", [])): add(sl.get("at", st + 0.25 + 0.3 * i), "gs_item_pickup4")
        elif el in ("E06", "E07"):
            ent = p.get("enter", "pan"); dur = {"whip": 0.42, "pan": 0.55, "cut": 0.0}.get(ent, 0.6)
            add(st - 0.15, "gs_swipe_grass2" if ent == "pan" else "gs_swipe2")
            if el == "E06":
                add(st + dur - 0.02, "gs_dropping_item")
                for b in p.get("badges", []): add(b.get("at"), "gs_item_pickup4")
        if el in ("E06", "E08"):
            dt = p if el == "E08" else (p.get("details") or {})
            if dt: add(dt.get("papers_at"), "gs_swipe_grass5"); [add(x, "gs_selection9_fwd") for x in dt.get("cal_times", [])[1:]]
        if el == "E09":
            for f in p.get("factors", []): add((f.get("at") or 0) - 0.25, "gs_charging2"); add(f.get("at"), "gs_item_pickup4")
        if el == "E10": add(st + 0.15, "gs_item_pickup4"); add(st + 0.55, "gs_charging2")
        if el in ("E11", "X01"):
            if el == "X01" and cut: add(st - 0.15, "gs_swipe2")
            add(st + 0.05, "gs_reflect2"); add(st + 0.35, "gs_watch_tick")
            for b in p.get("badges", []) or ([{"at": p.get("badge_at")}] if p.get("badge") else []): add(b.get("at"), "gs_item_pickup4")
        if el == "E12":
            add(st - 0.15, "gs_swipe_grass2"); add(p.get("flip_at"), "gs_swipe_grass5")
            for b in p.get("badges", []): add(b.get("at"), "gs_item_pickup4")
        if el == "E13":
            wl = p.get("words") or ([p["word"]] if p.get("word") else [])
            if not p.get("word_times") and wl:   # وقت كل كلمة CTA من الترجمة (نفس منطق القالب)
                p["word_times"] = [next((w["start"] for w in words if w["start"] >= st and x in w["w"]), st + 0.5 + 0.5 * i) for i, x in enumerate(wl)]
            for wt in p.get("word_times", []) or [st + 0.5]: add(wt, "gs_punch_gut")
        if el == "E14": add(st - 0.05, "gs_swipe2"); add(st + 0.1, "gs_item_pickup4"); add(st + 0.35, "gs_reflect2")
    return [o for o in out if o["t"] >= 0]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--draft", required=True); ap.add_argument("--captions", required=True)
    ap.add_argument("--voice-report", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--tail", type=float, default=0.35, help="سكتة بعد آخر كلمة قبل الختام")
    ap.add_argument("--closing", type=float, default=2.6, help="مدة الختام")
    ap.add_argument("--loop", type=float, default=1.0,
                    help="الحلقة: آخر كم ثانية من الختام تذوب في الفريم الأول (آخر لقطة = أول لقطة). 0 = بدون")
    a = ap.parse_args()
    d = json.load(open(a.draft, encoding="utf-8"))
    caps = json.load(open(a.captions, encoding="utf-8"))
    vr = json.load(open(a.voice_report, encoding="utf-8"))
    words = [w for L in caps["lines"] for w in L["words"]]
    series = d["series"]
    errors = []

    def resolve(v, ctx=""):
        if isinstance(v, (int, float)): return float(v)
        if isinstance(v, str):
            m = re.fullmatch(r"w(\d+)(\.end)?", v.strip())
            if m:
                i = int(m.group(1))
                if i >= len(words): errors.append(f"{ctx}: word index {i} out of range ({len(words)})"); return 0.0
                return words[i]["end" if m.group(2) else "start"]
        if isinstance(v, dict) and "find" in v:
            hits = [w for w in words if v["find"] in w["w"]]
            nth = int(v.get("nth", 1))
            if len(hits) < nth: errors.append(f"{ctx}: '{v['find']}' not found (nth={nth})"); return 0.0
            w = hits[nth - 1]; return w["end" if v.get("edge") == "end" else "start"] + float(v.get("shift", 0))
        errors.append(f"{ctx}: bad time {v!r}"); return 0.0

    voice_end = max([w["end"] for w in words] + [float(vr.get("duration", 0)) - 0.25])
    voice_off = float(d.get("voice_offset", 0.0))
    sd = SERIES_DEFAULTS.get(series, {})
    if a.closing == 2.6 and "closing" in sd: a.closing = sd["closing"]
    if a.loop == 1.0 and "loop" in sd: a.loop = sd["loop"]
    closing = round(voice_off + voice_end + a.tail, 3)
    duration = round(closing + a.closing, 3)
    scene = {k: v for k, v in d.items() if k not in ("events", "sfx", "auto_sfx")}
    scene.update({"duration": duration, "fps": 30, "closing": {"start": closing}, "captions": {"lines": caps["lines"]}})
    loop = float(d.get("loop", {}).get("dur", a.loop)) if isinstance(d.get("loop"), dict) else a.loop
    loop = max(0.0, min(loop, max(0.85, a.closing - 0.35)))
    if loop > 0:
        scene["loop"] = {"start": round(duration - loop, 3), "dur": round(loop, 3)}
    else:
        scene.pop("loop", None)
    scene.setdefault("style", "interim")
    if "hook" in d:
        h = dict(d["hook"])
        if "title" in h:
            for k in ("desc_at", "price_at"):
                if k in h["title"] and not isinstance(h["title"][k], (int, float)): h["title"][k] = round(resolve(h["title"][k], f"hook.title.{k}"), 3)
        scene["hook"] = h
    evs = []
    raw = [dict(e) for e in d.get("events", [])]
    for i, e in enumerate(raw):
        e["start"] = round(resolve(e["start"], f"event#{i}({e.get('el')}).start") + float(e.pop("shift", 0)), 3)
    order = sorted(range(len(raw)), key=lambda k: raw[k]["start"])
    for pos, k in enumerate(order):   # end اختياري: لين بداية اللقطة الجاية (E03 = وميض 0.2ث)
        e = raw[k]
        if "end" not in e:
            if e.get("el") == "E03": e["end"] = e["start"] + 0.2
            else:
                nxt = next((raw[j]["start"] for j in order[pos + 1:] if raw[j].get("el") != "E03" and raw[j]["start"] > e["start"]), None)
                e["end"] = (nxt - 0.01) if nxt is not None else closing - 0.05
    def walk(o, ctx):   # أي مفتاح at / *_at = وقت، و times / *_times = قائمة أوقات (داخل params وأي مستوى تحته)
        if isinstance(o, dict):
            for kk, v in list(o.items()):
                if (kk == "at" or kk.endswith("_at")) and not isinstance(v, (int, float, bool)) and v is not None:
                    o[kk] = round(resolve(v, f"{ctx}.{kk}"), 3)
                elif (kk == "times" or kk.endswith("_times")) and isinstance(v, list):
                    o[kk] = [round(resolve(x, f"{ctx}.{kk}"), 3) for x in v]
                else: walk(v, f"{ctx}.{kk}")
        elif isinstance(o, list):
            for n, v in enumerate(o): walk(v, f"{ctx}[{n}]")
    for i, e in enumerate(raw):
        ctx = f"event#{i}({e.get('el')})"
        if e.get("el") not in KNOWN.get(series, set()): errors.append(f"{ctx}: unknown element for {series}")
        e["end"] = round(resolve(e["end"], ctx + ".end"), 3)
        p = e.get("params", {})
        if series == "tech-news": walk(p, ctx + ".params")
        for k in ("times", "key_times", "nav_times"):
            if k in p: p[k] = [round(resolve(x, f"{ctx}.params.{k}"), 3) for x in p[k]]
        for k in ("drop_at", "price_at", "desc_at", "fix_at", "swap_at", "plug_at", "key_at", "at", "keys_ok_at", "until", "show_at", "pick_at", "star_at", "revert_at", "ram_tag_until", "counter_at"):
            if k in p and not isinstance(p[k], (int, float)): p[k] = round(resolve(p[k], f"{ctx}.params.{k}"), 3)
        if "title" in p and isinstance(p["title"], dict):
            for k in ("price_at", "desc_at", "chip_fix_at", "keys_ok_at"):
                if k in p["title"] and not isinstance(p["title"][k], (int, float)): p["title"][k] = round(resolve(p["title"][k], f"{ctx}.title.{k}"), 3)
            if "key_times" in p["title"]: p["title"]["key_times"] = [round(resolve(x, f"{ctx}.title.key_times"), 3) for x in p["title"]["key_times"]]
        e["end"] = min(e["end"], closing - 0.05)
        if not (0 <= e["start"] < e["end"]): errors.append(f"{ctx}: start {e['start']} !< end {e['end']}")
        evs.append(e)
    scene["events"] = evs
    sfx = []
    evs.sort(key=lambda e: e["start"])
    if d.get("auto_sfx", True) and series == "tech-news":
        sfx += tn_auto_sfx(evs, words)
    elif d.get("auto_sfx", True):
        auto = AUTO.get(series, {})
        for e in evs:
            p = e.get("params", {})
            if p.get("sfx") is False: continue          # إلغاء المؤثر التلقائي لهذا العنصر
            for ref, off, name in auto.get(e["el"], []):
                # X01 بحالة مشكلة (شاشة سوداء/مطفية): مؤثر الخطأ بدل نغمة الحل
                if e["el"] == "X01" and (p.get("state") == "problem" or p.get("mode") in ("no_signal", "off")): name = "gs_error5"
                if isinstance(p.get("sfx"), str): name = p["sfx"]   # بديل للمؤثر التلقائي (مثل gs_swipe2 لتبديل شاشة محايد)
                base = e["start"] if ref == "start" else p.get(ref, (e["start"] + 0.35) if ref == "drop_at" else None)
                if base is None: continue
                sfx.append({"t": round(base + off, 3), "name": name})
            for k in KEY_TIME_FIELDS:
                for kt in p.get(k, []) + (p.get("title", {}).get(k, []) if isinstance(p.get("title"), dict) else []):
                    sfx.append({"t": kt, "name": "gs_soft_keyboard", "dur": 0.22})
            if series == "shortcuts" and e["el"] == "E03" and p.get("keys") and p.get("pulse", True):
                last = (p.get("key_times") or [e["start"] + 0.2 + 0.25 * (len(p["keys"]) - 1)])[-1]
                sfx.append({"t": round(last + 0.12, 3), "name": "gs_swipe2"})
        sfx.append({"t": round(closing - 0.3, 3), "name": "gs_swipe2"})
        sfx.append({"t": round(closing + 0.25, 3), "name": "gs_notification2"})
    for s in d.get("sfx", []):
        s = dict(s); s["t"] = round(resolve(s["t"], f"sfx {s.get('name')}"), 3); sfx.append(s)
    # منع تكدّس: نفس المؤثر خلال 0.12ث يتحذف
    sfx.sort(key=lambda s: s["t"]); clean = []
    for s in sfx:
        if clean and s["name"] == clean[-1]["name"] and s["t"] - clean[-1]["t"] < 0.12: continue
        if 0 <= s["t"] < duration: clean.append(s)
    scene["sfx"] = clean
    json.dump(scene, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps({"out": a.out, "duration": duration, "closing": closing, "events": len(evs), "sfx": len(clean), "errors": errors}, ensure_ascii=False))
    sys.exit(1 if errors else 0)

if __name__ == "__main__":
    main()
