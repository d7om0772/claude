# حزمة ستايل سلسلة `budget-builds` — ⏳ بانتظار الحزمة

الحزمة المطلوبة: **`15_iso_build_drop`** (تجميعة أيزومترية: القطع تنزل في الكيس).

**الحالة (2026-11-15):** ملف zip الحزمة ما كان موجود في `design-refs/` وقت الإعداد، فالمجلد هذا فاضي.
السلسلة **مفعّلة** وتشتغل مؤقتاً على **القالب المؤقت** `studio/budget-builds/` ومكتبة عناصره `studio/budget-builds/ELEMENTS.md`
(مبني من وصف الهوية في البرومبت). كل فيديو يطلع بالقالب المؤقت يتسجل في جدول مشاهده: `style: interim`.

**لما توصل الحزمة:** حط ملف zip في `design-refs/` → `bash scripts/bootstrap.sh` (أو `python3 -I scripts/install_packs.py`) يفكّها هنا تلقائياً
→ المدير يعيد بناء `studio/budget-builds/` على حسب `01_prompt.md` و`02_elements/` ويقارنه بـ `03_preview.mp4`، ويسجل في CHANGELOG.
