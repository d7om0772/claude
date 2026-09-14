"""Second pass: how far the ORIGINAL print really reaches around the tracked
centre, over the whole segment. Drives the backing size so nothing leaks."""
import json
import numpy as np
from PIL import Image

track = json.load(open("track.json"))
GARMENT = {"1": "white", "2": "black", "3": "white",
           "4": "black", "5": "white", "6": "black", "7": "white"}

def ink(a, garment):
    L = a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114
    sat = a.max(2).astype(int) - a.min(2).astype(int)
    return ((L < 145) | (sat > 40)) if garment == "white" else ((L > 115) | (sat > 45))

ext = {}
for sid, rows in track.items():
    garment = GARMENT[sid]
    w0, h0 = rows[0]["w"], rows[0]["h"]
    # generous but bounded search window around the tracked centre
    hw, hh = w0 * .92, h0 * .78
    acc = [0, 0, 0, 0]                        # left, right, up, down
    for r in rows:
        arr = np.asarray(Image.open(f"dense/d_{r['f']:03d}.jpg").convert("RGB"))
        cx, cy = r["cx"], r["cy"]
        x0, y0 = int(max(0, cx - hw)), int(max(0, cy - hh))
        x1, y1 = int(min(720, cx + hw)), int(min(1280, cy + hh))
        m = ink(arr[y0:y1, x0:x1], garment)
        cs, rs = m.sum(0), m.sum(1)
        if cs.max() < 3 or rs.max() < 3:
            continue
        cc = np.where(cs > max(2, cs.max() * .04))[0]
        rr = np.where(rs > max(2, rs.max() * .04))[0]
        acc[0] = max(acc[0], cx - (x0 + cc[0]))
        acc[1] = max(acc[1], (x0 + cc[-1]) - cx)
        acc[2] = max(acc[2], cy - (y0 + rr[0]))
        acc[3] = max(acc[3], (y0 + rr[-1]) - cy)
    # symmetric backing centred on the tracked point
    ext[sid] = dict(w=round(2 * max(acc[0], acc[1]), 1),
                    h=round(2 * max(acc[2], acc[3]), 1))
    print(f"S{sid}: tracked {w0:.0f}x{h0:.0f} -> full ink extent "
          f"{ext[sid]['w']:.0f}x{ext[sid]['h']:.0f}  (l{acc[0]:.0f} r{acc[1]:.0f} u{acc[2]:.0f} d{acc[3]:.0f})")

json.dump(ext, open("extent.json", "w"), indent=1)
