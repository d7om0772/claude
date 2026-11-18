#!/usr/bin/env python3
"""
fetch_openverse.py — ينزّل المؤثرات الصوتية اللي تحددها حزم الستايل من Openverse (مصدرها Wikimedia Commons،
حزمة Gravity Sound)، ويحوّلها إلى WAV 48kHz mono مطبّع (ذروة −3dBFS) مع قص السكوت، ويسجّل المصدر والرخصة.

  python3 -I studio/sfx/fetch_openverse.py            (آمن للتكرار: يتخطى الموجود)
  python3 -I studio/sfx/fetch_openverse.py --force

الناتج: studio/sfx/gs_<slug>.wav + تحديث manifest.json (حقل license/creator/source_url/landing_url)
الرخصة CC BY 4.0 → لازم سطر إسناد في وصف المنشور (credits.md يولّده تلقائياً من manifest).
"""
import json, os, re, subprocess, sys, urllib.error, urllib.parse, urllib.request
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "sfx-fetch/1.0 (python-urllib; low-rate batch download)"}
# الاسم في الحزمة → (slug، وصف الاستخدام)
WANTED = {
    "Swipe 2": ("swipe2", "نزول القطعة، نبضة الكيبل، تبديل سطح المكتب، لفة الكيس"),
    "Swipe grass 2": ("swipe_grass2", "لفة/انزلاق الكاميرا، تبديل الأقسام، حركة النافذة"),
    "Swipe grass 5": ("swipe_grass5", "تبديل الأقسام، المسح"),
    "Lock": ("lock", "تثبيت القطعة، تركيب البطارية/الوصلة"),
    "Drop Item 2": ("drop_item2", "تثبيت القطعة (ارتطام)، قفل التبويب، البطارية القديمة"),
    "Coins 3": ("coins3", "خصم السعر من الميزانية"),
    "Charging 2": ("charging2", "تشغيل المراوح، صعود الفريمات، توهج الشاشتين"),
    "Item pick up 4": ("item_pickup4", "تركيب الغرفة، ظهور النتائج، رجوع التبويب، لحظة الحل"),
    "Selection 12 forward": ("selection12_fwd", "ظهور النتائج والقائمة، لحظة الحل"),
    "Selection 9 forward": ("selection9_fwd", "ظهور القائمة"),
    "Notification 2": ("notification2", "المجموع، احفظ، التعليقات، الختام"),
    "Soft laptop keyboard": ("soft_keyboard", "ضغطات الأزرار"),
    "Select Option 11": ("select_option11", "نقرات الماوس، زر التشغيل"),
    "Watch tick": ("watch_tick", "الساعة"),
    "Error 5": ("error5", "المشكلة (أحمر)"),
    # حزمة الأخبار 16_quick_explainer
    "Punch Gut": ("punch_gut", "thud على كرت الجسر وكلمة الـ CTA (tech-news)"),
    "Dropping item": ("dropping_item", "نزول الدبابيس (tech-news)"),
    "Bump 1": ("bump1", "الختم على الكلمة الأهم (tech-news)"),
    "Reflect 2": ("reflect2", "shimmer مع التوهج (tech-news)"),
}

def get(url):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60))

def download(url, dest):
    """تنزيل مع احترام حد الطلبات (429): انتظار متزايد، ثم تجربة النسخة المحوّلة (transcoded) من Wikimedia."""
    import time
    cands = [url]
    m = re.match(r"https://upload\.wikimedia\.org/wikipedia/commons/(\w)/(\w\w)/([^/]+)$", url)
    if m:
        fn = m.group(3)
        cands.append(f"https://upload.wikimedia.org/wikipedia/commons/transcoded/{m.group(1)}/{m.group(2)}/{fn}/{fn}.mp3")
    last = None
    for c in cands:
        for attempt in range(5):
            try:
                data = urllib.request.urlopen(urllib.request.Request(c, headers=UA), timeout=120).read()
                open(dest, "wb").write(data); return c
            except urllib.error.HTTPError as e:
                last = e
                if e.code == 404: break
                wait = int(e.headers.get("Retry-After") or 0) or (30 * (attempt + 1))
                wait = min(wait, int(os.environ.get("SFX_MAX_WAIT", "900")))
                print(f"  … {e.code} — انتظار {wait}ث", flush=True); time.sleep(wait)
    raise last

def search(name):
    res = []
    for query in (f"{name} Gravity Sound", name):
        d = get(f"https://api.openverse.org/v1/audio/?q={urllib.parse.quote(query)}&source=wikimedia_audio&page_size=20")
        res += d.get("results", [])
    exact = [r for r in res if r["title"].strip().lower() == f"{name} (gravity sound)".lower()]
    if exact: return exact[0]
    loose = [r for r in res if r["title"].lower().startswith(name.lower()) and "gravity" in r["title"].lower()]
    if loose: return loose[0]
    # بعض مؤثرات الحزم من مصادر Wikimedia ثانية (Soft laptop keyboard، Watch tick) — نقبل التطابق بالعنوان
    other = [r for r in res if r["title"].strip().lower() == name.lower() or r["title"].lower().startswith(name.lower() + "-")]
    return other[0] if other else None

def tonal_notes(path):
    """تقدير بسيط: عدد النغمات المستقرة المختلفة (لكشف اللحن). ≥3 نغمات متتابعة = تحذير."""
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    n = 1024; notes = []
    for i in range(0, len(x) - n, n // 2):
        f = x[i:i + n] * np.hanning(n); s = np.abs(np.fft.rfft(f))
        if s.max() < 1e-3: continue
        k = int(np.argmax(s[5:])) + 5; peak = s[k] / (s.mean() + 1e-9)
        if peak > 25:  # نغمة واضحة
            midi = int(round(69 + 12 * np.log2(k * 16000 / n / 440)))
            if not notes or notes[-1] != midi: notes.append(midi)
    return len(set(notes)), notes[:12]

def main():
    force = "--force" in sys.argv
    mpath = os.path.join(HERE, "manifest.json")
    manifest = json.load(open(mpath, encoding="utf-8")) if os.path.exists(mpath) else {}
    for name, (slug, use) in WANTED.items():
        key = f"gs_{slug}"; out = os.path.join(HERE, f"{key}.wav")
        if os.path.exists(out) and not force and key in manifest:
            print(f"= {key}"); continue
        r = search(name)
        if not r: print(f"✗ {name}: not found on Openverse"); continue
        have_file = os.path.exists(out) and not force
        tmp = out + ".src"
        if have_file:  # الملف موجود بدون بيانات: سجّل البيانات بدون إعادة تنزيل
            used = r["url"]
        else:
          import time; time.sleep(int(os.environ.get("SFX_GAP", "20")))
          try: used = download(r["url"], tmp)
          except Exception as e: print(f"✗ {name}: download failed ({e})"); continue
          convert(tmp, out)
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out],
                                   capture_output=True, text=True).stdout)
        n_notes, seq = tonal_notes(out)
        lic = f"CC {r['license'].upper()} {r.get('license_version') or ''}".strip()
        manifest[key] = {"file": f"studio/sfx/{key}.wav", "duration_s": round(dur, 3), "peak_dbfs": -3.0,
                         "description": r["title"], "use": use, "pack_name": name,
                         "source": "Openverse → Wikimedia Commons", "creator": r.get("creator") or "Wikimedia Commons",
                         "license": lic, "license_url": r.get("license_url"), "source_url": used,
                         "landing_url": r.get("foreign_landing_url"),
                         "attribution": f"\"{r['title']}\" by {r.get('creator') or 'Wikimedia Commons'}, {lic}, via Wikimedia Commons",
                         "tonal_check": {"distinct_notes": n_notes, "melody_warning": n_notes >= 3}}
        json.dump(manifest, open(mpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)   # حفظ بعد كل ملف
        print(f"✓ {key} ({dur:.2f}s, {lic}) notes={n_notes}{' ⚠ تحقق: ممكن فيه لحن' if n_notes >= 3 else ''}", flush=True)

def convert(tmp, out):
        af = ("silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
              "silenceremove=start_periods=1:start_threshold=-50dB,areverse")
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", tmp, "-af", af, "-ac", "1", "-ar", "48000", out + ".tmp.wav"], check=True)
        # تطبيع الذروة إلى −3dBFS
        p = subprocess.run(["ffmpeg", "-nostdin", "-i", out + ".tmp.wav", "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True)
        mx = float(re.findall(r"max_volume: (-?[\d.]+) dB", p.stderr)[0])
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", out + ".tmp.wav", "-af", f"volume={-3 - mx}dB",
                        "-c:a", "pcm_s16le", out], check=True)
        os.remove(tmp); os.remove(out + ".tmp.wav")


if __name__ == "__main__":
    main()
