#!/usr/bin/env bash
# =============================================================================
# git_save.sh "رسالة الحفظ" — commit + push مباشرة للفرع الأساسي (main).
# يُستخدم بعد كل خطوة (سكربت معتمد، فيديو جاهز، جدولة...). آمن لو ما فيه تغييرات.
# يعيد المحاولة 5 مرات مع rebase على آخر main. لو صار تعارض: يدمج مع تفضيل نسختنا ويسجّل ذلك.
# =============================================================================
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
MSG="${1:-update}"
BRANCH="$(python3 -c "import json;print(json.load(open('config.json')).get('git',{}).get('branch','main'))" 2>/dev/null || echo main)"

git config user.name  >/dev/null 2>&1 || git config user.name  "torbo-bot"
git config user.email >/dev/null 2>&1 || git config user.email "torbo-bot@users.noreply.github.com"

git add -A
if git diff --cached --quiet; then
  echo "[git_save] لا يوجد تغيير"
else
  git commit -q -m "$MSG" && echo "[git_save] commit: $MSG"
fi

delay=2
for i in 1 2 3 4 5; do
  if git fetch -q origin "$BRANCH"; then
    if ! git rebase -q "origin/$BRANCH" 2>/dev/null; then
      git rebase --abort 2>/dev/null
      echo "[git_save] ⚠ تعارض rebase — دمج مع تفضيل التعديلات المحلية في الأجزاء المتعارضة"
      git merge -q --no-edit -X ours "origin/$BRANCH" || { git merge --abort 2>/dev/null; }
    fi
  fi
  if git push -q origin "HEAD:$BRANCH"; then
    echo "[git_save] ✓ pushed to $BRANCH ($(git rev-parse --short HEAD))"
    exit 0
  fi
  echo "[git_save] push failed (try $i) — retry in ${delay}s"
  sleep $delay; delay=$((delay * 2))
done
echo "[git_save] ✗ فشل الدفع بعد 5 محاولات. التعديلات محفوظة محلياً فقط — سجّل ذلك في التقويم."
exit 1
