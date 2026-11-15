# جدول المشاهد — 2026-11-16-02 (shortcuts · حزمة 13_mini_desk_diorama)
الصوت: Charon (Gemini) — احتياطي لأن رصيد ElevenLabs ما يكفي (36 من 419 كريدت مطلوبة). المدة 39.1ث. `camera.variant` = 1 (أول فيديو في السلسلة).
هوك: `لا تقص.. صوّر **الجزء** بس` + `Win + Shift + S` (desc عند w2). الهيدر: "اختصارات ويندوز"، نقطتين.

| المقطع | النص | التصنيف | العنصر | البداية (كلمة) | النهاية | params | المؤثر |
|---|---|---|---|---|---|---|---|
| 1 | تصوّر الشاشة كاملة وبعدين تقصّها؟ | B1 خطاف | E01 (بدون رقم، بدون ساعة) + X01 `fullshot` (مصمَّم) | 0 / w1 (كاميرا screens) | w4.end | لقطة الشاشة كاملة + إطار قص متقطع يدور وينكمش ببطء | gs_item_pickup4، gs_selection12_fwd |
| 2 | فيه طريقة أسرع. | B11 توفير وقت | E02 الساعة الدوارة | w5 | w7.end | text "أسرع"، عنوان "فيه طريقة **أسرع**" | gs_watch_tick |
| 3 | اضغط Win + Shift + S مع بعض. | B2/B8 | E03 (label "الاختصار") + نبضة الكيبل | w8 | w15.end | keys Win/Shift/S على w9/w11/w13، desc "لقطة لجزء من الشاشة" w14، cam main | gs_soft_keyboard ×3، gs_swipe2 |
| 4–6 | يطلع لك شريط القص… اختار… اسحب… وخلاص | B6 خيارات + B10 | X01 `snip` (موسّع: شريط بـ 4 أشكال + زر فيديو، تظليل كل شكل مع نطقه + معاينة الشكل + اسم الشكل، السحب عند "اسحب" مع المؤشر، ومضة بيضاء عند الانتهاء) + T عناوين | w16 | w37.end | times = w23/w25/w28/w30، at = w32، cam left. T: "اختار **الشكل**" (w22)، "على **الجزء** اللي تبيه" (w32) | gs_selection12_fwd، gs_select_option11 ×4، gs_swipe_grass5، gs_notification2 |
| 7 | اللقطة تنحفظ في الحافظة على طول. | B2 نتيجة | X01 `clipboard` (موسّع: `thumb` = مصغّر اللقطة كأول عنصر) على الشاشة اليمين | w38 | w43.end | items Screenshot/Notes/Link، cam right، عنوان "تنحفظ في **الحافظة**" | gs_selection12_fwd |
| 8 | روح للمحادثة أو الملف، واضغط Ctrl + V. | B10 | X01 `chat` (مصمَّم: نافذة محادثة فقاعات نص فقط، بدون صور أو أفاتار؛ اللقطة تنلصق عند V) + E04 | w44 / w48 | w51.end | at = w51، عنوان chip "الصقها" + keys Ctrl/V (w49/w51) + desc "بالمحادثة أو الملف" | gs_soft_keyboard ×2، gs_item_pickup4 |
| 9 | ولو تبي تعدّل عليها أو تحفظها، تلقاها في Snipping Tool. | B5 أداة | X01 `snipapp` (مصمَّم: نافذة "Snipping Tool" نص فقط بدون شعار، أدوات مجردة، قلم يرسم دائرة، ثم "Saved") | w52 | w61.end | عنوان "Snipping Tool" + desc "عدّل عليها أو احفظها" w54، cam left | gs_selection12_fwd، gs_selection9_fwd |
| 10 | وبونص: Win + Shift + R يسجّل فيديو لجزء من الشاشة. | B3 (الثاني) | E03 index 2 label "بونص" + X01 `snip` `rec` (زر الفيديو أحمر، مستطيل بإطار أحمر ونقطة REC) | w62 / w67 | w72.end | keys Win/Shift/R على w63/w65/w67، desc w68، at w68 | gs_soft_keyboard ×3، gs_swipe2 |
| 11 | تابع تيربو عشان ما يفوتك الجاي. | B14 | E17 الختام (تلقائي) | closing 36.52 | 39.12 | — | gs_swipe2، gs_notification2 |

**عناصر مصمَّمة خارج الحزمة (بنفس قواعدها، مضافة لـ `studio/shortcuts/scene.js` كأوضاع X01):** `fullshot`، `chat`، `snipapp`، وتوسيع `snip` (`times`، `at`، `rec`) و`clipboard` (`thumb`). كلها أشكال مجردة وألوان palette، بدون ذوات أرواح أو شعارات.
