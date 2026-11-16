#!/usr/bin/env python3
"""dashboard_export.py — يصدّر حالة النظام لملفات JSON تقراها لوحة تيربو.

الناتج (افتراضياً في work/dashboard/):
  calendar.json  صف لكل فيديو من content/calendar.md
  runs.json      سجل تشغيل المهام من schedules/runs.md
  tasks.json     المهام المجدولة ومواعيدها من schedules/README.md
كل ملف بالشكل {"rows": [...], "meta": [{"label", "value"}]}.
الرفع للوحة: schedules/dashboard.md
"""
import argparse, json, os, re, subprocess, sys
from datetime import datetime, timezone, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import cal  # noqa: E402

RIYADH = timezone(timedelta(hours=3))
SERIES_AR = {"budget-builds": "تجميعات", "shortcuts": "اختصارات", "troubleshooting": "المشاكل وحلولها",
             "tech-news": "أخبار", "comparisons": "مقارنات"}
TASKS = [  # المهمة، الاسم، الدقيقة، الساعة، أيام الأسبوع (0=الأحد، * = كل يوم)
    ("write", "الكتابة", 5, 20, "*"),
    ("produce", "الإنتاج", 35, 1, "*"),
    ("publish", "النشر", 5, 7, "*"),
    ("rescue", "الإنقاذ", 15, 12, "*"),
    ("analyze", "التحليل", 35, 7, "6"),
]


def git_head():
    try:
        return subprocess.check_output(["git", "-C", ROOT, "log", "-1", "--format=%h %cI"], text=True).strip()
    except Exception:
        return ""


def table_rows(path, ncols):
    out = []
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if not line.startswith("|") or set(line) <= set("|-: "):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) >= ncols:
            out.append(cells)
    return out[1:]  # بدون سطر العناوين


def last_note(notes):
    parts = [p.strip() for p in re.split(r"\s*؛\s*", notes or "") if p.strip()]
    s = parts[-1] if parts else ""
    return s[:160]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "work", "dashboard"))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    now = datetime.now(RIYADH).strftime("%Y-%m-%dT%H:%M%z")
    now = now[:-2] + ":" + now[-2:]
    head = git_head()
    meta_common = [{"label": "المستودع", "value": "d7om0772/claude (main)"},
                   {"label": "آخر commit", "value": head},
                   {"label": "وقت التصدير (الرياض)", "value": now},
                   {"label": "الأداة", "value": "scripts/dashboard_export.py"}]

    _, rows, _ = cal.load()
    cal_rows = []
    for r in rows:
        d = dict(zip(cal.COLS, r)) if isinstance(r, (list, tuple)) else dict(r)
        if not re.match(r"\d{4}-\d{2}-\d{2}$", d.get("date", "")):
            continue  # أفكار البنك بدون تاريخ
        cal_rows.append({
            "id": d.get("id", ""), "date": d.get("date", ""), "time": d.get("time", ""),
            "series": d.get("series", ""), "series_ar": SERIES_AR.get(d.get("series", ""), d.get("series", "")),
            "topic": d.get("topic", ""), "angle": d.get("angle", ""), "status": d.get("status", ""),
            "script": d.get("script", ""), "video": d.get("cloudinary", ""), "post": d.get("post", ""),
            "voice": d.get("voice", ""), "note": last_note(d.get("notes", "")),
        })
    cal_rows.sort(key=lambda x: (x["date"], x["time"]))

    runs = []
    def pct(v):
        m = re.search(r"(\d+(?:\.\d+)?)", v or "")
        return round(float(m.group(1))) if m else None
    for c in table_rows(os.path.join(ROOT, "schedules", "runs.md"), 3):
        runs.append({"time": c[0], "task": c[1], "summary": c[2][:300],
                     "usage_5h": pct(c[3]) if len(c) > 3 else None,
                     "usage_7d": pct(c[4]) if len(c) > 4 else None})

    trig = {}
    readme = open(os.path.join(ROOT, "schedules", "README.md"), encoding="utf-8").read()
    for m in re.finditer(r"^\|\s*(\w+)\s*\|\s*`(trig_[A-Za-z0-9]+)`", readme, re.M):
        trig[m.group(1)] = m.group(2)
    tasks = [{"task": t, "name": n, "minute": mi, "hour": h, "dow": dow, "trigger": trig.get(t, "")}
             for t, n, mi, h, dow in TASKS]

    for name, data, src in [("calendar.json", cal_rows, "content/calendar.md"),
                            ("runs.json", runs, "schedules/runs.md"),
                            ("tasks.json", tasks, "schedules/README.md")]:
        doc = {"rows": data, "meta": [{"label": "الملف", "value": src}] + meta_common}
        with open(os.path.join(a.out, name), "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=1)
        print(f"{name}: {len(data)} صف")


if __name__ == "__main__":
    main()
