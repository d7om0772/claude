#!/usr/bin/env python3
"""sync_times.py — يحدّث عمود "الموعد" في التقويم حسب أوقات day_info (سياسة الأوقات العشوائية داخل الذروة).

يلمس فقط صفوف الفيديوهات الثابتة (ID ينتهي برقم: -01، -02، -03) من اليوم وطالع، وحالتها لسا ما انجدولت
(فكرة، سكربت، معتمد، فيديو جاهز، فشل، مرفوض). المجدول والمنشور ما يتغيّر. صفوف الأخبار (-N1) ما تتغيّر.

  python3 scripts/sync_times.py            # يطبع التغييرات ويحفظ التقويم
  python3 scripts/sync_times.py --dry-run
"""
import datetime, json, os, re, subprocess, sys
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import cal  # noqa: E402

PENDING = {"فكرة", "سكربت", "معتمد", "فيديو جاهز", "فشل", "مرفوض"}


def main():
    dry = "--dry-run" in sys.argv
    today = datetime.datetime.now(ZoneInfo("Asia/Riyadh")).date().isoformat()
    pre, rows, post = cal.load()
    cache, changes = {}, []
    for r in rows:
        m = re.match(r"^(\d{4}-\d{2}-\d{2})-(\d{2})$", r["id"])
        if not m or r["date"] < today or r["status"] not in PENDING: continue
        d = m.group(1)
        if d not in cache:
            info = json.loads(subprocess.check_output([sys.executable, os.path.join(ROOT, "scripts", "day_info.py"), "--date", d, "--json"]))
            cache[d] = {s["id"]: s["time"] for s in info["today"]["slots"]}
        t = cache[d].get(r["id"])
        if t and t != r["time"]:
            changes.append(f"{r['id']}: {r['time']} → {t}"); r["time"] = t
    if changes and not dry: cal.save(pre, rows, post)
    print("\n".join(changes) if changes else "no changes")


if __name__ == "__main__":
    main()
