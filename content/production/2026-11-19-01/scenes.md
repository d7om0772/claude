# جدول المشاهد — 2026-11-19-01 (budget-builds · حزمة 15_iso_build_drop)

- **الصوت:** Charon (Gemini `gemini-3.8-flash-tts`) — موصل ElevenLabs ما اتصل (HTTP 400، مرتين). تطابق 0.911 مع الكابشن (بعد إضافة ALIASES)، caption_align 0.927، المدة 65.8ث (الختام 63.16ث).
- **الكاميرا:** `camera.variant: 2` (2026-11-16-01 كان 0). **`hook_ghosts: ["gpu"]`** — خانة الكرت تنبض أزرق من أول فريم (قبل باقي الأشباح) والكرت أول قطعة تنزل. بدون `ghost_parts`.
- **الكيس:** أبيض حسب الحزمة (`palette`: الكيس #F8FAFD)؛ جُرّب كيس كحلي داكن للنسخة السوداء لكنه أخفى القطع والأشباح، فـ"النسخة السوداء" مكتوبة في الوصف بس.
- **اللقطات الحقيقية:** ما فيه.

| # | النص | التصنيف | العنصر | البداية (كلمة) | النهاية | params | المؤثر |
|---|---|---|---|---|---|---|---|
| 1 | عندك 5000 ريال وتبي 1080p على إعدادات عالية؟ | B1 | E01 (+1080p على الشاشة) + شبح gpu ينبض | 0 | w7 عالية؟ | hook "عندك **5000** ريال؟"؛ goal 1080p | تلقائي (Item pick up 4) |
| 2 | القاعدة: الكرت أول. | B2/B15 | E03 + وصف الهوك | w8 القاعدة | w10 | desc "**الكرت أول**" عند w8 | Swipe grass 2 |
| 3 | كرت الشاشة ASUS Dual RX 9060 XT 16GB بـ 2,799 | B3+B4 | E07 gpu | w11 كرت | w21 | name بحجم sm، drop w13 ASUS، price 2799 عند w20، desc "قلب التجميعة" عند w21 → 2,201 | Swipe 2 + Lock + Coins 3 |
| 4 | يعني أكثر من نص الميزانية | B7 | E08 + T | w22 يعني | w26 | E08 "وين راحت الفلوس؟" الكرت 2799 / باقي القطع 2195؛ T "!!أكثر من نص!! الميزانية" + "2,799 من 5,000 ريال" | Swipe grass 2 + Selection 12 |
| 5 | المعالج Ryzen 5 5600 بـ 669 ومعه مبرد | B3+B4 | E09 + E04 cpu | w27 المعالج | w35 | drop w28، price 669 عند w32، desc "6 أنوية **+** مبرد" عند w34 → 1,532 | Swipe + Drop + Lock + Coins |
| 6 | الماذربورد ASUS PRIME A520M-R بـ 299 وتدعمه من أول BIOS | B3+B4+B8 | E04 mobo | w36 | w46 | drop w37، price 299 عند w41، desc "تدعم **5600** من أول BIOS" عند w43 → 1,233 | Swipe + Drop + Lock + Coins |
| 7 | الرام 16GB بـ 489 | B3+B4 | E04 ram | w47 | w51 | name "16GB (2×8GB) DDR4"، drop w48، price w50 → 744 | Swipe + Drop + Lock + Coins |
| 8 | التخزين Kingston NV3 500GB بـ 374 | B3+B4 | E04 ssd | w52 | w58 | drop w53، price w57 → 370 | Swipe + Drop + Lock + Coins |
| 9a | الباور Corsair CX650 بـ 226 | B3+B4 | E10 psu | w59 | w64 | drop w60، price w63 → 144 | Swipe + Lock + Coins |
| 9b | وASUS تنصح بـ 550W للكرت | B7 | E08 + T | w65 وASUS | w69 | E08 "باور الكرت": ASUS تنصح 550W / عندك 650W؛ T chip الباور "ASUS تنصح بـ **550W**" + "وعندك ++650W++" | Swipe grass 2 + Selection 12 |
| 10 | والكيس darkFlash A290 بـ 138 | B3+B4 | E11 | w70 | w75 | price 138 عند w74، desc "3 مراوح · النسخة السوداء" عند w72 → 6 | Swipe + Charging 2 + Coins |
| 11 | مجموع أسعار القطع 4,994 ريال، والباقي 6 | B12 | E12 | w76 | w82 | total 4994، "مجموع القطع **4,994** ريال"، **نص صغير غير منطوق:** "أسعار القطع من Amazon.sa بتاريخ 18 نوفمبر، بدون رسوم الشحن، وممكن تتغير"؛ الباقي 6 في العداد وقائمة الشاشة 4,994 / 5,000 | Notification 2 |
| 12a | على 1080p Ultra، God of War Ragnarök | B6 | E13 | w83 | w89 | fps 85 (بدون +)، chips Ultra + **تقريبي**، desc "1080p Ultra · تقريباً 85 FPS" | Charging 2 + Item pick up 4 |
| 12b | وThe Last of Us Part I، تقريباً 85 FPS | B6 | E13 | w90 | w98 | نفس الشي، العنوان "The Last of Us Part I" | Charging 2 + Item pick up 4 |
| 13 | وش الميزانية الجاية؟ اكتبها بالتعليقات | B14 | E14 | w99 | w103 | — | — |
| 14 | تابع تيربو عشان ما يفوتك الجاي | B14 | E15 (تلقائي) + الحلقة | 63.16ث | 65.76 | loop 64.76 (1ث) | Swipe 2 + Notification 2 |

**العداد:** 5,000 → 2,201 → 1,532 → 1,233 → 744 → 370 → 144 → 6.
**مؤثرات يدوية:** Coins 3 عند سعر كل قطعة من E04/E10/E11 (`sfx` في المسودة) — التلقائي يحطها لـ E05/E07 بس.

**تعديلات القالب في هذا الفيديو:**
- `studio/budget-builds/scene.js`: `hook_ghosts` (شبح خانة ينبض أقوى بومضة زرقاء من أول فريم لين تنزل القطعة)، و`size` في عناوين القطع (E04/E07/E10).
- `studio/common/base.css`: تمييز `**`/`!!`/`++` صار يشتغل في الوصف `.desc` (كان رمادي).
- `studio/common/core.js`: عزل LTR يشمل الحروف اللاتينية بعلامات (Ragnarök كانت تنقسم "köGod of War Ragnar").
- `studio/tools/transcribe.py`: ALIASES (bios، kingston، corsair، asus، w، ultra، darkflash) وتطبيع الحروف اللاتينية بعلامات.
