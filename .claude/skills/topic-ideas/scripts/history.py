#!/usr/bin/env python3
"""سجل تشغيلات مهارة «أفكار مواضيع».

يخزّن عناوين كل تشغيل حتى تُستبعد في التشغيلات التالية، ويرجّع عناوين
آخر N تشغيل في نفس المجال (أو مجال قريب منه).

الاستخدام:
    python3 history.py read "التسويق بالمحتوى" [--window 7]
    python3 history.py add  "التسويق بالمحتوى"   # العناوين من stdin، عنوان بكل سطر

المخرج دائماً JSON على stdout، وحقل ok يوضّح نجاح العملية من فشلها.
الخروج دائماً بالرمز 0 حتى لا يُقرأ فشل الكتابة كعطل — المهارة تكمل
اعتماداً على سجل المحادثة إذا كان ok=false.
"""

import argparse
import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone

MAX_STORED_RUNS = 300

_DIACRITICS = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")
_TRANSLATE = str.maketrans({
    "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه",
    "ؤ": "و", "ئ": "ي", "ﻻ": "لا",
})
_SPLIT = re.compile(r"[^\w؀-ۿ]+", re.UNICODE)

# كلمات صياغة الطلب فقط. كلمات المجال الحقيقية (مثل «محتوى» أو «content»)
# تبقى خارج القائمة: إبقاؤها يجعل مجالين متقاربين يتشاركان السجل، وهذا
# الخطأ الآمن — أسوأ نتيجته استبعاد عناوين زائدة، بينما فصل مجالين
# متقاربين يسرّب تكراراً حقيقياً وهو ما تمنعه المهارة أصلاً.
STOPWORDS = {
    "في", "عن", "على", "من", "الى", "مجال", "مجالات", "موضوع", "مواضيع",
    "موضوعات", "فكره", "افكار", "عناوين", "عنوان", "حول",
    "اعطني", "اعطيني", "اريد", "ابغى", "ابي", "لي", "و", "ال",
    "the", "in", "about", "on", "of", "for", "a", "an", "ideas", "idea",
    "topic", "topics", "give", "me", "some", "list",
}


def normalize(text: str) -> str:
    text = _DIACRITICS.sub("", text or "")
    text = text.translate(_TRANSLATE)
    return text.lower().strip()


def tokenize(text: str) -> list:
    tokens = []
    for raw in _SPLIT.split(normalize(text)):
        if not raw:
            continue
        # تجريد السوابق حتى تلتقي «بالمحتوى» و«المحتوى» و«للمحتوى» على جذر واحد
        if len(raw) > 4 and raw[0] in "بلكوف" and raw[1:3] == "ال":
            raw = raw[1:]
        if raw.startswith("لل") and len(raw) > 4:
            raw = raw[2:]
        if raw.startswith("ال") and len(raw) > 4:
            raw = raw[2:]
        if raw in STOPWORDS or len(raw) < 2:
            continue
        if raw not in tokens:
            tokens.append(raw)
    return tokens


def history_path(override=None) -> str:
    if override:
        return os.path.expanduser(override)
    env = os.environ.get("TOPIC_IDEAS_HISTORY")
    if env:
        return os.path.expanduser(env)
    return os.path.join(
        os.path.expanduser("~"), ".claude", "data", "topic-ideas", "history.json"
    )


def load(path: str) -> dict:
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, dict) and isinstance(data.get("runs"), list):
            return data
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        pass
    return {"version": 1, "runs": []}


def save(path: str, data: dict) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path) or ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=1)
        os.replace(tmp, path)
    except Exception:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def is_related(run: dict, tokens: list) -> bool:
    """تشغيل سابق يُعتبر ذا صلة إذا شارك المجال الحالي في كلمة دالة واحدة على الأقل.

    هذا يجعل «تسويق المحتوى» و«التسويق الرقمي» يتشاركان السجل، بينما يبقى
    «الطبخ» مستقلاً بسجله — فلا تُقصى أفكار بلا سبب.
    """
    return bool(set(run.get("tokens") or []) & set(tokens))


def cmd_read(args) -> dict:
    path = history_path(args.file)
    tokens = tokenize(args.field)
    data = load(path)
    runs = data["runs"]

    related = [r for r in runs if is_related(r, tokens)] if tokens else runs
    window = related[-args.window:] if args.window > 0 else []

    used, seen = [], set()
    for run in reversed(window):  # الأحدث أولاً
        for title in run.get("titles", []):
            key = normalize(title)
            if key and key not in seen:
                seen.add(key)
                used.append(title)

    other = []
    for run in reversed(runs[-20:]):
        label = run.get("field", "")
        if label and not is_related(run, tokens) and label not in other:
            other.append(label)

    return {
        "ok": True,
        "history_file": path,
        "field": args.field,
        "tokens": tokens,
        "window": args.window,
        "matched_runs": len(window),
        "total_runs": len(runs),
        "used_titles": used,
        "recent_runs": [
            {"at": r.get("at", ""), "field": r.get("field", ""), "count": len(r.get("titles", []))}
            for r in reversed(window)
        ],
        "other_recent_fields": other[:5],
    }


def cmd_add(args) -> dict:
    path = history_path(args.file)
    titles = [ln.strip().lstrip("-•*").strip() for ln in sys.stdin.read().splitlines()]
    titles = [t for t in titles if t]
    if not titles:
        return {"ok": False, "error": "no titles received on stdin", "history_file": path}

    data = load(path)
    data["runs"].append({
        "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "field": args.field,
        "tokens": tokenize(args.field),
        "titles": titles,
    })
    data["runs"] = data["runs"][-MAX_STORED_RUNS:]
    save(path, data)
    return {
        "ok": True,
        "history_file": path,
        "field": args.field,
        "recorded": len(titles),
        "total_runs": len(data["runs"]),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    reader = sub.add_parser("read", help="عناوين آخر N تشغيل في هذا المجال")
    reader.add_argument("field")
    reader.add_argument("--window", type=int, default=7)
    reader.add_argument("--file", default=None)
    reader.set_defaults(func=cmd_read)

    adder = sub.add_parser("add", help="تسجيل عناوين تشغيل جديد (stdin)")
    adder.add_argument("field")
    adder.add_argument("--file", default=None)
    adder.set_defaults(func=cmd_add)

    args = parser.parse_args()
    try:
        result = args.func(args)
    except Exception as exc:  # سجل معطّل يجب ألا يوقف المهارة
        result = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}

    print(json.dumps(result, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
