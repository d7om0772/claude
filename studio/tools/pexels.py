#!/usr/bin/env python3
"""
pexels.py — لقطات حقيقية عمودية من Pexels (عند الحاجة فقط). المفتاح من PEXELS_API_KEY (ما ينكتب في أي ملف).

  بحث:    python3 -I studio/tools/pexels.py search "graphics card closeup" [--n 8]
  تنزيل:  python3 -I studio/tools/pexels.py get <video_id> --out work/<ID>/clips/
          → ينزّل أفضل ملف عمودي ≤ 1080×1920، ويستخرج 8 إطارات موزعة في <out>/<id>_frames/ لفحص ذوات الأرواح،
            ويطبع سطر الحقوق (المصوّر + الرابط + الرخصة) لملف credits.md.
بعد التنزيل: افتح كل الإطارات وشوفها. أي إنسان/يد/وجه/حيوان (حتى لو صغير أو في الخلفية) = ارفض اللقطة.
رخصة Pexels: استخدام مجاني بدون إلزام بالإسناد — نسجل المصدر في credits.md دايماً.
"""
import json, os, subprocess, sys, urllib.parse, urllib.request

KEY = os.environ.get("PEXELS_API_KEY")
API = "https://api.pexels.com/videos"

def get(url):
    req = urllib.request.Request(url, headers={"Authorization": KEY or "", "User-Agent": "torbo-studio/1.0"})
    return json.load(urllib.request.urlopen(req, timeout=60))

def search(q, n=8):
    d = get(f"{API}/search?query={urllib.parse.quote(q)}&orientation=portrait&size=medium&per_page={n}")
    for v in d.get("videos", []):
        print(json.dumps({"id": v["id"], "w": v["width"], "h": v["height"], "dur": v["duration"], "url": v["url"], "by": v["user"]["name"]}, ensure_ascii=False))

def fetch(vid, out):
    v = get(f"{API}/videos/{vid}"); os.makedirs(out, exist_ok=True)
    files = [f for f in v["video_files"] if f.get("height") and f["height"] >= f.get("width", 0) and f["height"] <= 1920 and f.get("file_type") == "video/mp4"]
    if not files: sys.exit("no portrait mp4 file")
    f = max(files, key=lambda x: x["height"])
    path = os.path.join(out, f"pexels_{vid}.mp4")
    urllib.request.urlretrieve(f["link"], path)
    fr = os.path.join(out, f"{vid}_frames"); os.makedirs(fr, exist_ok=True)
    dur = float(v.get("duration") or 5)
    for i in range(8):
        t = dur * (i + 0.5) / 8
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", path, "-frames:v", "1", "-vf", "scale=360:-2",
                        os.path.join(fr, f"f{i}.jpg")], check=False)
    credit = f"- لقطة Pexels #{vid} — المصوّر: {v['user']['name']} ({v['user']['url']}) — {v['url']} — Pexels License (استخدام مجاني)"
    print(json.dumps({"file": path, "frames": fr, "w": f["width"], "h": f["height"], "credit": credit}, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    if not KEY: sys.exit("PEXELS_API_KEY missing")
    if len(sys.argv) < 3: sys.exit(__doc__)
    if sys.argv[1] == "search": search(sys.argv[2], int(sys.argv[sys.argv.index("--n") + 1]) if "--n" in sys.argv else 8)
    elif sys.argv[1] == "get": fetch(sys.argv[2], sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "clips")
