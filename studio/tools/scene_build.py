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

KNOWN = {
    "budget-builds": {"E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08"},
    "shortcuts": {"E01", "E02", "E03", "E04", "E05", "E06"},
    "troubleshooting": {"E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08"},
}
# مؤثرات افتراضية: (عنصر → [(إزاحة من البداية، اسم)])
AUTO = {
    "budget-builds": {"E01": [(0.55, "thud")], "E03": [(0.0, "pop")], "E04": [(0.0, "pop")], "E05": [(0.0, "whoosh")], "E07": [(0.0, "swoosh_up")]},
    "shortcuts": {"E04": [(0.0, "swoosh_up")], "E05": [(0.0, "pop")], "E06": [(0.0, "pop")], "E03": [(0.0, "whoosh")]},
    "troubleshooting": {"E01": [(0.0, "error")], "E02": [(0.0, "success")], "E04": [(0.0, "pop")], "E05": [(0.0, "pop")], "E07": [(0.0, "swoosh_up")], "E08": [(0.0, "pop")], "E03": [(0.0, "whoosh")]},
}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--draft", required=True); ap.add_argument("--captions", required=True)
    ap.add_argument("--voice-report", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--tail", type=float, default=0.35, help="سكتة بعد آخر كلمة قبل الختام")
    ap.add_argument("--closing", type=float, default=2.6, help="مدة الختام")
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
    closing = round(voice_off + voice_end + a.tail, 3)
    duration = round(closing + a.closing, 3)
    scene = {k: v for k, v in d.items() if k not in ("events", "sfx", "auto_sfx")}
    scene.update({"duration": duration, "fps": 30, "closing": {"start": closing}, "captions": {"lines": caps["lines"]}})
    scene.setdefault("style", "interim")
    if "hook" in d:
        h = dict(d["hook"]); h["start"] = resolve(h.get("start", 0), "hook.start"); h["end"] = resolve(h.get("end", 2.6), "hook.end"); scene["hook"] = h
    evs = []
    for i, e in enumerate(d.get("events", [])):
        e = dict(e); ctx = f"event#{i}({e.get('el')})"
        if e.get("el") not in KNOWN.get(series, set()): errors.append(f"{ctx}: unknown element for {series}")
        e["start"] = round(resolve(e["start"], ctx + ".start") + float(e.pop("shift", 0)), 3)
        e["end"] = round(resolve(e["end"], ctx + ".end"), 3)
        p = e.get("params", {})
        for k in ("times",):
            if k in p: p[k] = [round(resolve(x, f"{ctx}.params.{k}"), 3) for x in p[k]]
        e["end"] = min(e["end"], closing - 0.05)
        if not (0 <= e["start"] < e["end"]): errors.append(f"{ctx}: start {e['start']} !< end {e['end']}")
        evs.append(e)
    scene["events"] = evs
    sfx = []
    if d.get("auto_sfx", True):
        auto = AUTO.get(series, {})
        sfx.append({"t": scene.get("hook", {}).get("start", 0.0), "name": "swoosh_up"})
        for e in evs:
            for off, name in auto.get(e["el"], []): sfx.append({"t": round(e["start"] + off, 3), "name": name})
            if series == "shortcuts" and e["el"] == "E01":
                for t in e["params"].get("times", []): sfx.append({"t": t, "name": "click"})
        sfx.append({"t": closing + 0.1, "name": "ding"})
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
