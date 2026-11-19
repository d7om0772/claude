# جدول المشاهد — 2026-11-20-01 (troubleshooting · حزمة 14_desk_pc_red_green)
- `camera.variant` = 3 (16-03 = 1، 18-01 = 2). البطل: الرام داخل الكيس + شاشة BIOS (`X01 bios_xmp`). بدون `display_settings` ولا E08.
- الصوت: Charon (gemini-3.8-flash-tts) — ElevenLabs رفض: الرصيد 36 والمطلوب 758. المدة 63.5ث (الكلام 60.8ث). الحلقة: `loop {start 62.485, dur 1.0}`.
- شاشة BIOS تكتب "XMP / EXPO" العامة (بدون EXPO I / XMP I / DOCP) حسب ملاحظة المدقق. الأرقام 6000 و4800 فقط بدون وحدة.

| # | النص | التصنيف | العنصر | البداية | النهاية | params | المؤثر |
|---|---|---|---|---|---|---|---|
| 1 | شريت رام 6000، وممكن تكون شغالة على 4800 | B1 | E01 + X01 `keep` ram_tag "6000" (كاميرا case) + X01 `text` "4800" أحمر pulse (من w3 كاميرا monitor) | 0 | w7 | العنوان "رامك 6000 شغالة على !!4800؟!!" | Error 5 على "4800" |
| 2 | لأن الرام افتراضياً تشتغل على سرعة أقل… | B9 | E15 + T | w8 | w17 | desc_at w13 | Item pick up 4 |
| 3 | مثلاً طقم DDR5-6000 من Kingston، الافتراضية 4800 | B8 | X01 `spec_table` (Default (JEDEC) 4800 أحمر / XMP / EXPO 6000) + T | w18 | w25 | Kingston نص فقط | Swipe 2 |
| 4 | الخطوة 1: Task Manager ← Performance ← Memory | B10 | E03 (1) + X01 `settings_nav` | w26 | w34 | times w29/w32/w34، fix_at w90 | Swipe grass 2 + ضغطات |
| 5 | وشوف الرقم جنب Speed | B5 | X01 `text` "4800" sub Speed أحمر | w35 | w38 | state problem | Error 5 |
| 6 | أقل من المكتوب؟ الخطوة 2: ادخل BIOS | B10 | T + E03 (2) + X01 `bios_xmp` (Default/4800) | w39 | w47 | fix_at w58 | Swipe 2 |
| 7 | XMP من Intel وEXPO من AMD: بروفايلات جاهزة | B8 | T chip "تعريف" + X01 `keep` ram_tag "XMP / EXPO" (كاميرا case) | w48 | w57 | نص فقط بدون شعارات | Swipe grass 2 |
| 8 | فعّل اللي تدعمه رامك وبوردتك، واحفظ وأعد التشغيل | B10 | X01 `bios_xmp` fix_at "فعّل" (XMP / EXPO · 6000 أخضر) + T | w58 | w65 | E03(2) fix_at w58 | Selection 12 + Item pick up 4 |
| 9 | مكانه يختلف… مثلاً ASUS: Ai Tweaker ثم Ai Overclock Tuner | B10 | X01 `bios_xmp` nav (عنصر مصمَّم جديد) + T "مثال: في ASUS" | w66 | w78 | nav_times w73/w76 | Swipe 2 + ضغطات |
| 10 | الخطوة 3: ارجع لـ Task Manager وتأكد إن Speed نفس المكتوب | B12 | E03 (3) + X01 `settings_nav` + X01 `text` "6000" أخضر ring | w79 | w90 | fix_at w90 (كل النقاط خضراء) | Selection 12 + Item pick up 4 |
| 11 | انتبه: overclock، الاستقرار والضمان | B9 | T chip "تنبيه" أحمر + X01 `keep` ram_tag "overclock" أحمر (كاميرا case) | w91 | w103 | desc_at w96 | Error 5 |
| 12 | لو يعلّق أو يعيد التشغيل، رجّع للافتراضي | B9 | X01 `bios_xmp` fix_at w104 → revert_at "رجّع" (Default/4800) + T×2 | w104 | w113 | sfx:false | ضغطة |
| 13 | تابع تيربو… | B14 | E16 ثم E17 (تلقائي) | w114 | النهاية | | Notification 2 |

## عناصر مصمَّمة بنفس قواعد الحزمة (تعديل القالب)
- **شرائح الرام داخل الكيس** (اثنتين جنب مبرد المعالج، إضاءتها RGB مع الحالة) + **ملصق الرام** `X01 {mode:"keep", ram_tag, ram_tag_color}` (أسلوب `tag3d`، ما يغيّر الشاشة).
- **`bios_xmp` موسّع:** `fix_at` (التفعيل على كلمة)، `revert_at` (الرجوع للافتراضي)، `profile_off`، `path`، `nav`/`nav_times` (مسار قوائم BIOS)، `sub`، إطار أحمر/أخضر وسطر "F10 Save & Exit".
- **`spec_table`:** لون اختياري لكل صف (`[المفتاح، القيمة، "problem"|"fix"]`).
