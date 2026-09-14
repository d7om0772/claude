"""The last shirt's chest print is the only green thing in the clip, so track
it by hue -- including through the closing whip-pan where it smears."""
import json
import numpy as np
from PIL import Image

rows = []
for f in range(37, 63):
    a = np.asarray(Image.open(f"dense/d_{f:03d}.jpg").convert("RGB")).astype(int)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    m = (G > R + 10) & (G > B + 10) & (G > 45) & (G < 215)
    m[:600] = False                              # ignore above the garments
    ys, xs = np.nonzero(m)
    if len(xs) < 40:
        rows.append(None)
        print(f"{f:3d} t={(f-1)/10:.1f}  -- none ({len(xs)} px)")
        continue
    # trim outliers, then bbox
    qx = np.percentile(xs, [2, 98]); qy = np.percentile(ys, [2, 98])
    k = (xs >= qx[0]) & (xs <= qx[1]) & (ys >= qy[0]) & (ys <= qy[1])
    xs, ys = xs[k], ys[k]
    r = dict(f=f, t=round((f - 1) / 10, 3),
             cx=round(float(xs.mean()), 1), cy=round(float(ys.mean()), 1),
             w=round(float(xs.max() - xs.min()), 1), h=round(float(ys.max() - ys.min()), 1),
             n=int(len(xs)))
    rows.append(r)
    print(f"{f:3d} t={r['t']:.1f}  c=({r['cx']:.0f},{r['cy']:.0f})  "
          f"box {r['w']:.0f}x{r['h']:.0f}  n={r['n']}")

json.dump([r for r in rows if r], open("green.json", "w"), indent=1)
