"""Bidirectional print tracker.  dense/d_NNN.jpg is 1-based, so the frame's
timestamp is (NNN-1)/10 -- the earlier version dropped that -1."""
import json
import numpy as np
from PIL import Image

# sid, first file, last file, seed file, garment, seed box
SEG = [
    (1,  1,  8,  3,  "white", (  0, 580, 280,  990)),
    (2,  9,  13, 11, "black", (100, 650, 300, 1020)),
    (3,  14, 19, 17, "white", (140, 660, 470, 1070)),
    (4,  20, 25, 23, "black", (205, 665, 440, 1090)),
    (5,  26, 29, 28, "white", (230, 650, 530, 1100)),
    (6,  30, 36, 33, "black", (355, 660, 595, 1140)),
    (7,  37, 56, 47, "white", (495, 780, 635,  900)),
]

def ink(a, garment):
    L = a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114
    sat = a.max(2).astype(int) - a.min(2).astype(int)
    return ((L < 120) | (sat > 55)) if garment == "white" else ((L > 135) | (sat > 60))

def measure(f, box, garment):
    arr = np.asarray(Image.open(f"dense/d_{f:03d}.jpg").convert("RGB"))
    x0, y0, x1, y1 = [int(round(v)) for v in box]
    m = ink(arr[y0:y1, x0:x1], garment)
    rs, cs = m.sum(1), m.sum(0)
    if rs.max() < 4 or cs.max() < 4:
        return None
    rr = np.where(rs > max(3, rs.max() * .15))[0]
    cc = np.where(cs > max(3, cs.max() * .15))[0]
    if len(rr) < 2 or len(cc) < 2:
        return None
    return (float(x0 + cc[0]), float(y0 + rr[0]), float(x0 + cc[-1]), float(y0 + rr[-1]))

out, sizes = {}, {}
for sid, f0, f1, fs, garment, seed in SEG:
    r = measure(fs, seed, garment)
    assert r, f"seed failed for S{sid}"
    sx0, sy0, sx1, sy1 = r
    rw, rh = sx1 - sx0, sy1 - sy0
    sizes[sid] = (rw, rh)
    found = {fs: ((sx0 + sx1) / 2, (sy0 + sy1) / 2)}

    def walk(order):
        cx, cy = found[fs]
        for f in order:
            pw, ph = rw * .70 + 26, rh * .45 + 26
            box = [max(0, cx - pw), max(0, cy - ph), min(720, cx + pw), min(1280, cy + ph)]
            r = measure(f, box, garment)
            if not r:
                continue
            bx0, by0, bx1, by1 = r
            ncx, ncy = (bx0 + bx1) / 2, (by0 + by1) / 2
            # a jump bigger than a third of the print is a lost lock -> damp it
            if abs(ncx - cx) > rw * .34: ncx = cx + np.sign(ncx - cx) * rw * .34
            if abs(ncy - cy) > rh * .28: ncy = cy + np.sign(ncy - cy) * rh * .28
            cx, cy = ncx, ncy
            found[f] = (cx, cy)

    walk(range(fs + 1, f1 + 1))
    walk(range(fs - 1, f0 - 1, -1))

    out[sid] = [dict(f=f, t=round((f - 1) / 10, 3),
                     cx=round(found[f][0], 1), cy=round(found[f][1], 1),
                     w=round(rw, 1), h=round(rh, 1))
                for f in sorted(found)]

json.dump(out, open("track.json", "w"), indent=1)
for sid, rows in out.items():
    print(f"S{sid} t {rows[0]['t']}..{rows[-1]['t']}  w={rows[0]['w']:.0f} h={rows[0]['h']:.0f}")
    print(f"   cx {[r['cx'] for r in rows]}")
    print(f"   cy {[r['cy'] for r in rows]}")
