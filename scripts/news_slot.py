#!/usr/bin/env python3
"""news_slot.py — يختار موعد نشر خبر اليوم (سلسلة tech-news، خارج عدد الفيديوهات اليومية).

القاعدة (config.json → series.news): أقرب وقت بعد الحين بـ lead دقيقة (مقرّب لـ 5 دقايق) داخل publish_window،
وبعيد min_gap_minutes عن مواعيد فيديوهات اليوم الثابتة (day_info) وعن أي منشور ثاني مسجّل في التقويم لنفس اليوم.

  python3 scripts/news_slot.py              → {"date", "time", "iso", "id"}  أو {"time": null, "reason": ...}
  python3 scripts/news_slot.py --lead 20
"""
import argparse, datetime, json, os, subprocess, sys
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import cal  # noqa: E402

CFG = json.load(open(os.path.join(ROOT, "config.json"), encoding="utf-8"))
TZ = ZoneInfo(CFG.get("timezone", "Asia/Riyadh"))


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--lead", type=int, default=20); ap.add_argument("--date")
    a = ap.parse_args()
    n = CFG["series"]["news"]
    now = datetime.datetime.now(TZ)
    day = datetime.date.fromisoformat(a.date) if a.date else now.date()
    info = json.loads(subprocess.check_output([sys.executable, os.path.join(ROOT, "scripts", "day_info.py"), "--date", day.isoformat(), "--json"]))
    busy = [s["time"] for s in info["today"]["slots"]]
    _, rows, _ = cal.load()
    busy += [r["time"] for r in rows if r["date"] == day.isoformat() and r["time"] and r["status"] not in ("ملغي", "مستبدل")]
    to_dt = lambda hm: datetime.datetime.combine(day, datetime.time(*map(int, hm.split(":"))), TZ)
    busy_dt = sorted({to_dt(b) for b in busy})
    w0, w1 = to_dt(n["publish_window"][0]), to_dt(n["publish_window"][1])
    t = max(w0, now + datetime.timedelta(minutes=a.lead)) if day == now.date() else w0
    t = t.replace(second=0, microsecond=0); t += datetime.timedelta(minutes=(-t.minute) % 5)
    gap = datetime.timedelta(minutes=n["min_gap_minutes"])
    while t <= w1:
        clash = next((b for b in busy_dt if abs(t - b) < gap), None)
        if not clash:
            n_today = sum(1 for r in rows if r["date"] == day.isoformat() and r["series"] == "tech-news")
            print(json.dumps({"date": day.isoformat(), "time": t.strftime("%H:%M"), "iso": t.isoformat(), "id": f"{day.isoformat()}-N{n_today + 1}",
                              "busy": [b.strftime("%H:%M") for b in busy_dt]}, ensure_ascii=False)); return
        t = clash + gap
        t += datetime.timedelta(minutes=(-t.minute) % 5)
    print(json.dumps({"date": day.isoformat(), "time": None, "reason": "ما فيه وقت متاح اليوم داخل نافذة النشر", "busy": [b.strftime("%H:%M") for b in busy_dt]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
