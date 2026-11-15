# حزمة ستايل سلسلة `troubleshooting` — ⏳ بانتظار الحزمة

الحزمة المطلوبة: **`14_desk_pc_red_green`** (مكتب قيمنق: أحمر للمشكلة وأخضر للحل).

**الحالة (2026-11-15):** ملف zip الحزمة ما كان موجود في `design-refs/` وقت الإعداد، فالمجلد هذا فاضي.
السلسلة **مفعّلة** وتشتغل مؤقتاً على **القالب المؤقت** `studio/troubleshooting/` ومكتبة عناصره `studio/troubleshooting/ELEMENTS.md`
(مبني من وصف الهوية في البرومبت). كل فيديو يطلع بالقالب المؤقت يتسجل في جدول مشاهده: `style: interim`.

**لما توصل الحزمة:** حط ملف zip في `design-refs/` → `bash scripts/bootstrap.sh` (أو `python3 -I scripts/install_packs.py`) يفكّها هنا تلقائياً
→ المدير يعيد بناء `studio/troubleshooting/` على حسب `01_prompt.md` و`02_elements/` ويقارنه بـ `03_preview.mp4`، ويسجل في CHANGELOG.
