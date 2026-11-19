#!/usr/bin/env python3
"""
kie_image.py — توليد صور بنموذج GPT Image-2 عبر kie.ai (المفتاح من KIE_AI_API_KEY فقط).

  python3 -I tools/kie_image.py --prompts assets/prompts.json --out assets/img [--only card_hero,globe]

prompts.json: {"name": {"prompt": "...", "aspect_ratio": "1:1", "resolution": "1K", "background": "transparent"}, ...}
يرسل كل المهام مرة وحدة، ثم يتابعها إلى success/fail، وينزّل الصور، ويكتب out/manifest.json (الموديل، البرومبت، taskId، الرابط).
"""
import argparse, json, os, sys, time, urllib.request

API = "https://api.kie.ai/api/v1/jobs"
MODEL = "gpt-image-2-text-to-image"


def call(method, url, body=None):
    key = os.environ.get("KIE_AI_API_KEY")
    if not key:
        sys.exit("KIE_AI_API_KEY مو موجود في البيئة")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompts", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--timeout", type=int, default=900)
    a = ap.parse_args()
    specs = json.load(open(a.prompts, encoding="utf-8"))
    only = [s for s in a.only.split(",") if s]
    os.makedirs(a.out, exist_ok=True)
    man_path = os.path.join(a.out, "manifest.json")
    manifest = json.load(open(man_path, encoding="utf-8")) if os.path.exists(man_path) else {}

    tasks = {}
    for name, s in specs.items():
        if name.startswith("_") or (only and name not in only):
            continue
        inp = {"prompt": s["prompt"], "aspect_ratio": s.get("aspect_ratio", "1:1"), "resolution": s.get("resolution", "1K")}
        if s.get("background") and inp["resolution"] == "1K":
            inp["background"] = s["background"]
        r = call("POST", f"{API}/createTask", {"model": MODEL, "input": inp})
        if r.get("code") != 200:
            print(f"[{name}] فشل الإرسال: {r}", file=sys.stderr)
            continue
        tasks[name] = {"taskId": r["data"]["taskId"], "input": inp}
        print(f"[{name}] task {r['data']['taskId']}", flush=True)

    t0 = time.time()
    pending = dict(tasks)
    while pending and time.time() - t0 < a.timeout:
        time.sleep(8)
        for name in list(pending):
            tid = pending[name]["taskId"]
            try:
                r = call("GET", f"{API}/recordInfo?taskId={tid}")
            except Exception as e:  # noqa: BLE001
                print(f"[{name}] استعلام فشل: {e}", file=sys.stderr)
                continue
            d = r.get("data") or {}
            st = d.get("state")
            if st == "success":
                res = json.loads(d.get("resultJson") or "{}")
                url = (res.get("resultUrls") or [None])[0]
                ext = os.path.splitext(url.split("?")[0])[1] or ".png"
                dst = os.path.join(a.out, name + ext)
                urllib.request.urlretrieve(url, dst)
                manifest[name] = {"model": MODEL, "provider": "kie.ai", "taskId": tid, "input": pending[name]["input"],
                                  "url": url, "file": os.path.basename(dst), "costTime": d.get("costTime"),
                                  "created": time.strftime("%Y-%m-%dT%H:%M:%S")}
                print(f"[{name}] ✓ {dst} ({time.time()-t0:.0f}s)", flush=True)
                del pending[name]
            elif st == "fail":
                print(f"[{name}] ✗ {d.get('failCode')} {d.get('failMsg')}", file=sys.stderr, flush=True)
                del pending[name]
        json.dump(manifest, open(man_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for name in pending:
        print(f"[{name}] انتهت المهلة", file=sys.stderr)
    sys.exit(1 if pending or len(tasks) < len([n for n in specs if not n.startswith('_') and (not only or n in only)]) else 0)


if __name__ == "__main__":
    main()
