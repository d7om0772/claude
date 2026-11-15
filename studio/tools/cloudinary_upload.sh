#!/usr/bin/env bash
# =============================================================================
# cloudinary_upload.sh — يرفع ملف من الحاوية إلى Cloudinary بتوقيع من موصل Cloudinary (sign-upload).
#
# 1) استدعِ موصل Cloudinary: sign-upload بـ uploads=[{"public_id":"<ID>","asset_folder":"torbo/<YYYY-MM-DD>","folder":"torbo/<YYYY-MM-DD>","overwrite":true,"tags":"torbo,<series>"}]
# 2) احفظ أول عنصر من النتيجة (JSON فيه upload_params و api_key و signature و host و cloud_name) في ملف، مثلاً work/<ID>/sign.json
# 3) bash studio/tools/cloudinary_upload.sh work/<ID>/sign.json work/<ID>/video.mp4 video
#    (resource_type: video للفيديو، image للغلاف)
# يطبع JSON مختصر: secure_url, public_id, asset_id, bytes, duration. كود الخروج ≠ 0 لو فشل.
# =============================================================================
set -euo pipefail
SIGN="$1"; FILE="$2"; RTYPE="${3:-video}"
[ -s "$SIGN" ] || { echo "sign file missing" >&2; exit 2; }
[ -s "$FILE" ] || { echo "file missing" >&2; exit 2; }
HOST=$(jq -r '.host // "api.cloudinary.com"' "$SIGN")
CLOUD=$(jq -r '.cloud_name' "$SIGN")
ARGS=(-F "file=@\"$FILE\"" -F "api_key=$(jq -r '.api_key' "$SIGN")" -F "signature=$(jq -r '.signature' "$SIGN")")
# كل مفتاح في upload_params لازم ينرسل كما هو (أي تغيير يبطل التوقيع)
PARAMS_TYPE=$(jq -r '.upload_params | type' "$SIGN")
if [ "$PARAMS_TYPE" = "string" ]; then
  # صيغة key=value&key=value
  IFS='&' read -ra KV <<< "$(jq -r '.upload_params' "$SIGN")"
  for kv in "${KV[@]}"; do ARGS+=(-F "$(python3 -c 'import sys,urllib.parse;k,_,v=sys.argv[1].partition("=");print(k+"="+urllib.parse.unquote_plus(v))' "$kv")"); done
else
  while IFS= read -r line; do ARGS+=(-F "$line"); done < <(jq -r '.upload_params | to_entries[] | "\(.key)=\(.value|tostring)"' "$SIGN")
fi
RESP=$(curl -sS --retry 3 --retry-delay 3 "https://$HOST/v1_1/$CLOUD/$RTYPE/upload" "${ARGS[@]}")
echo "$RESP" | jq '{secure_url, public_id, asset_id, bytes, duration, error}'
echo "$RESP" | jq -e '.secure_url' >/dev/null
