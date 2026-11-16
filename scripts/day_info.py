#!/usr/bin/env python3
"""
day_info.py — يحسب التاريخ بتوقيت الرياض، ورقم اليوم من launch_date، والمرحلة، وعدد الفيديوهات ومواعيدها.
كل مهمة مجدولة تعتمد عليه بدل ما تحسب التواريخ بنفسها.

الاستخدام:
  python3 scripts/day_info.py            # ملخص لليوم وبكرة
  python3 scripts/day_info.py --json     # نفس الشي JSON
  python3 scripts/day_info.py --date 2026-12-01 --json   # ليوم محدد
"""
import json, os, sys, datetime
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config.json"), encoding="utf-8"))
TZ = ZoneInfo(CFG.get("timezone", "Asia/Riyadh"))

def phase_for(d: datetime.date):
    launch = datetime.date.fromisoformat(CFG["launch_date"])
    n = (d - launch).days + 1
    if n < 1:
        return {"date": d.isoformat(), "day_number": n, "phase": "pre-launch", "videos_per_day": 0, "slots": []}
    for ph in CFG["phases"]:
        if n >= ph["from_day"] and (ph.get("to_day") is None or n <= ph["to_day"]):
            times = list(ph["publish_times"])
            vpd = ph["videos_per_day"]
            times = times[:vpd]
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
