#!/bin/bash
# Concatenate rendered segments, mux the final mix, and build a review contact sheet (one frame every 0.5 s).
# usage: src/finalize.sh <segments_dir> <out.mp4> <contact_sheet.jpg>
set -euo pipefail
SEG=$1; OUT=$2; SHEET=$3
ls "$SEG"/seg*.mp4 | sort -V | sed "s#^#file '#;s#\$#'#" > "$SEG/list.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$SEG/list.txt" -c copy "$SEG/video.mp4"
ffmpeg -v error -y -i "$SEG/video.mp4" -i audio/final_mix.wav -map 0:v -map 1:a -c:v copy \
  -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$OUT"
ffmpeg -v error -y -i "$OUT" -vf "fps=2,scale=216:384,tile=10x11:padding=4:color=white" -frames:v 1 -q:v 3 "$SHEET"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,bit_rate,sample_rate -show_entries format=duration,size -of compact "$OUT"
