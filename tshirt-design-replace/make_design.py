"""Rebuild of the attached GOOD VIBES design as a 2000x2000 RGBA asset.
Stand-in only: swap in the real PNG and rerun compose.sh."""
import math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = 2000
im = Image.new("RGB", (S, S), (255, 255, 255))

# ---- wavy groovy wordmark -------------------------------------------------
def word(txt, px, squash):
    f = ImageFont.truetype("BagelFatOne.ttf", px)
    l, t, r, b = f.getbbox(txt)
    w, h = r - l, b - t
    lay = Image.new("L", (w + 40, h + 40), 0)
    ImageDraw.Draw(lay).text((20 - l, 20 - t), txt, font=f, fill=255)
    return lay.resize((lay.width, int(lay.height * squash)), Image.LANCZOS)

def wobble(mask, amp, period, phase=0.0):
    """shear each row sideways -> liquid/groovy stems"""
    out = Image.new("L", mask.size, 0)
    px = mask.load()
    op = out.load()
    W, H = mask.size
    for y in range(H):
        dx = int(round(amp * math.sin(2 * math.pi * y / period + phase)))
        for x in range(W):
            v = px[x, y]
            if v:
                nx = x + dx
                if 0 <= nx < W:
                    op[nx, y] = v
    return out

def place(mask, box):
    x0, y0, x1, y1 = box
    m = mask.resize((x1 - x0, y1 - y0), Image.LANCZOS)
    m = wobble(m, amp=14, period=m.height * 1.9, phase=0.4)
    m = m.filter(ImageFilter.MaxFilter(3))
    im.paste((10, 10, 10), (x0, y0), m)

place(word("GOOD", 460, 1.9), (330, 130, 1660, 800))
place(word("VIBES", 430, 2.0), (350, 700, 1600, 1500))

# ---- sculpted clay flower ------------------------------------------------
fl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
fd = ImageDraw.Draw(fl)
CLAY, SHADE = (233, 231, 226, 255), (196, 193, 186, 255)

def tube(pts, r, col=CLAY):
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        for s in range(0, 61):
            t = s / 60
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            fd.ellipse([x - r, y - r, x + r, y + r], fill=col)

def petal(cx, cy, ang, ln, r):
    a = math.radians(ang)
    px, py = cx + math.cos(a) * ln, cy + math.sin(a) * ln
    n = (a + math.pi / 2)
    b1 = (cx + math.cos(a) * ln * .55 + math.cos(n) * ln * .42,
          cy + math.sin(a) * ln * .55 + math.sin(n) * ln * .42)
    b2 = (cx + math.cos(a) * ln * .55 - math.cos(n) * ln * .42,
          cy + math.sin(a) * ln * .55 - math.sin(n) * ln * .42)
    tube([(cx, cy), b1, (px, py), b2, (cx, cy)], r)

tube([(1010, 1990), (1000, 1700), (985, 1450), (975, 1260)], 34)      # stem
tube([(1000, 1760), (880, 1700), (800, 1660), (785, 1620)], 30)        # left leaf
tube([(1000, 1740), (1130, 1710), (1215, 1700), (1230, 1680)], 30)     # right leaf
for a in (-90, -20, 45, 120, 200):                                     # 5 petals
    petal(945, 1235, a, 175, 46)
fd.ellipse([880, 1175, 1010, 1300], fill=SHADE)                        # centre

# clay grain + soft relief
random.seed(7)
gp = fl.load()
for _ in range(260000):
    x, y = random.randrange(700, 1300), random.randrange(1100, S)
    if gp[x, y][3]:
        r, g, b, A = gp[x, y]
        d = random.randint(-26, 20)
        gp[x, y] = (max(0, min(255, r + d)), max(0, min(255, g + d)), max(0, min(255, b + d)), A)
fl = fl.filter(ImageFilter.GaussianBlur(0.7))

sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
sh.paste((150, 148, 143, 120), (0, 0), fl.split()[3])
im.paste(sh.convert("RGB"), (10, 12), sh.split()[3].filter(ImageFilter.GaussianBlur(9)))
im.paste(fl.convert("RGB"), (0, 0), fl.split()[3])

im.save("design_src.png")
print("design_src.png", im.size)
