# جدول المشاهد — 2026-11-28-02 · troubleshooting · الويندوز بطيء بعد التشغيل: برامج بدء التشغيل

- الحزمة: `14_desk_pc_red_green` · `camera.variant` = 2 (آخر الحلقات: 27-01 = 1، 25-02 = 0، 20-01 = 3) · الحلقة مفعّلة.
- الصوت: Charon (Gemini 3.8 flash TTS) — رصيد ElevenLabs ما يكفي (CLAUDE.md §٥). تطابق 0.888، المدة 57.2ث.
- أرقام الشاشة: "1 s" و"3MB" فقط (Microsoft). عمود Startup impact كلمات بس (High / Medium / Low). أسماء البرامج عامة نص فقط (Auto Updater، Cloud Sync، Game Launcher، Chat App)، بدون شعارات، لا ذوات أرواح، لا موسيقى.
- عناصر مقترحة في السكربت مو موجودة في القالب ← أقرب الموجود (مسجّلة مقترح للمدير): دائرة التحميل والنوافذ اللي تطلع لحالها ← X01 `text` "Loading" أحمر ينبض؛ نافذة Task Manager ← X01 `settings_nav` بعنوان Task Manager؛ عمود Startup impact ← X01 `spec_table`؛ قائمة الكليك يمين ← X01 `input_menu`؛ "Disabled ← Enable" ← X01 `text`. (وضع `startup` ما استُخدم لأن مفاتيحه تنطفي تلقائياً مع الوقت فيعطي معنى غلط وقت شرح المشكلة.)

| # | الوقت | النص | التصنيف | العنصر | البداية | النهاية | params | المؤثر |
|---|---|---|---|---|---|---|---|---|
| 1 | 0–1.9 | الويندوز ثقيل أول ما يشتغل؟ | B1 | E01 + X01 `text` "Loading" أحمر + E15 | 0 (فريم كامل) | w4 | hook "الويندوز !!ثقيل!! أول ما يشتغل؟" | Error 5 |
| 2 | 2.0–5.2 | من الأسباب: برامج تشتغل لحالها مع الويندوز. | B2 | X01 `spec_table` "Startup apps" (3 برامج Enabled أحمر) + T | w5 | w11 | cam monitor، desc_at w10 | — |
| 3 | 5.3–9.8 | وهذي ممكن تبطّئ الإقلاع، وتزيد الشغل في الخلفية. | B9 | X01 `text` "Boot" أحمر ينبض، sub "شغل في الخلفية" + T | w12 | w19 | cam wide، desc_at w16 | — |
| 4 | 10.1–15.0 | الخطوة 1: اضغط Ctrl + Shift + Esc، وافتح Startup apps. | B3/B10 | E03 index 1 (keys Ctrl/Shift/Esc) + X01 `desktop` ← X01 `settings_nav` Task Manager › Startup apps | w20 / w28 | w27 / w30 | key_times w23,w25,w27 · fix_at w29 · cam desk ← monitor | تلقائي (كيبورد + حل) |
| 5 | 15.8–19.0 | الخطوة 2: شوف عمود Startup impact. | B8 | E03 index 2 (عنوان "عمود Startup impact") + X01 `spec_table` "Startup impact" (High أحمر / Medium / Low) | w31 / w33 | w36 | fix_at w35 · cam wide ← monitor | تلقائي |
| 6 | 19.4–25.2 | High يعني … أكثر من ثانية من المعالج، أو أكثر من 3MB من القرص. | B4/B8 | X01 `spec_table` "High impact" (CPU time: More than 1 s · Disk usage: More than 3MB) + T | w37 | w51 | desc_at w41 | — |
| 7 | 25.2–30.5 | الخطوة 3: كليك يمين … واختر Disable. | B10 | E03 index 3 + X01 `input_menu` (Disable / Open file location / Search online) | w52 / w54 | w62 | pick_at = fix_at = w62 "Disable" | تلقائي (حل) |
| 8 | 30.5–37.2 | بس لا تعطّل برامج الحماية، ولا تعريفات القطع… | B9 | X01 `spec_table` "Keep enabled" (Security app) ← (Audio / Graphics / Touchpad driver) + T×2، الإضاءة حمراء | w63 / w68 | w67 / w75 | state problem · desc_at w72 | Error 5 (w64 "لا") |
| 9 | 37.3–40.9 | ومو متأكد من برنامج؟ كليك يمين، واختر Search online. | B5 | E15 + X01 `input_menu` (من Disable الأحمر إلى Search online ✓) + T | w76 | w84 | pick_at w83 · cam wide | — |
| 10 | 40.9–45.5 | والتعطيل بس يمنعه يشتغل لحاله، ولو احتجته رجّع Enable. | B10 | X01 `text` "Disabled" أحمر ← "Enable" أخضر + ring | w85 / w90 | w89 / w93 | state fix | — |
| 11 | 45.5–50.6 | ونفس القائمة تلقاها في Settings ثم Apps ثم Startup. | B5 | X01 `settings_nav` Settings › Apps › Startup + T | w94 | w102 | times w98,w100,w102 | Soft keyboard (w98) |
| 12 | 50.7–54.0 | بعدها أعد تشغيل الجهاز، وشوف الفرق. | B12 | X01 `off` ← `cursor_back` (حلقة خضراء ✓) + T | w103 / w105 | w104 / w108 | state fix · بدون أي رقم وقت | تلقائي |
| 13 | 54.1–57.2 | تابع تيربو عشان ما يفوتك الحل الجاي. | B14 | E16 ثم E17 (تلقائي) | w109 | w115 | — | Notification 2 (تلقائي) |
