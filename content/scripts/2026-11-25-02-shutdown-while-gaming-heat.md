---
id: 2026-11-25-02
publish_date: 2026-11-25
slot: "18:06"
series: troubleshooting
topic: الجهاز يطفي فجأة وقت اللعب: الحرارة
status: سكربت
version: 1
target_length_s: 62
researched_at: 2026-11-24
---
# جهازك يطفي وسط **اللعب؟**

## الهوك
- **المرئي:** المشهد الواسع (E01): على الشاشة لعبة شغالة (X01 `stutter`) وفجأة تنطفي سوداء (X01 `off`) مع مؤثر Error 5، وإضاءة RGB في الكيس تقلب حمراء، وفوق الكيس "؟" حمراء (E15). الفريم الأول (للحلقة) = الشاشة السوداء + الإضاءة الحمراء + العنوان مكتمل. المشكلة تنفهم بدون صوت: لعبة شغالة ثم الشاشة سوداء.
- **الكلام:** جهازك يطفي فجأة وسط اللعب؟
- **النص على الشاشة:** جهازك يطفي وسط اللعب؟ (4 كلمات)

## نص الكابشن
جهازك يطفي فجأة وسط اللعب؟
من أشهر الأسباب: الحرارة.
المعالج لما يسخن زيادة، يخفف سرعته عشان يبرد.
ولو ما كفى، يطفي الجهاز عشان يحمي نفسه.
الخطوة 1: تأكد إنها الحرارة.
افتح Task Manager، ثم Performance، ثم GPU، وتلقى حرارة كرت الشاشة.
وللمعالج، استخدم برنامج مراقبة يدعم معالجك.
العب شوي وراقب: لو الحرارة توصل حد الشركة المصنّعة قبل ما يطفي، غالباً هي السبب.
الخطوة 2: طفّ الجهاز وافصل الكهرباء.
ونظّف الغبار من الفتحات والمراوح بهواء مضغوط، مو بالمكنسة.
وتأكد إن مروحة المعالج تدور، وما فيه شي يوقفها.
الخطوة 3: خل الهواء يمشي.
خل مسافة قدام الكيس ووراه، وأبعد الكيابل عن طريق الهواء.
للمتقدم بس: لو الحرارة لسه ترتفع، يمكن المعجون الحراري يحتاج تغيير، وهذا يعني فك المبرد.
ولو الحرارة طبيعية والجهاز لسه يطفي، فالسبب غالباً شي ثاني.
تابع تيربو عشان ما يفوتك الحل الجاي.

## نص التعليق الصوتي
جهازك يطفي فجأة وسط اللعب؟
من أشهر الأسباب: الحرارة.
المعالج لما يسخن زيادة، يخفف سرعته عشان يبرد.
ولو ما كفى، يطفي الجهاز عشان يحمي نفسه.
الخطوة واحد: تأكد إنها الحرارة.
افتح Task Manager، ثم Performance، ثم GPU، وتلقى حرارة كرت الشاشة.
وللمعالج، استخدم برنامج مراقبة يدعم معالجك.
العب شوي وراقب: لو الحرارة توصل حد الشركة المصنّعة قبل ما يطفي، غالباً هي السبب.
الخطوة ثنين: طفّ الجهاز وافصل الكهرباء.
ونظّف الغبار من الفتحات والمراوح بهواء مضغوط، مو بالمكنسة.
وتأكد إن مروحة المعالج تدور، وما فيه شي يوقفها.
الخطوة ثلاث: خل الهواء يمشي.
خل مسافة قدام الكيس ووراه، وأبعد الكيابل عن طريق الهواء.
للمتقدم بس: لو الحرارة لسه ترتفع، يمكن المعجون الحراري يحتاج تغيير، وهذا يعني فك المبرد.
ولو الحرارة طبيعية والجهاز لسه يطفي، فالسبب غالباً شي ثاني.
تابع تيربو عشان ما يفوتك الحل الجاي.

## الادعاءات والمراجع
| # | الادعاء (كما في الكابشن) | المصدر | الرابط | تاريخ الوصول / التسعير |
|---|---|---|---|---|
| 1 | الطفي المفاجئ من أعراض الحرارة (Dell: "Computer locks up, stops responding, reboots randomly, or shuts down unexpectedly… These are the typical symptoms of overheating" — Intel: "System boots up but shuts down automatically after a short period of time") | Dell Support KB 000130867 + Intel Support 000005791 | https://www.dell.com/support/kbdoc/en-us/000130867 | 2026-11-24 |
| 1ب | (نفس الادعاء — Intel) | Intel — Overheating Symptoms and Troubleshooting for Intel Boxed Processors | https://www.intel.com/content/www/us/en/support/articles/000005791/processors/intel-core-processors.html | 2026-11-24 |
| 2 | المعالج يخفف سرعته ثم يطفي ليحمي نفسه ("Processors have two modes of thermal protection, throttling and automatic shutdown" — "When a core exceeds the set throttle temperature, it will reduce power to maintain a safe temperature level" — ولو ما كفى "will automatically shut down to prevent permanent damage") | Intel Support 000005597 | https://www.intel.com/content/www/us/en/support/articles/000005597/processors.html | 2026-11-24 |
| 3 | Task Manager ← Performance ← GPU يعرض حرارة كرت الشاشة المنفصل (Microsoft: "If you have a dedicated GPU card, we will now bubble up the current temperature" بجنب اسمه في Performance) — وفي Windows 11: "The temperature is displayed at the bottom of the GPU page" | Microsoft — Windows Insider Blog (Build 18963) + How-To Geek (محدّث 2023-11-08) | https://blogs.windows.com/windows-insider/2019/08/16/announcing-windows-10-insider-preview-build-18963/ | 2026-11-24 |
| 3ب | (تأكيد مستقل لخطوات Windows 11) | How-To Geek — How to Monitor Your Computer's GPU Temperature | https://www.howtogeek.com/784198/how-to-monitor-your-computers-gpu-temperature/ | 2026-11-24 |
| 4 | للمعالج برنامج مراقبة يدعم معالجك ("many third-party utilities can monitor the digital thermal sensor (DTS)" + "contact the software vendor to ensure the software is validated to work with your processor") | Intel Support 000005597 + 000005791 | https://www.intel.com/content/www/us/en/support/articles/000005597/processors.html | 2026-11-24 |
| 5 | حد الشركة المصنّعة ("Tjunction max is the maximum thermal junction temperature that a processor will allow… varies per product" — ويُعرف من صفحة مواصفات المعالج: "Max Operating Temperature, Tjunction, or Tcase") — صياغة عامة بدون رقم | Intel Support 000005597 | https://www.intel.com/content/www/us/en/support/articles/000005597/processors.html | 2026-11-24 |
| 6 | طفّ الجهاز وافصل الكهرباء قبل التنظيف ("Turn off your computer and unplug the power cable from both the computer and wall outlet before cleaning") | Dell Support KB 000124077 | https://www.dell.com/support/kbdoc/en-us/000124077/general-maintenance-for-dell-computers | 2026-11-24 |
| 7 | نظّف الفتحات والمراوح بهواء مضغوط مو بالمكنسة ("Use compressed air to blow dust out of vents" — "Dust and debris can clog air vents and fan blades, causing overheating" — "don't use a vacuum or blower, they create static") + Intel: "excessive build-up of dust… on all the fans" و"intake vents and exhaust vents are clear of dust" | Dell KB 000124077 + Intel 000005791 | https://www.dell.com/support/kbdoc/en-us/000124077/general-maintenance-for-dell-computers | 2026-11-24 |
| 8 | تأكد إن مروحة المعالج تدور وما فيه شي يوقفها ("Check to see that the processor's fan is still operating" — "Verify CPU fan impeller isn't blocked and nothing is preventing it from spinning") | Intel 000005791 | https://www.intel.com/content/www/us/en/support/articles/000005791/processors/intel-core-processors.html | 2026-11-24 |
| 9 | مسافة قدام الكيس ووراه ("Provide sufficient clearance at the front and back of the computer") | Dell Support KB 000179087 | https://www.dell.com/support/kbdoc/en-us/000179087/how-to-troubleshoot-fan-issues | 2026-11-24 |
| 10 | أبعد الكيابل عن طريق الهواء ("Verify system cabling or other components aren't obstructing system air flow") | Intel 000005791 | https://www.intel.com/content/www/us/en/support/articles/000005791/processors/intel-core-processors.html | 2026-11-24 |
| 11 | المعجون الحراري للمتقدم: لو الحرارة ترتفع ممكن يحتاج تغيير، ويرتبط بفك المبرد (Intel: إعادة المعجون "if you find your CPU temperatures are climbing"، و"you shouldn't need to reapply more than once every few years"، و"you should replace your paste if you remove your cooler for any reason") + Intel 000005791: "Inspect for CPU heatsink thermal interface material (TIM) degradation" | Intel — How to Apply Thermal Paste + Intel 000005791 | https://www.intel.com/content/www/us/en/gaming/resources/how-to-apply-thermal-paste.html | 2026-11-24 |
| 12 | لو الحرارة طبيعية والجهاز يطفي، السبب غالباً شي ثاني | استنتاج منطقي من الجملة 8 (بدون ادعاء سبب محدد) — Intel 000005791 نفسها تحيل لمصنّع البوردة لو المشكلة ما انحلت | https://www.intel.com/content/www/us/en/support/articles/000005791/processors/intel-core-processors.html | 2026-11-24 |

**ملاحظات البحث والحذف:**
- **ما فيه أي رقم حرارة على الشاشة ولا في الكلام.** Intel تقول الحد "varies per product and usually is between 100°C-110°C" لمعالجاتها فقط، فما عممته. حاولت أجيب مثال رسمي من صفحة AMD (Ryzen 5 7600 / 7700X) والموقع رجّع 503، فحذفت المثال وخليت الصياغة "حد الشركة المصنّعة".
- **حذفت** "مسك المروحة وقت النفخ عشان ما تلف بسرعة" (مصادرها مواقع غير رسمية، وصفحة Kingston رجّعت 403).
- **حذفت** "لا تفتح الباور لتنظيفه" (ظهر في ملخص بحث منسوب لـ Dell بس ما لقيته في الصفحات اللي فتحتها).
- **حذفت** ذكر أسماء برامج مراقبة المعالج (ما فيه صفحة رسمية فتحتها؛ صفحات AMD 503). الصياغة عامة: "برنامج مراقبة يدعم معالجك" حسب نص Intel.
- **ما قلت إن Task Manager يعرض حرارة المعالج** — ما لقيت مصدر رسمي. حرارة الـ GPU فقط ولكرت منفصل (Microsoft: "dedicated GPU card"). الكابشن ما ذكر "منفصل" للاختصار؛ صانع الفيديو يكتب تحت الشاشة سطر صغير "كرت شاشة منفصل".
- **ما فيه خطوات خطيرة:** ما فيه فك قطع للمبتدئ، والمعجون موسوم "للمتقدم بس". ما فيه نفخ بالفم ولا مكنسة.
- لا أسعار ولا FPS، فما فيه `approx`.
- **تكرار:** ما فيه موضوع حرارة/طفي في published.md ولا في سكربتات troubleshooting السابقة (16-03 كيبل الشاشة، 18-01 Hz، 20-01 XMP). فيديو 25-01 (نفس اليوم) عن اختصار Ctrl + Shift + Esc؛ هنا Task Manager أداة مراقبة مو موضوع الفيديو، وما ذكرت الاختصار عشان ما يتكرر.

## كابشن المنشور
جهازك يطفي فجأة وسط اللعب؟ من أشهر الأسباب الحرارة.
تأكد أول: Task Manager ← Performance ← GPU يوريك حرارة كرت الشاشة.
والحل الآمن: طفّ وافصل الكهرباء، نظّف الغبار بهواء مضغوط، وخل الهواء يمشي حول الكيس.

## الهاشتاقات
#تيربو #كمبيوتر #PC #قيمنق #مشاكل_الكمبيوتر #حرارة_المعالج #techtips

## ملاحظات لصانع الفيديو
- `header.label` = "المشاكل وحلولها" · `header.dots` = 3 · `initial_state` = "problem" · `hook.title.main` = "جهازك يطفي وسط !!اللعب؟!!" · اقتراح **`camera.variant` = 0** (آخر troubleshooting: 18-01 = 2، 20-01 = 3؛ و16-03 = 1).
- **تنويع:** البطل هنا **الكيس من فوق (`caseTop`) والمراوح** + شاشة `temps`. لا تستخدم `bios_xmp` ولا `display_settings` ولا E08.
- **لا أرقام حرارة** في `X01 temps`: استخدم أشرطة/مؤشرات بدون أرقام، أو كلمة "حد الشركة" كخط أحمر على المقياس. أي رقم يظهر = رفض من المدقق.

| # | الجملة | العنصر المقترح |
|---|---|---|
| 1 | جهازك يطفي فجأة وسط اللعب؟ | E01 + X01 `stutter` ← `off` (Error 5)، الإضاءة حمراء، E15 "؟" فوق الكيس |
| 2 | من أشهر الأسباب: الحرارة. | كاميرا `caseTop`، T chip "السبب" + main "الحرارة" أحمر |
| 3 | المعالج لما يسخن زيادة، يخفف سرعته عشان يبرد. | X01 `text` "Throttling" أحمر `sub` "يخفف سرعته" |
| 4 | ولو ما كفى، يطفي الجهاز عشان يحمي نفسه. | X01 `off` (`sfx:false`)، كاميرا `wide` |
| 5 | الخطوة 1: تأكد إنها الحرارة. | E03 index 1 (أحمر) |
| 6 | افتح Task Manager، ثم Performance، ثم GPU، وتلقى حرارة كرت الشاشة. | X01 `settings_nav` items ["Task Manager","Performance","GPU"] مع كلماتها، ثم سطر "GPU Temperature" بدون رقم، و`sub` "كرت شاشة منفصل". كاميرا `monitor` |
| 7 | وللمعالج، استخدم برنامج مراقبة يدعم معالجك. | X01 `temps` items [["CPU","",""],["GPU","",""]] بأشرطة بدون أرقام |
| 8 | العب شوي وراقب: لو الحرارة توصل حد الشركة المصنّعة قبل ما يطفي، غالباً هي السبب. | X01 `temps`: الشريط يطلع لخط أحمر مكتوب عليه "حد الشركة المصنّعة"، `ring` |
| 9 | الخطوة 2: طفّ الجهاز وافصل الكهرباء. | E03 index 2 + X01 `off`، كاميرا `case` (كيبل الكهرباء ورا الكيس ينفصل — عنصر مصمَّم بنفس أسلوب E08) |
| 10 | ونظّف الغبار من الفتحات والمراوح بهواء مضغوط، مو بالمكنسة. | كاميرا `caseTop`: غيمة غبار رمادية على المروحة تتلاشى (عنصر مصمَّم، جماد فقط بدون أيادي)، Swipe 2. `fix_at` = "مضغوط" |
| 11 | وتأكد إن مروحة المعالج تدور، وما فيه شي يوقفها. | المروحة تلف بإضاءة خضراء + ✓ |
| 12 | الخطوة 3: خل الهواء يمشي. | E03 index 3، كاميرا `wide` |
| 13 | خل مسافة قدام الكيس ووراه، وأبعد الكيابل عن طريق الهواء. | أسهم هواء زرقاء تدخل من قدام وتطلع من ورا الكيس (عنصر مصمَّم)، `fix_at` = "الهواء"، الإضاءة خضراء |
| 14 | للمتقدم بس: لو الحرارة لسه ترتفع، يمكن المعجون الحراري يحتاج تغيير، وهذا يعني فك المبرد. | T chip "للمتقدم" `chip_color` أحمر + main "المعجون الحراري" + desc "يحتاج فك المبرد" (B9) |
| 15 | ولو الحرارة طبيعية والجهاز لسه يطفي، فالسبب غالباً شي ثاني. | E15 "؟" فوق الكيس، الإضاءة محايدة (بدون Error) |
| 16 | تابع تيربو عشان ما يفوتك الحل الجاي. | E16 ثم E17 (تلقائي)، Notification 2 |

- نصوص الواجهة بخط Inter بالإنجليزي: Task Manager، Performance، GPU، CPU، Throttling. بدون شعارات Intel/Microsoft/Dell/Windows.
- لا ذوات أرواح: التنظيف يتمثّل بحركة الغبار نفسه وعلبة الهواء جماد، بدون يد.
