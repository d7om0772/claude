# design-refs — الملفات المرجعية الأصلية (لا تُعدَّل)

ارفع هنا:
- ملفات zip حزم الستايل (اسم الملف ما يهم؛ المهم المجلد الداخلي: `13_mini_desk_diorama`، `14_desk_pc_red_green`، `15_iso_build_drop`، وأي حزمة جديدة).
- `logo/turbo_pc_logo_icon_blue_white_bg.png` (الأيقونة) و`logo/turbo_pc_logo_blue_white_bg.png` (الشعار الكامل).

التثبيت تلقائي: `scripts/bootstrap.sh` (أول خطوة في كل مهمة مجدولة) يشغّل `scripts/install_packs.py`، اللي يفك كل حزمة في `brand/styles/<series>/` حسب `brand/styles/pack-map.json`، وينسخ الشعار إلى `brand/logo/` مع نسخة بخلفية شفافة.

**الحالة:** ✅ الحزم الثلاث (13، 14، 15) والشعار مرفوعة ومثبّتة (2026-11-15).
