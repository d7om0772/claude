"""Build one RGBA patch per shirt: fabric-matched backing that hides the old
print, with the new design keyed on top. Consumed by compose.sh (ffmpeg)."""
import json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

track = json.load(open("track.json"))
GARMENT = {"1": "white", "2": "black", "3": "white",
           "4": "black", "5": "white", "6": "black", "7": "white"}
ROT = {"1": -11.0, "2": 0.0, "3": 0.0, "4": 0.0, "5": 0.0, "6": 0.0, "7": -4.0}
# how much of the backing height the artwork fills
FILL = {"1": .80, "2": .84, "3": .80, "4": .84, "5": .80, "6": .80, "7": .96}
# Backing size in source pixels, measured off the gridded frames so it fully
# covers the original print (incl. shirt 3's long drips and shirt 6's text).
BACKING = {"1": (400, 660), "2": (300, 470), "3": (410, 515), "4": (340, 520),
           "5": (400, 545), "6": (320, 560), "7": (200, 165)}
# tracked ink centroid -> optical centre of the original print
NUDGE = {"1": (8, -26), "2": (26, -8), "3": (9, 22), "4": (32, 4),
         "5": (13, -8), "6": (-5, -6), "7": (-4, -3)}
# Shirt 1 swings in from off-frame, so its backing is extended to the left:
# that puts the feathered edge outside the picture instead of letting the old
# flames bleed through it at x=0.
PAD_L = {"1": 130}
# tighter feather where the print runs close to the backing edge
FEATHER = {"1": 0.5}

import os, sys
DESIGN = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("DESIGN", "design_src.png")
print(f"design: {DESIGN}")
_d = Image.open(DESIGN)
if _d.mode in ("RGBA", "LA", "P"):            # flatten transparency onto white
    _d = _d.convert("RGBA")
    _bg = Image.new("RGBA", _d.size, (255, 255, 255, 255))
    _d = Image.alpha_composite(_bg, _d)
design = _d.convert("RGB")
dl = np.asarray(design.convert("L")).astype(np.float32)

def artwork_mask(lum):
    """Artwork = anything that is not paper-white. Catches the light clay
    flower while leaving the paper AND the enclosed letter counters clear."""
    m = Image.fromarray(((lum <= 247) * 255).astype(np.uint8), "L")
    m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))  # close specks
    return (np.asarray(m) > 127).astype(np.float32)

AMASK = artwork_mask(dl)

def keyed(dark_ink):
    """Design with the white paper keyed out. dark_ink=False -> light print."""
    a = np.maximum(np.clip((235.0 - dl) / 55.0, 0, 1), AMASK)   # ink key OR artwork body
    if dark_ink:
        rgb = np.asarray(design).astype(np.float32)
    else:
        L3 = np.dstack([dl, dl, dl])
        rgb = 236.0 - 0.26 * L3                             # ink -> light, tones preserved
    img = Image.fromarray(np.dstack([rgb, a * 255.0]).astype(np.uint8), "RGBA")
    r, g, b, al = img.split()
    return Image.merge("RGBA", (r, g, b, al.filter(ImageFilter.GaussianBlur(0.8))))

art = {True: keyed(True), False: keyed(False)}

def fabric(arr, cx, cy, w, h, garment):
    """Per-row fabric colour sampled just left and right of the print box."""
    x0, x1 = int(cx - w / 2), int(cx + w / 2)
    y0, y1 = int(cy - h / 2), int(cy + h / 2)
    rows = []
    for y in range(y0, y1):
        yy = min(max(y, 0), arr.shape[0] - 1)
        picks = []
        for xs in (range(max(0, x0 - 26), max(1, x0 - 4)),
                   range(min(arr.shape[1] - 1, x1 + 4), min(arr.shape[1], x1 + 26))):
            s = arr[yy, list(xs)]
            if len(s):
                L = s[:, 0] * .299 + s[:, 1] * .587 + s[:, 2] * .114
                keep = (L > 150) if garment == "white" else (L < 95)
                if keep.sum() >= 3:
                    picks.append(np.median(s[keep], axis=0))
        rows.append(np.mean(picks, axis=0) if picks
                    else (np.array([238., 238., 236.]) if garment == "white"
                          else np.array([22., 22., 24.])))
    rows = np.array(rows)
    # median-then-mean smoothing down the column kills streaks from neighbours
    k = max(5, (len(rows) // 9) | 1)
    pad = np.pad(rows, ((k // 2, k // 2), (0, 0)), mode="edge")
    med = np.array([np.median(pad[i:i + k], axis=0) for i in range(len(rows))])
    pad2 = np.pad(med, ((k, k), (0, 0)), mode="edge")
    return np.array([pad2[i:i + 2 * k + 1].mean(axis=0) for i in range(len(rows))])

meta = {}
for sid, rows in track.items():
    g = [r for r in rows if r]
    mid = g[len(g) // 2]
    garment = GARMENT[sid]
    arr = np.asarray(Image.open(f"dense/d_{mid['f']:03d}.jpg").convert("RGB")).astype(np.float32)

    ncx, ncy = NUDGE[sid]
    mid = dict(mid, cx=mid["cx"] + ncx, cy=mid["cy"] + ncy)
    W, H = BACKING[sid]
    pad = PAD_L.get(sid, 0)
    col = fabric(arr, mid["cx"], mid["cy"], W, H, garment)
    col = np.repeat(col[:, None, :], W + pad, axis=1)
    # gentle horizontal shading so the patch is not a flat slab
    ramp = 1.0 + 0.030 * np.cos(np.linspace(-math.pi, math.pi, W + pad))
    col = np.clip(col * ramp[None, :, None], 0, 255)
    patch = Image.fromarray(col.astype(np.uint8), "RGB").convert("RGBA")

    # feathered alpha so edges melt into the fabric
    m = Image.new("L", (W + pad, H), 0)
    fs = FEATHER.get(sid, 1.0)
    fx, fy = int(W * .085 * fs) + 3, int(H * .06 * fs) + 3
    ImageDraw.Draw(m).rounded_rectangle([fx, fy, W + pad - fx, H - fy],
                                        radius=int(min(W, H) * .22), fill=255)
    patch.putalpha(m.filter(ImageFilter.GaussianBlur(max(4, min(W, H) * .045 * fs))))

    # artwork on top
    side = int(round(min(W * 0.93, H * FILL[sid])))
    a = art[garment == "white"].resize((side, side), Image.LANCZOS)
    ax, ay = pad + (W - side) // 2, int((H - side) * .46)
    patch.alpha_composite(a, (ax, ay))

    if abs(ROT[sid]) > 0.2:
        patch = patch.rotate(ROT[sid], resample=Image.BICUBIC, expand=True)

    ox = -(W / 2 + pad) - (patch.width - (W + pad)) / 2
    oy = -H / 2 - (patch.height - H) / 2
    patch.save(f"patch_{sid}.png")
    meta[sid] = dict(w=patch.width, h=patch.height, ox=round(ox, 1), oy=round(oy, 1),
                     keys=[dict(t=r["t"], cx=r["cx"] + ncx, cy=r["cy"] + ncy) for r in g])
    print(f"patch_{sid}.png  {patch.width}x{patch.height}  garment={garment} "
          f"keys={len(g)} t={g[0]['t']}..{g[-1]['t']}")

json.dump(meta, open("patch_meta.json", "w"), indent=1)


# ---- tail: the closing whip-pan ------------------------------------------
# The chest print is still readable (as a green smear) while the camera whips
# away, so patch 7 gets a motion-blurred twin tracked on that smear.
GREEN = [(5.40, 563, 858), (5.50, 555, 870), (5.60, 566, 881), (5.70, 563, 917),
         (5.80, 560, 921), (5.90, 614, 883), (6.00, 612, 822)]

p7 = Image.open("patch_7.png").convert("RGBA")
big = p7.resize((int(p7.width * 1.28), int(p7.height * 1.28)), Image.LANCZOS)
acc = np.zeros((big.height, big.width, 4), dtype=np.float64)
n = 0
for dx, dy in [(-7, -12), (-4, -7), (-2, -3), (0, 0), (2, 4), (4, 8), (7, 13)]:
    acc += np.asarray(big.transform(big.size, Image.AFFINE, (1, 0, -dx, 0, 1, -dy),
                                    resample=Image.BILINEAR)).astype(np.float64)
    n += 1
blur = Image.fromarray((acc / n).astype(np.uint8), "RGBA").filter(ImageFilter.GaussianBlur(3.4))
blur.save("patch_8.png")

meta["8"] = dict(w=blur.width, h=blur.height,
                 ox=-blur.width / 2, oy=-blur.height / 2,
                 keys=[dict(t=t, cx=cx, cy=cy) for t, cx, cy in GREEN])
json.dump(meta, open("patch_meta.json", "w"), indent=1)
print(f"patch_8.png  {blur.width}x{blur.height}  (motion-blurred tail)")
