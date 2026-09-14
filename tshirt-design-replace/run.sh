#!/usr/bin/env bash
# Replace every t-shirt print in the clip with a design.
#
#   SRC=clip.mp4 ./run.sh                   # uses design_src.png
#   SRC=clip.mp4 ./run.sh my_design.png     # uses your artwork
#   SRC=clip.mp4 ./run.sh my_design.png out.mp4
#
# The design should be roughly square, artwork on a white or transparent
# background (transparency is flattened onto white before keying).
set -euo pipefail
cd "$(dirname "$0")"
SRC="${SRC:?set SRC to the source clip, e.g. SRC=clip.mp4 ./run.sh}"
export SRC
DESIGN="${1:-design_src.png}"
OUT="${2:-tshirt_goodvibes.mp4}"

# 1. reference frames at 10 fps -- patches.py samples fabric colour from these
if [ ! -d dense ]; then
  mkdir -p dense
  ffmpeg -v error -i "$SRC" -vf fps=10 dense/d_%03d.jpg
fi

# 2. track the original prints (writes track.json; already committed, so this
#    is only needed if you point the pipeline at a different clip)
[ -f track.json ] || python3 track3.py

# 3. build the fabric-matched design patches, then the ffmpeg filter graph
python3 patches.py "$DESIGN"
python3 build_graph.py

# 4. composite
./compose.sh "$OUT"
