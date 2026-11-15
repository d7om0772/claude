#!/usr/bin/env python3
"""
install_packs.py — يثبّت حزم الستايل والشعار من design-refs/ إلى brand/ (آمن للتكرار).

1) كل zip في design-refs/*.zip: يدوّر على مجلد الحزمة الداخلي (مثل 15_iso_build_drop)،
   ويحدد السلسلة من brand/styles/pack-map.json، ويفكه في brand/styles/<series>/.
   ما يعيد التثبيت لو نفس الملف (sha256) مثبّت من قبل. يكتب .pack.json فيه المصدر والتاريخ.
   ويستخرج إطار كل ثانية من 03_preview.mp4 في brand/styles/<series>/_preview_frames/ مع ورقة لقطات.
2) الشعار: design-refs/logo/*.png → brand/logo/ (نسخة أصلية + نسخة بخلفية شفافة بدون تغيير الشكل أو اللون).

الاستخدام:  python3 -I scripts/install_packs.py [--force]
الناتج: ملخص بالحزم اللي تثبتت/تخطّاها. لو حزمة ما لها سلسلة في pack-map.json يطبع تنبيه ويتخطاها.
"""
import hashlib, json, os, re, shutil, subprocess, sys, tempfile, zipfile, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REFS = os.path.join(ROOT, "design-refs")
STYLES = os.path.join(ROOT, "brand", "styles")
LOGO_OUT = os.path.join(ROOT, "brand", "logo")
MAP_FILE = os.path.join(STYLES, "pack-map.json")
FORCE = "--force" in sys.argv

def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""): h.update(b)
    return h.hexdigest()

def load_map():
    with open(MAP_FILE, encoding="utf-8") as f: return json.load(f)

def safe_extract(z: zipfile.ZipFile, dest: str):
    dest_abs = os.path.realpath(dest)
    for m in z.infolist():
        name = m.filename
        if name.startswith("__MACOSX/") or os.path.basename(name).startswith("._"): continue
        target = os.path.realpath(os.path.join(dest, name))
        if not target.startswith(dest_abs + os.sep) and target != dest_abs:
            raise ValueError(f"unsafe path in zip: {name}")
        if m.is_dir(): os.makedirs(target, exist_ok=True); continue
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with z.open(m) as src, open(target, "wb") as out: shutil.copyfileobj(src, out)

PACK_RE = re.compile(r"^(\d{2}_[A-Za-z0-9_]+)$")

def find_pack_dirs(root):
    """يرجّع [(pack_name, path)] لكل مجلد اسمه بنمط NN_name وفيه 01_prompt.md أو مجلدات الحزمة."""
    found = []
    for dp, dns, fns in os.walk(root):
        base = os.path.basename(dp)
        if PACK_RE.match(base) and not base.startswith(("01_", "02_", "03_", "04_", "05_")):
            if "01_prompt.md" in fns or any(d.startswith(("02_", "04_", "05_")) for d in dns):
                found.append((base, dp)); dns[:] = []
    return found

def preview_frames(series_dir):
    prev = os.path.join(series_dir, "03_preview.mp4")
    if not os.path.exists(prev): return
    out = os.path.join(series_dir, "_preview_frames"); os.makedirs(out, exist_ok=True)
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", prev, "-vf", "fps=1,scale=270:-2",
                    os.path.join(out, "f_%03d.jpg")], check=False)
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", prev, "-vf",
                    "fps=1,scale=216:-2,tile=8x4:padding=6:color=white", "-frames:v", "1",
                    os.path.join(out, "contact_sheet.jpg")], check=False)

def install_zip(zp, mapping, report):
    digest = sha256(zp)
    with zipfile.ZipFile(zp) as z, tempfile.TemporaryDirectory() as tmp:
        safe_extract(z, tmp)
        packs = find_pack_dirs(tmp)
        if not packs:
            report.append(f"⚠ {os.path.basename(zp)}: ما لقيت مجلد حزمة بنمط NN_name"); return
        for name, path in packs:
            series = mapping.get(name) or mapping.get(name.split("_")[0])
            if not series:
                report.append(f"⚠ {name}: ما له سلسلة في brand/styles/pack-map.json — أضفه ثم أعد التشغيل"); continue
            dest = os.path.join(STYLES, series)
            meta_p = os.path.join(dest, ".pack.json")
            if not FORCE and os.path.exists(meta_p):
                try:
                    meta = json.load(open(meta_p, encoding="utf-8"))
                    if meta.get("sha256") == digest and meta.get("pack") == name:
                        report.append(f"= {name} → {series} (مثبتة مسبقاً)"); continue
                except Exception: pass
            # نحافظ على README.md لو موجود ونستبدل محتوى الحزمة
            os.makedirs(dest, exist_ok=True)
            for item in os.listdir(dest):
                if item in ("README.md",): continue
                p = os.path.join(dest, item)
                shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
            for item in os.listdir(path):
                s, d = os.path.join(path, item), os.path.join(dest, item)
                shutil.copytree(s, d) if os.path.isdir(s) else shutil.copy2(s, d)
            json.dump({"pack": name, "series": series, "source_zip": os.path.relpath(zp, ROOT), "sha256": digest,
                       "installed_at": datetime.datetime.now(datetime.timezone.utc).isoformat()},
                      open(meta_p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            readme = os.path.join(dest, "README.md")
            with open(readme, "w", encoding="utf-8") as f:
                f.write(f"# حزمة ستايل سلسلة `{series}`\n\nالحزمة `{name}` مثبّتة من `{os.path.relpath(zp, ROOT)}`.\n"
                        "هذي الحزمة هي المرجع الملزم لتصميم فيديوهات السلسلة. ابدأ بـ `01_prompt.md`.\n"
                        "إطارات المعاينة (كل ثانية) في `_preview_frames/` وفيها `contact_sheet.jpg`.\n")
            preview_frames(dest)
            report.append(f"✓ {name} → brand/styles/{series}/  (جديدة أو محدّثة: أعد بناء قالب studio/{series}/)")

# ---------------- الشعار ----------------
def to_transparent(src, dst, thresh=232):
    """يشيل الخلفية البيضاء المتصلة بأطراف الصورة فقط (الأبيض داخل الشعار يبقى) مع حواف ناعمة."""
    from PIL import Image, ImageDraw, ImageFilter
    import numpy as np
    im = Image.open(src).convert("RGBA")
    rgb = np.asarray(im.convert("RGB")).astype(np.int16)
    w, h = im.size
    near_white = (rgb.min(axis=2) >= thresh)
    mask = Image.fromarray((near_white * 255).astype("uint8"), "L").copy()  # copy: fromarray قد يشارك ذاكرة للقراءة فقط
    # تعبئة من كل بكسل أبيض على الحواف → قيمة 128 = خلفية
    for x in range(0, w, max(1, w // 64)):
        for y in (0, h - 1):
            if mask.getpixel((x, y)) == 255: ImageDraw.floodfill(mask, (x, y), 128)
    for y in range(0, h, max(1, h // 64)):
        for x in (0, w - 1):
            if mask.getpixel((x, y)) == 255: ImageDraw.floodfill(mask, (x, y), 128)
    bg = np.asarray(mask) == 128
    # شريط حواف 2px حول الخلفية: نطبق color-to-alpha (أبيض) عليه فقط
    band = np.asarray(Image.fromarray((bg * 255).astype("uint8")).filter(ImageFilter.MaxFilter(5))) > 0
    band &= ~bg
    arr = np.asarray(im).astype(np.float32)
    out = arr.copy()
    out[bg, 3] = 0
    c = arr[band, :3] / 255.0
    a = np.clip((1.0 - c).max(axis=1), 0, 1)
    safe = np.maximum(a, 1e-3)[:, None]
    col = (c - (1 - a)[:, None]) / safe
    out[band, :3] = np.clip(col, 0, 1) * 255
    out[band, 3] = a * 255 * (arr[band, 3] / 255.0)
    Image.fromarray(out.astype("uint8"), "RGBA").save(dst)

LOGO_NAMES = {  # اسم الملف الأصلي → الاسم الموحّد
    "turbo_pc_logo_icon_blue_white_bg.png": "icon",
    "turbo_pc_logo_blue_white_bg.png": "full",
}

def install_logos(report):
    d = os.path.join(REFS, "logo")
    if not os.path.isdir(d): return
    files = [f for f in os.listdir(d) if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))]
    if not files: report.append("⚠ design-refs/logo/ فاضي: الشعار ناقص"); return
    os.makedirs(LOGO_OUT, exist_ok=True)
    for f in files:
        key = LOGO_NAMES.get(f) or ("icon" if "icon" in f.lower() else "full")
        src = os.path.join(d, f)
        orig = os.path.join(LOGO_OUT, f"{key}_original.png")
        trans = os.path.join(LOGO_OUT, f"{key}_transparent.png")
        if not FORCE and os.path.exists(trans) and os.path.getmtime(trans) >= os.path.getmtime(src):
            report.append(f"= logo {key} (مثبت)"); continue
        from PIL import Image
        Image.open(src).convert("RGBA").save(orig)
        to_transparent(src, trans)
        report.append(f"✓ logo {f} → brand/logo/{key}_original.png + {key}_transparent.png")

def main():
    report = []
    mapping = load_map()
    for f in sorted(os.listdir(REFS)) if os.path.isdir(REFS) else []:
        if f.lower().endswith(".zip"):
            try: install_zip(os.path.join(REFS, f), mapping, report)
            except Exception as e: report.append(f"✗ {f}: {e}")
    try: install_logos(report)
    except Exception as e: report.append(f"✗ logo: {e}")
    if not report: report.append("لا يوجد zip أو شعار في design-refs/")
    print("\n".join(report))

if __name__ == "__main__":
    main()
