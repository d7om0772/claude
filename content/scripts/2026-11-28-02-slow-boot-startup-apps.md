---
id: 2026-11-28-02
publish_date: 2026-11-28
slot: "18:31"
series: troubleshooting
topic: "الويندوز بطيء بعد التشغيل: برامج بدء التشغيل"
status: سكربت
version: 1
target_length_s: 60
researched_at: 2026-11-27
---
# الويندوز **ثقيل** أول ما يشتغل؟

## الهوك
- **المرئي:** المشهد الواسع (E01) والإضاءة حمراء. على الشاشة سطح مكتب لسه يحمّل (دائرة تحميل)، وفوقه نوافذ برامج صغيرة تطلع لحالها وحدة ورا وحدة (أسماء عامة نص فقط، بدون شعارات)، وفوق الكيس "؟" حمراء (E15). الفريم الأول (للحلقة) = سطح المكتب مزحوم بالنوافذ + دائرة التحميل + العنوان مكتمل. المشكلة تنفهم بدون صوت: الجهاز اشتغل بس مزحوم وبطيء.
- **الكلام:** الويندوز ثقيل أول ما يشتغل؟
- **النص على الشاشة:** الويندوز **ثقيل** أول ما يشتغل؟ (5 كلمات، و"ثقيل" بالأحمر)

## نص الكابشن
الويندوز ثقيل أول ما يشتغل؟
من الأسباب: برامج تشتغل لحالها مع الويندوز.
وهذي ممكن تبطّئ الإقلاع، وتزيد الشغل في الخلفية.
الخطوة 1: اضغط Ctrl + Shift + Esc، وافتح Startup apps.
الخطوة 2: شوف عمود Startup impact.
High يعني البرنامج أخذ أكثر من ثانية من المعالج، أو أكثر من 3MB من القرص.
الخطوة 3: كليك يمين على البرنامج اللي ما تحتاجه، واختر Disable.
بس لا تعطّل برامج الحماية، ولا تعريفات القطع مثل الصوت والكرت والتاتش باد.
ومو متأكد من برنامج؟ كليك يمين، واختر Search online.
والتعطيل بس يمنعه يشتغل لحاله، ولو احتجته رجّع Enable.
ونفس القائمة تلقاها في Settings ثم Apps ثم Startup.
بعدها أعد تشغيل الجهاز، وشوف الفرق.
تابع تيربو عشان ما يفوتك الحل الجاي.

## نص التعليق الصوتي
الويندوز ثقيل أول ما يشتغل؟
من الأسباب: برامج تشتغل لحالها مع الويندوز.
وهذي ممكن تبطّئ الإقلاع، وتزيد الشغل في الخلفية.
الخطوة واحد: اضغط Control و Shift و Escape، وافتح Startup apps.
الخطوة ثنين: شوف عمود Startup impact.
High يعني البرنامج أخذ أكثر من ثانية من المعالج، أو أكثر من ثلاث ميقابايت من القرص.
الخطوة ثلاث: كليك يمين على البرنامج اللي ما تحتاجه، واختر Disable.
بس لا تعطّل برامج الحماية، ولا تعريفات القطع مثل الصوت والكرت والتاتش باد.
ومو متأكد من برنامج؟ كليك يمين، واختر Search online.
والتعطيل بس يمنعه يشتغل لحاله، ولو احتجته رجّع Enable.
ونفس القائمة تلقاها في Settings ثم Apps ثم Startup.
بعدها أعد تشغيل الجهاز، وشوف الفرق.
تابع تيربو عشان ما يفوتك الحل الجاي.

## الادعاءات والمراجع
| # | الادعاء (كما في الكابشن) | المصدر | الرابط | تاريخ الوصول / التسعير |
|---|---|---|---|---|
| 1 | "من الأسباب: برامج تشتغل لحالها مع الويندوز." + "ممكن تبطّئ الإقلاع، وتزيد الشغل في الخلفية." | Microsoft Support — Tips to improve PC performance in Windows، "Solution 5. Disable startup apps to reduce the background activity": "Apps that run at startup can slow boot time and increase background usage." + "Disable apps you do not need to start automatically." (وصفحة Configure startup applications: startup apps "can impact both the speed of your startup and the overall performance of your system") | https://support.microsoft.com/en-us/windows/tips-to-improve-pc-performance-in-windows-b3b3ef5b-5953-fb6a-2528-4bbed82fba96 | 2026-11-27 |
| 2 | "اضغط Ctrl + Shift + Esc، وافتح Startup apps" | نفس الصفحة (#1): "Open Task Manager by pressing Ctrl + Shift + Esc." ثم "Select Startup apps from the left-hand menu." | https://support.microsoft.com/en-us/windows/tips-to-improve-pc-performance-in-windows-b3b3ef5b-5953-fb6a-2528-4bbed82fba96 | 2026-11-27 |
| 3 | "شوف عمود Startup impact" | Microsoft Support — Configure startup applications in Windows، قسم Task Manager: القائمة في Task Manager نفس اللي في Settings بس أفصل، وفيها "startup impact" لكل برنامج عشان تساعد في حل بطء الإقلاع، والتقييمات: None / Not Measured / Low / Medium / High. | https://support.microsoft.com/en-us/windows/configure-startup-applications-in-windows-115a420a-0bff-4a6f-90e0-1934c844e473 | 2026-11-27 |
| 4 | "High يعني البرنامج أخذ أكثر من ثانية من المعالج، أو أكثر من 3MB من القرص." | نفس الصفحة (#3): التقييم "Based on CPU time and disk usage"، وHigh Impact: "Total CPU usage takes more than 1 second or total disk usage is more than 3 megabytes." | https://support.microsoft.com/en-us/windows/configure-startup-applications-in-windows-115a420a-0bff-4a6f-90e0-1934c844e473 | 2026-11-27 |
| 5 | "كليك يمين على البرنامج اللي ما تحتاجه، واختر Disable." | صفحة Tips (#1): "Right-click the apps you want to disable, and then select Disable." + "Disable apps you do not need to start automatically." | https://support.microsoft.com/en-us/windows/tips-to-improve-pc-performance-in-windows-b3b3ef5b-5953-fb6a-2528-4bbed82fba96 | 2026-11-27 |
| 6 | "لا تعطّل برامج الحماية، ولا تعريفات القطع مثل الصوت والكرت والتاتش باد." | How-To Geek — How to Disable Startup Programs in Windows (Nick Lewis، محدّث 2026-11-11): ما تعطّل "Antivirus or security software" ولا "Hardware drivers and companion utilities (audio, graphics, touchpad, or mouse drivers)". | https://www.howtogeek.com/74523/how-to-disable-startup-programs-in-windows | 2026-11-27 |
| 7 | "مو متأكد من برنامج؟ كليك يمين، واختر Search online." | نفس مقال How-To Geek (#6): لو مو متأكد من برنامج، استخدم قائمة الكليك يمين في Task Manager: "Open file location" أو "Search online" قبل ما تعطّله. | https://www.howtogeek.com/74523/how-to-disable-startup-programs-in-windows | 2026-11-27 |
| 8 | "التعطيل بس يمنعه يشتغل لحاله، ولو احتجته رجّع Enable." | صفحة Configure (#3): "Select Disable to prevent the app from starting automatically." وفي Task Manager "Enable or Disable" لكل برنامج (وSettings: "Set the toggle to Off to prevent the app from starting automatically"). | https://support.microsoft.com/en-us/windows/configure-startup-applications-in-windows-115a420a-0bff-4a6f-90e0-1934c844e473 | 2026-11-27 |
| 9 | "نفس القائمة تلقاها في Settings ثم Apps ثم Startup." | صفحة Configure (#3): "Select Start > Settings > Apps > Startup." | https://support.microsoft.com/en-us/windows/configure-startup-applications-in-windows-115a420a-0bff-4a6f-90e0-1934c844e473 | 2026-11-27 |

**ملاحظات:**
- "من الأسباب" و"ممكن" مقصودة: Microsoft تقول "can slow"، مو إنها السبب الوحيد أو الأكيد.
- "أعد تشغيل الجهاز، وشوف الفرق" نصيحة عامة بدون رقم: ما ذكرت كم ثانية بيتحسن الإقلاع لأن ما فيه مصدر برقم.
- **حذفت:** "التعطيل ما يحذف البرنامج" بالحرف — How-To Geek يقولها عن اختصارات مجلد Startup بس، فاكتفيت بصيغة Microsoft "يمنعه يشتغل لحاله". وحذفت مجلد `shell:startup` وTask Scheduler (مصادرها مواقع ثانوية، وتطوّل الفيديو).

## كابشن المنشور
الويندوز ثقيل أول ما يشتغل؟ افتح Ctrl + Shift + Esc ثم Startup apps، وعطّل اللي ما تحتاجه يشتغل لحاله.
لا تعطّل برامج الحماية ولا التعريفات. (الخطوات من Microsoft Support الرسمي)

## الهاشتاقات
#تيربو #مشاكل_الكمبيوتر #ويندوز11 #كمبيوتر #PC #Windows11 #تسريع_الجهاز #تقنية

## ملاحظات لصانع الفيديو
- `header.label` = "المشاكل وحلولها" · `header.dots` = 3 · `initial_state` = "problem" · `hook.title.main` = "الويندوز !!ثقيل!! أول ما يشتغل؟" · **`camera.variant` = 2** (آخر troubleshooting: 27-01 = 1، 25-02 = 0، 20-01 = 3، 18-01 = 2 — الأقدم).
- **تنويع:** البطل هنا **الشاشة نفسها** (قائمة البرامج وعمود التأثير) والكيس بإضاءته. لا تستخدم `temps_limit` ولا `bios_xmp` ولا `display_settings` ولا `ping`، ولا ظهر الكيس.
- **أسماء البرامج في القائمة عامة نص فقط** (مثل "تحديث تلقائي"، "مزامنة ملفات"، "مشغّل ألعاب"، "دردشة"، "برنامج الحماية"، "تعريف الصوت") — **بدون أسماء أو شعارات تجارية**، وبدون أيقونات فيها وجوه أو كائنات حية. نافذة Task Manager نص فقط بدون شعار Windows.
- **أرقام الشاشة المسموحة بس:** "1 ثانية" و"3MB" (من Microsoft). عمود Startup impact يعرض كلمات (High / Medium / Low) بدون أرقام ثواني للإقلاع.

| # | الجملة | العنصر المقترح |
|---|---|---|
| 1 | الويندوز ثقيل أول ما يشتغل؟ | E01 + X01 `desktop` بدائرة تحميل، ونوافذ صغيرة تطلع لحالها (`startup` مختصر)، E15 "؟" فوق الكيس، Error 5 |
| 2 | من الأسباب: برامج تشتغل لحالها مع الويندوز. | X01 `startup` `apps` (أسماء عامة) تنزل وحدة ورا وحدة مع "لحالها"، كاميرا `monitor` |
| 3 | وهذي ممكن تبطّئ الإقلاع، وتزيد الشغل في الخلفية. | X01 `text` "Boot" بشريط تقدم بطيء أحمر، و`sub` "شغل في الخلفية"، والكيس يومض أحمر (`cam:"wide"`) |
| 4 | الخطوة 1: اضغط Ctrl + Shift + Esc، وافتح Startup apps. | E03 `index:1` `keys:["Ctrl","Shift","Esc"]` `key_times` على "Control" و"Shift" و"Escape"، ثم نافذة "Task Manager" بتبويب "Startup apps" يتظلل (X01 `startup`)، `fix_at` = "Startup" |
| 5 | الخطوة 2: شوف عمود Startup impact. | E03 `index:2` + X01 `startup` بعمود "Startup impact" يتظلل بالأزرق (High / Medium / Low)، `cam:"monitor"` |
| 6 | High يعني البرنامج أخذ أكثر من ثانية من المعالج، أو أكثر من 3MB من القرص. | X01 `spec_table` rows `[["High","",  "problem"],["CPU","أكثر من 1 ثانية","problem"],["Disk","أكثر من 3MB","problem"]]` (اكتبها بالكلام، بدون رمز > ) |
| 7 | الخطوة 3: كليك يمين على البرنامج اللي ما تحتاجه، واختر Disable. | E03 `index:3`، ثم X01 `input_menu` `items:["Disable","Open file location","Search online"]` `pick_at` = "Disable"، وسطر البرنامج يصير "Disabled" ويقلب أخضر (`fix_at` = "Disable") |
| 8 | بس لا تعطّل برامج الحماية، ولا تعريفات القطع مثل الصوت والكرت والتاتش باد. | X01 `spec_table` rows `[["برنامج الحماية","خلّه شغال","fix"],["تعريف الصوت","خلّه شغال","fix"],["تعريف الكرت","خلّه شغال","fix"],["التاتش باد","خلّه شغال","fix"]]`، بدون شعار أي برنامج حماية |
| 9 | ومو متأكد من برنامج؟ كليك يمين، واختر Search online. | X01 `input_menu` نفس القائمة، `pick_at` = "Search" ، ثم E15 "؟" صغيرة تختفي |
| 10 | والتعطيل بس يمنعه يشتغل لحاله، ولو احتجته رجّع Enable. | X01 `startup`: نفس السطر يرجع "Enabled" بنبضة زرقاء مع "Enable" (عرض إن الخطوة ترجع) |
| 11 | ونفس القائمة تلقاها في Settings ثم Apps ثم Startup. | X01 `settings_nav` `items:["Settings","Apps","Startup"]` `times` على كل كلمة |
| 12 | بعدها أعد تشغيل الجهاز، وشوف الفرق. | X01 `off` قصير ثم `desktop` نظيف بدون نوافذ زايدة، الإضاءة تقلب خضراء ✓ (بدون أي رقم وقت) |
| 13 | تابع تيربو عشان ما يفوتك الحل الجاي. | E16 ثم E17 (تلقائي)، Notification 2 |

- نصوص الواجهة بخط Inter: Task Manager، Startup apps، Startup impact، High، Medium، Low، Disable، Enable، Search online، Settings، Apps، Startup، CPU، Disk، 3MB.
- لا ذوات أرواح: كل الفعل بحركة المؤشر (سهم عادي، مو كف) والقوائم نفسها.
- **الطول:** ≈ 118 كلمة في التعليق ← ≈ 58–62ث مع الختام (ضمن ≤ 65ث). لو طلع أطول من 65ث: اقصص الجملة 11 (Settings) في النسختين.
