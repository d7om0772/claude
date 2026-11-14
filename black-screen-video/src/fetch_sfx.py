import json, urllib.request, urllib.parse, subprocess, os, time
want = {"error": "Error 5 (Gravity Sound)", "sel_fwd": "Selection 12 forward (Gravity Sound)", "pickup": "Item pick up 4 (Gravity Sound)",
        "lock": "Lock (Gravity Sound)", "select": "Select Option 11 (Gravity Sound)", "keyboard": "Soft laptop keyboard-wxA-2",
        "swipe": "Swipe 2 (Gravity Sound)", "grass2": "Swipe grass 2 (Gravity Sound)", "grass5": "Swipe grass 5 (Gravity Sound)",
        "drop": "Drop Item 2 (Gravity Sound)", "notif": "Notification 2 (Gravity Sound)", "click": "Clicking (Gravity Sound)", "lock3": "Lock 3 (Gravity Sound)"}
H = {"User-Agent": "ShortVideoSFXFetcher/1.0 (personal video project; low-volume)"}
mp = "audio/sfx/sfx_meta.json"
meta = json.load(open(mp)) if os.path.exists(mp) else {}
def get(url):
    for i in range(2):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(3)
    raise RuntimeError("rate limited: " + url)
for key, title in want.items():
    if os.path.exists(f"audio/sfx/{key}.wav"): continue
    if key not in meta:
        u = "https://api.openverse.org/v1/audio/?" + urllib.parse.urlencode({"q": title, "page_size": 20, "source": "wikimedia_audio"})
        r = json.loads(get(u))
        hit = next(x for x in r["results"] if x["title"] == title)
        meta[key] = {"title": hit["title"], "creator": hit.get("creator"), "license": f"CC {hit['license'].upper()} {hit.get('license_version')}",
                     "url": hit["url"], "page": hit.get("foreign_landing_url")}
        json.dump(meta, open(mp, "w"), ensure_ascii=False, indent=1)
    url = meta[key]["url"]
    # upload.wikimedia.org rate-limits originals from this IP; the transcoded copies are served normally
    path = url.split("/wikipedia/commons/", 1)[1]
    fname = path.rsplit("/", 1)[1]
    cands = [f"https://upload.wikimedia.org/wikipedia/commons/transcoded/{path}/{fname}.mp3",
             f"https://upload.wikimedia.org/wikipedia/commons/transcoded/{path}/{fname}.ogg", url]
    data = None
    for c in cands:
        try:
            data = get(c); used = c; break
        except Exception as e:
            print("  miss", c[-50:], e)
    raw = f"audio/sfx/{key}_src.{used.rsplit('.', 1)[1]}"
    meta[key]["downloaded_from"] = used
    json.dump(meta, open(mp, "w"), ensure_ascii=False, indent=1)
    open(raw, "wb").write(data)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-ar", "48000", "-ac", "2", f"audio/sfx/{key}.wav"], check=True)
    os.remove(raw)
    print(key, "ok", flush=True)
    time.sleep(3)
