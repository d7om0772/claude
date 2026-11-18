#!/usr/bin/env python3
# kie.py create <name> <model> <aspect> <res> <bg|-> <prompt_file> [input_url,...]  -> prints taskId
# kie.py wait <taskId> <out_path>
import sys, json, subprocess, time, os
KEY = os.environ["KIE_AI_API_KEY"]; BASE = "https://api.kie.ai/api/v1/jobs"
def curl(args):
    r = subprocess.run(["curl", "-sS", "-m", "60"] + args + ["-H", f"Authorization: Bearer {KEY}"], capture_output=True, text=True)
    return json.loads(r.stdout or "{}")
cmd = sys.argv[1]
if cmd == "create":
    name, model, ar, res, bg, pf = sys.argv[2:8]; urls = sys.argv[8].split(",") if len(sys.argv) > 8 and sys.argv[8] else []
    inp = {"prompt": open(pf, encoding="utf-8").read().strip(), "aspect_ratio": ar, "resolution": res}
    if bg != "-": inp["background"] = bg
    if urls: inp["input_urls"] = urls
    body = {"model": model, "input": inp}
    r = curl(["-X", "POST", f"{BASE}/createTask", "-H", "Content-Type: application/json", "-d", json.dumps(body, ensure_ascii=False)])
    print(json.dumps({"name": name, **r}, ensure_ascii=False))
elif cmd == "wait":
    tid, out = sys.argv[2], sys.argv[3]
    for i in range(120):
        r = curl([f"{BASE}/recordInfo?taskId={tid}"]); d = r.get("data") or {}
        st = d.get("state")
        if st == "success":
            urls = json.loads(d.get("resultJson") or "{}").get("resultUrls", [])
            subprocess.run(["curl", "-sS", "-m", "120", "-o", out, urls[0]], check=True)
            print(json.dumps({"ok": True, "out": out, "url": urls[0], "credits": d.get("creditsConsumed"), "secs": i * 5})); break
        if st == "fail": print(json.dumps({"ok": False, "fail": d.get("failMsg"), "code": d.get("failCode")})); break
        time.sleep(5)
    else: print(json.dumps({"ok": False, "timeout": True}))
