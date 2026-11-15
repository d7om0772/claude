#!/usr/bin/env bash
# =============================================================================
# bootstrap.sh — يثبت الأدوات الناقصة لخط إنتاج تيربو. آمن للتكرار (idempotent).
# كل مهمة مجدولة تشغّله أول شي:  bash scripts/bootstrap.sh
# ما يوقف لو فشلت خطوة: يسجّل التحذير ويكمل. الناتج النهائي: جدول الحالة.
# =============================================================================
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOG_PREFIX="[bootstrap]"
WARN=()
ok()   { echo "$LOG_PREFIX ✓ $*"; }
warn() { echo "$LOG_PREFIX ⚠ $*"; WARN+=("$*"); }
have() { command -v "$1" >/dev/null 2>&1; }

PIP="pip3 install -q --break-system-packages"

# ---------- 1) أدوات النظام ----------
if ! have ffmpeg || ! have ffprobe; then
  (apt-get update -qq && apt-get install -y -qq ffmpeg) >/dev/null 2>&1 && ok "ffmpeg installed" || warn "ffmpeg missing and apt install failed"
else ok "ffmpeg $(ffmpeg -version | head -1 | awk '{print $3}')"; fi
for t in jq unzip convert; do
  if ! have "$t"; then
    pkg="$t"; [ "$t" = convert ] && pkg=imagemagick
    (apt-get install -y -qq "$pkg") >/dev/null 2>&1 && ok "$t installed" || warn "$t missing"
  fi
done
have node && ok "node $(node --version)" || warn "node missing"
have python3 && ok "python $(python3 --version | awk '{print $2}')" || warn "python3 missing"

# ---------- 2) بايثون ----------
python3 - <<'PY' 2>/dev/null || $PIP faster-whisper numpy pillow requests >/dev/null 2>&1
import faster_whisper, numpy, PIL, requests
PY
python3 -c "import faster_whisper" 2>/dev/null && ok "faster-whisper $(python3 -c 'import faster_whisper;print(faster_whisper.__version__)')" || warn "faster-whisper not installed"
python3 -c "import numpy, PIL, requests" 2>/dev/null || $PIP numpy pillow requests >/dev/null 2>&1

# ---------- 3) Node: three.js + الخطوط (مثبّتة كنسخة ثابتة في studio/vendor و studio/fonts) ----------
if [ -f studio/vendor/three.module.js ] && [ -f studio/vendor/three.core.js ]; then
  ok "three.js vendored"
else
  (cd studio && npm install --silent --no-audit --no-fund) >/dev/null 2>&1 \
    && mkdir -p studio/vendor && cp studio/node_modules/three/build/three.module.js studio/node_modules/three/build/three.core.js studio/vendor/ \
    && ok "three.js installed + vendored" || warn "three.js missing (npm install in studio/ failed)"
fi

# ---------- 4) Playwright + Chromium ----------
if node -e "require('playwright')" 2>/dev/null; then ok "playwright (global)";
elif (cd studio && node -e "require('playwright')") 2>/dev/null; then ok "playwright (studio)";
else warn "playwright not found — do NOT run 'playwright install'; check /opt/pw-browsers"; fi
[ -d /opt/pw-browsers ] && ok "chromium at /opt/pw-browsers" || warn "chromium not at /opt/pw-browsers"

# ---------- 5) الخطوط (OFL) — من npm لأن raw.githubusercontent محجوب ----------
mkdir -p studio/fonts
need_fonts=0
for f in baloo-bhaijaan-2-arabic-wght-normal.woff2 baloo-bhaijaan-2-latin-wght-normal.woff2 inter-latin-wght-normal.woff2; do
  [ -s "studio/fonts/$f" ] || need_fonts=1
done
if [ $need_fonts = 1 ]; then
  (cd studio && npm install --silent --no-audit --no-fund) >/dev/null 2>&1
  cp studio/node_modules/@fontsource-variable/baloo-bhaijaan-2/files/baloo-bhaijaan-2-{arabic,latin}-wght-normal.woff2 studio/fonts/ 2>/dev/null
  cp studio/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2 studio/fonts/ 2>/dev/null
  [ -s studio/fonts/baloo-bhaijaan-2-arabic-wght-normal.woff2 ] && ok "fonts installed" || warn "fonts missing (Baloo Bhaijaan 2 / Inter)"
else ok "fonts Baloo Bhaijaan 2 + Inter present"; fi

# ---------- 6) موديل Whisper (يتحمّل مرة لكل حاوية) ----------
if python3 -c "import faster_whisper" 2>/dev/null; then
  if [ "${SKIP_WHISPER_MODEL:-0}" != 1 ]; then
    timeout 900 python3 - <<'PY' >/dev/null 2>&1 && ok "whisper large-v3-turbo ready" || warn "whisper model download failed (will retry on first use)"
from faster_whisper import WhisperModel
WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
PY
  fi
fi

# ---------- 7) حزم الستايل: لو فيه zip جديد في design-refs ثبّته ----------
if ls design-refs/*.zip >/dev/null 2>&1 || ls design-refs/logo/*.png >/dev/null 2>&1; then
  python3 -I scripts/install_packs.py && ok "style packs checked" || warn "install_packs.py failed"
fi

# ---------- 7ب) مؤثرات الحزم (Openverse/Wikimedia): محاولة قصيرة لتنزيل الناقص (Wikimedia يحد الطلبات) ----------
GS=$(ls studio/sfx/gs_*.wav 2>/dev/null | wc -l)
if [ "$GS" -lt 15 ] && [ "${SKIP_SFX_FETCH:-0}" != 1 ]; then
  SFX_MAX_WAIT=20 SFX_GAP=3 timeout 150 python3 -u -I studio/sfx/fetch_openverse.py >/tmp/sfx_fetch.log 2>&1
  GS2=$(ls studio/sfx/gs_*.wav 2>/dev/null | wc -l)
  [ "$GS2" -ge 15 ] && ok "pack SFX complete" || warn "pack SFX $GS2/15 (الباقي يستخدم بديل مولّد بالكود؛ لا تنسَ تحفظ الجديد بـ git_save)"
else ok "pack SFX $GS/15"; fi

# ---------- 8) المفاتيح والموصلات (تحقق فقط، ما نطبع القيم) ----------
for k in GEMINI_API_KEY PEXELS_API_KEY; do
  [ -n "${!k:-}" ] && ok "$k set" || warn "$k not set in environment"
done

# ---------- 9) git: هوية افتراضية لو ناقصة ----------
git config user.name  >/dev/null 2>&1 || git config user.name  "torbo-bot"
git config user.email >/dev/null 2>&1 || git config user.email "torbo-bot@users.noreply.github.com"

echo "$LOG_PREFIX done. warnings: ${#WARN[@]}"
for w in "${WARN[@]}"; do echo "$LOG_PREFIX   - $w"; done
exit 0
