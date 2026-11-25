#!/usr/bin/env python3
"""ideas.py — سجل أفكار المفكر (content/ideas/ideas.md) + فحص التكرار.

  add  --series X --idea "..." --angle "..." --why "..." --sources "url1 url2" [--cal B-012|2026-11-27-01] [--date D]
                                     → يطبع ID الجديد (I-###)
  set  I-### cal=<ID> status=<الحالة>  تعديل حقل
  list [--last 5]                      آخر الأفكار
  dup  "نص"                            تشابه مع: كل أفكار السجل + كل مواضيع التقويم والبنك + المنشورات
                                       (≥ 0.85 = مكرر؛ 0.55–0.85 = قريب: قارن بنفسك — نفس المشكلة/الاختصار/الميزانية والهدف = مكرر)
"""
import argparse, datetime, difflib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import cal  # noqa: E402

PATH = os.path.join(ROOT, "content", "ideas", "ideas.md")
PUB = os.path.join(ROOT, "content", "published.md")
BEGIN, END = "<!-- IDEAS:BEGIN -->", "<!-- IDEAS:END -->"
COLS = ["id", "date", "series", "idea", "angle", "why", "sources", "cal", "status"]
HEAD = ["ID", "التاريخ", "السلسلة", "الفكرة", "الزاوية/الهوك", "ليش (الدليل من البيانات)", "المصادر", "التقويم", "الحالة"]
TZ = datetime.timezone(datetime.timedelta(hours=3))


def esc(v): return str(v or "").replace("|", "／").replace("\n", " ").strip()


def load():
    txt = open(PATH, encoding="utf-8").read()
    pre, rest = txt.split(BEGIN, 1); body, post = rest.split(END, 1)
    rows = []
    for line in body.strip().splitlines():
        line = line.strip()
        if not line.startswith("|") or line.startswith("|---") or line.startswith("| ID"): continue
        cells = [c.strip() for c in line.strip("|").split("|")]; cells += [""] * (len(COLS) - len(cells))
        rows.append(dict(zip(COLS, cells[:len(COLS)])))
    return pre, rows, post


def save(pre, rows, post):
    lines = ["| " + " | ".join(HEAD) + " |", "|" + "---|" * len(HEAD)]
    lines += ["| " + " | ".join(esc(r.get(c, "")) for c in COLS) + " |" for r in rows]
    open(PATH, "w", encoding="utf-8").write(pre + BEGIN + "\n" + "\n".join(lines) + "\n" + END + post)


def norm(s):
    s = re.sub(r"[ً-ْـ]", "", str(s).lower())
    s = s.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ة", "ه").replace("ى", "ي")
    return re.sub(r"[^\w\s+]", " ", s).split()


def sim(a, b):
    ta, tb = norm(a), norm(b)
    if not ta or not tb: return 0.0
    seq = difflib.SequenceMatcher(a=" ".join(ta), b=" ".join(tb)).ratio()
    sa, sb = set(ta), set(tb); jac = len(sa & sb) / len(sa | sb)
    return round(max(seq, jac), 2)


def corpus():
    out = []
    _, rows, _ = load()
    out += [(f"فكرة {r['id']}", r["status"], r["idea"]) for r in rows]
    _, crows, _ = cal.load()
    out += [(f"تقويم {r['id']}", r["status"], r["topic"]) for r in crows]
    if os.path.exists(PUB):
        for line in open(PUB, encoding="utf-8"):
            c = [x.strip() for x in line.strip().strip("|").split("|")]
            if len(c) >= 7 and re.match(r"\d{4}-\d{2}-\d{2}$", c[0]): out.append((f"منشور {c[2]}", c[6], c[4]))
    return out


def main():
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("add")
    for k in ("series", "idea", "angle", "why", "sources"): p.add_argument(f"--{k}", required=k in ("series", "idea", "why"), default="")
    p.add_argument("--cal", default=""); p.add_argument("--date")
    p = sub.add_parser("set"); p.add_argument("id"); p.add_argument("pairs", nargs="+")
    p = sub.add_parser("list"); p.add_argument("--last", type=int, default=5)
    p = sub.add_parser("dup"); p.add_argument("text")
    a = ap.parse_args()
    pre, rows, post = load()
    if a.cmd == "add":
        if a.series not in cal.SERIES: sys.exit(f"bad series {a.series}")
        n = max([int(r["id"][2:]) for r in rows if r["id"].startswith("I-")] + [0]) + 1
        rid = f"I-{n:03d}"
        rows.append(dict(id=rid, date=a.date or datetime.datetime.now(TZ).date().isoformat(), series=a.series, idea=a.idea,
                         angle=a.angle, why=a.why, sources=a.sources, cal=a.cal, status="في التقويم" if a.cal else "مقترحة"))
        save(pre, rows, post); print(rid)
    elif a.cmd == "set":
        r = next((x for x in rows if x["id"] == a.id), None) or sys.exit(f"ID not found: {a.id}")
        for pair in a.pairs:
            k, v = pair.split("=", 1)
            if k not in COLS: sys.exit(f"unknown key: {k}")
            r[k] = v
        save(pre, rows, post); print(f"✓ {a.id}")
    elif a.cmd == "list":
        for r in rows[-a.last:]: print(f"{r['id']}\t{r['date']}\t{r['series']}\t{r['status']}\t{r['cal']}\t{r['idea']}")
    elif a.cmd == "dup":
        hits = sorted(((sim(a.text, t), src, st, t[:90]) for src, st, t in corpus()), reverse=True)
        hits = [h for h in hits if h[0] >= 0.55][:8]
        for h in hits: print(*h, sep="\t")
        top = hits[0][0] if hits else 0
        print("النتيجة:", "مكرر — غيّر الفكرة" if top >= 0.85 else ("قريب — قارن بنفسك: نفس الموضوع الأساسي = مكرر" if top >= 0.55 else "جديدة ✓"))


if __name__ == "__main__":
    main()
