#!/usr/bin/env bash
# =============================================================================
# selftest.sh [series...] — اختبار القوالب من أول الخط لآخره بنص قصير (بدون نشر):
#   صوت Charon ← توقيت Whisper ← ترجمة ← scene.json ← مكس ← رندر أول 5 ثواني ← فحص الجودة + أوراق لقطات.
# الناتج في work/selftest/<series>/ (ما ينحفظ في المستودع). استخدمه بعد أي تعديل على قالب أو بعد تثبيت حزمة.
# =============================================================================
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
SERIES=("$@"); [ ${#SERIES[@]} -eq 0 ] && SERIES=(budget-builds shortcuts troubleshooting)
TO="${SELFTEST_TO:-5}"
for s in "${SERIES[@]}"; do
  T=studio/$s/test; W=work/selftest/$s; mkdir -p "$W"
  echo "=== $s ==="
  python3 -I studio/tools/voice_pipeline.py --provider gemini --voice-text $T/voice.txt --caption-text $T/caption.txt --out $W/ | grep -E '"score"|"duration"' || { echo "voice failed"; continue; }
  python3 -I studio/tools/caption_align.py --caption $T/caption.txt --words $W/words.json --out $W/captions.json
  python3 -I studio/tools/scene_build.py --draft $T/scene_draft.json --captions $W/captions.json --voice-report $W/voice_report.json --out $W/scene.json || { echo "scene_build errors"; continue; }
  python3 -I studio/tools/audio_mix.py --voice $W/voice.wav --scene $W/scene.json --out $W/mix.wav
  node studio/render.cjs --series $s --data $W/scene.json --audio $W/mix.wav --out $W/test_${TO}s.mp4 --to $TO --workers 3 --qa $W/qa.json
  python3 -I studio/tools/qa_video.py $W/test_${TO}s.mp4 --qa $W/qa.json --sheets $W/sheets | grep -E '"issues"|"lufs"|sheet_' -A3 | head -12
done
