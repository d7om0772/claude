#!/usr/bin/env python3
"""
cal.py — أداة قراءة/تعديل تقويم المحتوى content/calendar.md بدون ما نكسر الجدول.
الجدول هو المصدر الوحيد لحالة كل فيديو. لا تعدّل الجدول يدوياً إلا للضرورة.

الأوامر:
  list   [--date D] [--from D --to D] [--status S] [--series X] [--backlog]   عرض الصفوف
  get    ID                                   صف واحد JSON
  set    ID key=value [key=value ...]         تعديل حقول. notes+=نص يضيف للملاحظات بدل الاستبدال
  add    --date D --time HH:MM --series X --topic "..." [--angle "..."] [--status فكرة]
  backlog-add --series X --topic "..." [--angle "..."]     فكرة بدون تاريخ (ID = B-###)
  assign BACKLOG_ID --date D --time HH:MM [--slot NN]     ينقل فكرة من البنك لموعد
  topics                                       كل المواضيع (لمنع التكرار)
  dup    "موضوع"                               يفحص تشابه موضوع مع المواضيع الموجودة
  count  --from D --to D [--series X]          عدد المواضيع المجدولة في فترة
  check                                        يتحقق من سلامة الجدول

المفاتيح (key): date time series topic angle status script cloudinary post voice notes
الحالات: فكرة ← سكربت ← معتمد ← فيديو جاهز ← مجدول ← منشور | فشل | مرفوض | مستبدل | ملغي
"""
import argparse, difflib, json, os, re, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "content", "calendar.md")
COLS = ["id", "date", "time", "series", "topic", "angle", "status", "script", "cloudinary", "post", "voice", "notes"]
HEAD = ["ID", "النشر", "الموعد", "السلسلة", "الموضوع", "الزاوية/الهوك", "الحالة", "السكربت", "Cloudinary", "منشور", "الصوت", "ملاحظات"]
STATUSES = ["فكرة", "سكربت", "معتمد", "فيديو جاهز", "مجدول", "منشور", "فشل", "مرفوض", "مستبدل", "ملغي"]
SERIES = ["budget-builds", "shortcuts", "troubleshooting", "tech-news", "comparisons"]
BEGIN, END = "<!-- CALENDAR:BEGIN -->", "<!-- CALENDAR:END -->"

def esc(v): return str(v or "").replace("|", "／").replace("\n", " ").strip()

def load():
    txt = open(PATH, encoding="utf-8").read()
    pre, rest = txt.split(BEGIN, 1)
    body, post = rest.split(END, 1)
    rows = []
    for line in body.strip().splitlines():
        line = line.strip()
        if not line.startswith("|") or line.startswith("|---") or line.startswith("| ID"): continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        cells += [""] * (len(COLS) - len(cells))
        rows.append(dict(zip(COLS, cells[:len(COLS)])))
    return pre, rows, post

def save(pre, rows, post):
    def key(r):
        return (0 if r["date"] else 1, r["date"] or "9999", r["time"] or "99:99", r["id"])
    rows = sorted(rows, key=key)
    lines = ["| " + " | ".join(HEAD) + " |", "|" + "---|" * len(HEAD)]
    for r in rows: lines.append("| " + " | ".join(esc(r.get(c, "")) for c in COLS) + " |")
    open(PATH, "w", encoding="utf-8").write(pre + BEGIN + "\n" + "\n".join(lines) + "\n" + END + post)

def find(rows, rid):
    for r in rows:
        if r["id"] == rid: return r
    sys.exit(f"ID not found: {rid}")

def show(rows):
    for r in rows:
        print(" | ".join(f"{r[c]}" for c in ("id", "time", "series", "status", "topic", "cloudinary", "post", "notes")))
    if not rows: print("(لا يوجد)")

def norm(s): return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", s.lower())).strip()

def main():
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("list"); p.add_argument("--date"); p.add_argument("--from", dest="dfrom"); p.add_argument("--to")
    p.add_argument("--status"); p.add_argument("--series"); p.add_argument("--backlog", action="store_true"); p.add_argument("--json", action="store_true")
    p = sub.add_parser("get"); p.add_argument("id")
    p = sub.add_parser("set"); p.add_argument("id"); p.add_argument("pairs", nargs="+")
    p = sub.add_parser("add"); p.add_argument("--date", required=True); p.add_argument("--time", required=True)
    p.add_argument("--series", required=True); p.add_argument("--topic", required=True); p.add_argument("--angle", default="")
    p.add_argument("--status", default="فكرة"); p.add_argument("--slot")
    p = sub.add_parser("backlog-add"); p.add_argument("--series", required=True); p.add_argument("--topic", required=True); p.add_argument("--angle", default="")
    p = sub.add_parser("assign"); p.add_argument("id"); p.add_argument("--date", required=True); p.add_argument("--time", required=True); p.add_argument("--slot")
    sub.add_parser("topics")
    p = sub.add_parser("dup"); p.add_argument("topic")
    p = sub.add_parser("count"); p.add_argument("--from", dest="dfrom", required=True); p.add_argument("--to", required=True); p.add_argument("--series")
    sub.add_parser("check")
    a = ap.parse_args()
    pre, rows, post = load()

    if a.cmd == "list":
        out = rows
        if a.backlog: out = [r for r in out if not r["date"]]
        if a.date: out = [r for r in out if r["date"] == a.date]
        if a.dfrom: out = [r for r in out if r["date"] and r["date"] >= a.dfrom]
        if a.to: out = [r for r in out if r["date"] and r["date"] <= a.to]
        if a.status: out = [r for r in out if r["status"] == a.status]
        if a.series: out = [r for r in out if r["series"] == a.series]
        print(json.dumps(out, ensure_ascii=False, indent=1)) if a.json else show(out)
    elif a.cmd == "get":
        print(json.dumps(find(rows, a.id), ensure_ascii=False, indent=1))
    elif a.cmd == "set":
        r = find(rows, a.id)
        for pair in a.pairs:
            if "+=" in pair:
                k, v = pair.split("+=", 1); k = k.strip()
                stamp = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=3))).strftime("%m-%d %H:%M")
                r[k] = (r.get(k, "") + " ؛ " if r.get(k) else "") + f"[{stamp}] {v.strip()}"
            else:
                k, v = pair.split("=", 1); k = k.strip(); r[k] = v.strip()
            if k not in COLS: sys.exit(f"unknown key: {k}")
            if k == "status" and r[k] not in STATUSES: sys.exit(f"bad status: {r[k]} (allowed: {STATUSES})")
        save(pre, rows, post); print(f"✓ {a.id} updated")
    elif a.cmd == "add":
        if a.series not in SERIES: sys.exit(f"bad series {a.series}")
        same = [r for r in rows if r["date"] == a.date]
        slot = a.slot or f"{len(same) + 1:02d}"
        rid = f"{a.date}-{slot}"
        while any(r["id"] == rid for r in rows):
            slot = f"{int(slot) + 1:02d}"; rid = f"{a.date}-{slot}"
        rows.append(dict(zip(COLS, [rid, a.date, a.time, a.series, a.topic, a.angle, a.status] + [""] * 5)))
        save(pre, rows, post); print(f"✓ added {rid}")
    elif a.cmd == "backlog-add":
        n = max([int(r["id"][2:]) for r in rows if r["id"].startswith("B-")] + [0]) + 1
        rid = f"B-{n:03d}"
        rows.append(dict(zip(COLS, [rid, "", "", a.series, a.topic, a.angle, "فكرة"] + [""] * 5)))
        save(pre, rows, post); print(f"✓ backlog {rid}")
    elif a.cmd == "assign":
        r = find(rows, a.id)
        same = [x for x in rows if x["date"] == a.date]
        slot = a.slot or f"{len(same) + 1:02d}"
        rid = f"{a.date}-{slot}"
        if any(x["id"] == rid for x in rows): sys.exit(f"slot taken: {rid}")
        r.update({"id": rid, "date": a.date, "time": a.time})
        r["notes"] = (r["notes"] + " ؛ " if r["notes"] else "") + f"من البنك {a.id}"
        save(pre, rows, post); print(f"✓ {a.id} → {rid}")
    elif a.cmd == "topics":
        for r in rows: print(f"{r['id']}\t{r['series']}\t{r['status']}\t{r['topic']}")
    elif a.cmd == "dup":
        t = norm(a.topic); hits = []
        for r in rows:
            s = difflib.SequenceMatcher(a=t, b=norm(r["topic"])).ratio()
            if s >= 0.6: hits.append((round(s, 2), r["id"], r["status"], r["topic"]))
        for h in sorted(hits, reverse=True): print(*h, sep="\t")
        if not hits: print("لا يوجد تشابه")
    elif a.cmd == "count":
        out = [r for r in rows if r["date"] and a.dfrom <= r["date"] <= a.to and r["status"] not in ("مستبدل", "ملغي")]
        if a.series: out = [r for r in out if r["series"] == a.series]
        print(len(out))
    elif a.cmd == "check":
        ids = [r["id"] for r in rows]; bad = []
        if len(ids) != len(set(ids)): bad.append("duplicate IDs")
        for r in rows:
            if r["status"] not in STATUSES: bad.append(f"{r['id']}: bad status {r['status']}")
            if r["series"] not in SERIES: bad.append(f"{r['id']}: bad series {r['series']}")
            if r["date"]:
                try: datetime.date.fromisoformat(r["date"])
                except Exception: bad.append(f"{r['id']}: bad date")
        print("✓ calendar OK (%d rows)" % len(rows) if not bad else "\n".join(bad))
        sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
