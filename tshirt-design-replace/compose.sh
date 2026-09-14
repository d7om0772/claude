#!/usr/bin/env bash
# Replace every t-shirt print in the source clip with the GOOD VIBES design.
set -euo pipefail
SRC="${SRC:?set SRC to the source clip, e.g. SRC=clip.mp4 ./compose.sh out.mp4}"
OUT="${1:-tshirt_goodvibes.mp4}"

ffmpeg -y -v warning -stats \
  -i "$SRC" \
  -i patch_1.png -i patch_2.png -i patch_3.png -i patch_4.png \
  -i patch_5.png -i patch_6.png -i patch_7.png -i patch_8.png \
  -filter_complex_script graph.txt \
  -map '[vout]' -map 0:a? -c:a copy \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart \
  "$OUT"
echo "wrote $OUT"
