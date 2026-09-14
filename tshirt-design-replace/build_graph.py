import json
meta = json.load(open("patch_meta.json"))

# full on-screen window per shirt (tracked keys can be shorter than the shot)
# contiguous windows at the real shirt-change moments
WIN = {"1": (0.00, 0.749), "2": (0.75, 1.249), "3": (1.25, 1.849),
       "4": (1.85, 2.449), "5": (2.45, 2.849), "6": (2.85, 3.549),
       "7": (3.55, 5.449), "8": (5.45, 6.10)}

def pw(keys, vals, t0, t1):
    """piecewise-linear expression over t, clamped outside the key range"""
    T = f"clip(t\\,{keys[0]:.3f}\\,{keys[-1]:.3f})"
    if len(keys) == 1:
        return f"{vals[0]:.1f}"
    e = f"{vals[-1]:.1f}"
    for i in range(len(keys) - 2, -1, -1):
        ka, kb, va, vb = keys[i], keys[i + 1], vals[i], vals[i + 1]
        seg = f"({va:.1f}+({vb - va:.1f})*(({T})-{ka:.3f})/{kb - ka:.3f})"
        e = f"if(lt({T}\\,{kb:.3f})\\,{seg}\\,{e})"
    return e

lines = ["[0:v]format=rgba[b0];"]
prev = "b0"
for i, sid in enumerate(sorted(meta, key=int), start=1):
    m = meta[sid]
    ks = [k["t"] for k in m["keys"]]
    ox = m.get("ox", -m["w"] / 2)
    oy = m.get("oy", -m["h"] / 2)
    xs = [k["cx"] + ox for k in m["keys"]]
    ys = [k["cy"] + oy for k in m["keys"]]
    t0, t1 = WIN[sid]
    lines.append(f"[{i}:v]format=rgba,gblur=sigma=0.45[p{sid}];")
    lines.append(
        f"[{prev}][p{sid}]overlay=x='{pw(ks, xs, t0, t1)}':y='{pw(ks, ys, t0, t1)}'"
        f":enable='between(t\\,{t0}\\,{t1})':eof_action=repeat:format=auto[b{i}];")
    prev = f"b{i}"
lines.append(f"[{prev}]format=yuv420p[vout]")

open("graph.txt", "w").write("\n".join(lines))
print("\n".join(lines[:4]))
print(f"... {len(lines)} filter lines, {len(open('graph.txt').read())} bytes")
