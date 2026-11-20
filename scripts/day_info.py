#!/usr/bin/env python3
"""
day_info.py — يحسب التاريخ بتوقيت الرياض، ورقم اليوم من launch_date، والمرحلة، وعدد الفيديوهات ومواعيدها.
كل مهمة مجدولة تعتمد عليه بدل ما تحسب التواريخ بنفسها.

الاستخدام:
  python3 scripts/day_info.py            # ملخص لليوم وبكرة
  python3 scripts/day_info.py --json     # نفس الشي JSON
  python3 scripts/day_info.py --date 2026-12-01 --json   # ليوم محدد
"""
import json, os, sys, datetime, random
from functools import lru_cache
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config.json"), encoding="utf-8"))
TZ = ZoneInfo(CFG.get("timezone", "Asia/Riyadh"))

POST = CFG.get("posting", {})
_hm = lambda m: f"{m // 60:02d}:{m % 60:02d}"
_mins = lambda hm: int(hm[:2]) * 60 + int(hm[3:5])

def _phase(d):
    launch = datetime.date.fromisoformat(CFG["launch_date"]); n = (d - launch).days + 1
    if n < 1: return n, None
    for ph in CFG["phases"]:
        if n >= ph["from_day"] and (ph.get("to_day") is None or n <= ph["to_day"]): return n, ph
    raise SystemExit("config.json phases do not cover day %d" % n)

@lru_cache(maxsize=None)
def slot_minutes(d):
    """أوقات فيديوهات اليوم بالدقائق. قبل posting.from: المواعيد الثابتة (publish_times).
    بعده: وقت عشوائي (ثابت لنفس التاريخ) داخل نافذة الذروة لكل فيديو، بدقيقة مو مدوّرة،
    ويبعد min_diff_adjacent_days_min عن نفس النافذة أمس (فبكرة بدوره يبعد عن اليوم)."""
    n, ph = _phase(d)
    if ph is None: return ()
    vpd = ph["videos_per_day"]
    if not POST or d < datetime.date.fromisoformat(POST.get("from", "9999-12-31")):
        return tuple(_mins(t) for t in ph["publish_times"][:vpd])
    wins = POST["by_count"].get(str(vpd)) or POST["by_count"][max(POST["by_count"], key=int)]
    prev = slot_minutes(d - datetime.timedelta(days=1))
    prev_by_win = {}
    pn, pph = _phase(d - datetime.timedelta(days=1))
    if pph is not None:
        pw = POST["by_count"].get(str(pph["videos_per_day"]), [])
        for i, m in enumerate(prev):
            prev_by_win[pw[i] if i < len(pw) else f"#{i}"] = m
    out = []
    for i, w in enumerate(wins):
        a, b = map(_mins, POST["windows"][w])
        for attempt in range(500):
            r = random.Random(f"{POST.get('seed', 'x')}:{d.isoformat()}:{w}:{attempt}")
            m = r.randint(a, b)
            if POST.get("avoid_round_minutes", True) and m % 5 == 0: continue
            if m in prev: continue                                             # ما يطابق أي موعد أمس
            if w in prev_by_win and abs(m - prev_by_win[w]) < POST.get("min_diff_adjacent_days_min", 7): continue
            if any(abs(m - o) < POST.get("min_gap_same_day_min", 60) for o in out): continue
            break
        out.append(m)
    return tuple(out)

def phase_for(d: datetime.date):
    launch = datetime.date.fromisoformat(CFG["launch_date"])
    n = (d - launch).days + 1
    if n < 1:
        return {"date": d.isoformat(), "day_number": n, "phase": "pre-launch", "videos_per_day": 0, "slots": []}
    for ph in CFG["phases"]:
        if n >= ph["from_day"] and (ph.get("to_day") is None or n <= ph["to_day"]):
            vpd = ph["videos_per_day"]
            times = [_hm(m) for m in slot_minutes(d)]
            slots = []
            for i, t in enumerate(times, 1):
                hh, mm = map(int, t.split(":"))
                dt = datetime.datetime(d.year, d.month, d.day, hh, mm, tzinfo=TZ)
                slots.append({"slot": f"{i:02d}", "time": t, "id": f"{d.isoformat()}-{i:02d}", "iso": dt.isoformat()})
            return {"date": d.isoformat(), "day_number": n, "phase": ph["name"], "videos_per_day": vpd, "slots": slots}
    raise SystemExit("config.json phases do not cover day %d" % n)

def main():
    as_json = "--json" in sys.argv
    now = datetime.datetime.now(TZ)
    if "--date" in sys.argv:
        today = datetime.date.fromisoformat(sys.argv[sys.argv.index("--date") + 1])
    else:
        today = now.date()
    tomorrow = today + datetime.timedelta(days=1)
    info = {
        "now_riyadh": now.isoformat(timespec="minutes"),
        "weekday": today.strftime("%A"),
        "is_saturday": today.weekday() == 5,
        "iso_week": "%d-W%02d" % today.isocalendar()[:2],
        "launch_date": CFG["launch_date"],
        "today": phase_for(today),
        "tomorrow": phase_for(tomorrow),
        "posting": {"policy": POST.get("policy", "fixed"), "from": POST.get("from"), "windows": POST.get("windows")},
        "phases": [{"name": ph["name"], "from": (datetime.date.fromisoformat(CFG["launch_date"]) + datetime.timedelta(days=ph["from_day"] - 1)).isoformat(),
                    "to": ((datetime.date.fromisoformat(CFG["launch_date"]) + datetime.timedelta(days=ph["to_day"] - 1)).isoformat() if ph.get("to_day") else None),
                    "videos_per_day": ph["videos_per_day"], "times": ph["publish_times"][:ph["videos_per_day"]]} for ph in CFG["phases"]],
    }
    if as_json:
        print(json.dumps(info, ensure_ascii=False, indent=1)); return
    t, tm = info["today"], info["tomorrow"]
    print(f"الآن (الرياض): {info['now_riyadh']}  [{info['weekday']}]  أسبوع {info['iso_week']}")
    print(f"launch_date: {info['launch_date']}")
    for ph in info["phases"]:
        print(f"  {ph['name']}: {ph['from']} → {ph['to'] or '…'} | {ph['videos_per_day']}/يوم {', '.join(ph['times'])}")
    for label, d in (("اليوم", t), ("بكرة", tm)):
        slots = ", ".join(f"{s['id']}@{s['time']}" for s in d["slots"]) or "—"
        print(f"{label} {d['date']}: يوم #{d['day_number']} | {d['phase']} | {d['videos_per_day']} فيديو | {slots}")

if __name__ == "__main__":
    main()
