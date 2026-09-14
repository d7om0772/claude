# T-shirt print replacement

Swaps the printed design on every t-shirt in a short clip for one piece of
artwork, using ffmpeg for the composite.

## Usage

```bash
SRC=clip.mp4 ./run.sh my_design.png output.mp4
```

`my_design.png` should be roughly square, with the artwork on a white or
transparent background. Omit it to use the bundled `design_src.png`.

## How it works

The source clip is 6.2 s of 720x1280 footage in which a hand flips through
seven shirts on a rack. Each shirt is on screen for a fraction of a second and
moves while it is held, so a single fixed overlay will not sit still on the
garment.

1. **`track3.py`** finds the original print in every frame. It seeds from one
   frame per shirt where the print is clearly visible, then walks outwards in
   both directions, locking the box size and damping any jump larger than a
   third of the print so a lost lock cannot run away. Ink is detected as dark
   or saturated pixels on the white shirts and light or saturated pixels on the
   black ones. Output: `track.json` (per-frame centre for each shirt).

2. **`patches.py`** builds one RGBA patch per shirt:
   - a backing sized to fully cover the original print, filled with fabric
     colour sampled per row from just left and right of the print, smoothed
     down the column so a neighbouring garment cannot streak it, and feathered
     at the edges so it melts into the shirt;
   - the artwork keyed on top. The background is removed by a near-white test,
     which keeps enclosed letter counters clear while preserving light-toned
     elements of the design. On the black shirts the ink is remapped to light
     tones so the print reads the way a real light-on-dark print would.

3. **`build_graph.py`** emits the ffmpeg filter graph: one `overlay` per shirt,
   gated with `enable=between(t,...)` and positioned by a piecewise-linear
   expression over the tracked keyframes, clamped outside the key range.

4. **`compose.sh`** runs ffmpeg with the source plus the eight patch images,
   re-encoding video only and copying the original audio.

### Shirt timeline

| # | Window (s) | Garment | Original print |
|---|-----------|---------|----------------|
| 1 | 0.00–0.75 | white | Rengoku, red/gold with flames |
| 2 | 0.75–1.25 | black | Zoro with a vertical kanji panel |
| 3 | 1.25–1.85 | white | wide black gothic lettering with long drips |
| 4 | 1.85–2.45 | black | Itachi with red graffiti |
| 5 | 2.45–2.85 | white | sketched flowing hair |
| 6 | 2.85–3.55 | black | Super Saiyan line art plus gothic text |
| 7 | 3.55–5.55 | white | small green chest print |
| 8 | 5.45–6.10 | white | shirt 7 through the closing whip-pan |

Patch 8 is a motion-blurred copy of patch 7, tracked on the green print by hue
(`green.py`), because the original print stays readable as a smear while the
camera whips away.

### Notes

- `extent.py` was an attempt to size the backings automatically from the full
  ink extent. It saturates on fabric shadows, so the backing sizes in
  `patches.py` are measured off gridded frames instead. Kept for reference.
- `make_design.py` generates the bundled `design_src.png`. It is a rebuild of
  the intended artwork, not the original file.
