#!/usr/bin/env python3
"""build_status_page.py — يبني صفحة "متابعة تيربو" (HTML واحد، البيانات داخله) من ملفات المستودع.

صفحة خفيفة تفتح على الجوال (حتى الأجهزة اللي ما تشغّل لوحة Data). تنبني من نفس ملفات
scripts/dashboard_export.py، والمشغّل يعيد نشرها في نهاية كل مهمة (schedules/dashboard.md).

  python3 -I scripts/build_status_page.py            → work/dashboard/status.html
"""
import argparse, json, os, subprocess, sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DAYS = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
BOARD_URL = "https://claude.ai/artifact/8iyutVvJT3xEYyjPpkAyje"


def label(d):
    try:
        y, m, dd = map(int, d.split("-"))
        x = date(y, m, dd)
        return f"{DAYS[x.weekday()]} {dd} {MONTHS[m - 1]}"
    except Exception:
        return d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=os.path.join(ROOT, "work", "dashboard"))
    a = ap.parse_args()
    subprocess.run([sys.executable, "-I", os.path.join(ROOT, "scripts", "dashboard_export.py"), "--out", a.dir],
                   check=True, stdout=subprocess.DEVNULL)
    load = lambda n: json.load(open(os.path.join(a.dir, n), encoding="utf-8"))
    cal, runs, tasks = load("calendar.json"), load("runs.json"), load("tasks.json")
    meta = {m["label"]: m["value"] for m in cal["meta"]}
    for r in cal["rows"]:
        r["date_ar"] = label(r["date"])
    ideas = load("ideas.json") if os.path.exists(os.path.join(a.dir, "ideas.json")) else {"rows": []}
    data = {"calendar": cal["rows"], "runs": runs["rows"], "tasks": tasks["rows"], "ideas": ideas["rows"],
            "exported": meta.get("وقت التصدير (الرياض)", ""), "commit": meta.get("آخر commit", ""),
            "board": BOARD_URL}
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    tpl = open(os.path.join(ROOT, "studio", "dashboard", "status_template.html"), encoding="utf-8").read()
    out = os.path.join(a.dir, "status.html")
    open(out, "w", encoding="utf-8").write(tpl.replace("__DATA__", blob))
    print(out, len(cal["rows"]), "videos")


if __name__ == "__main__":
    main()
