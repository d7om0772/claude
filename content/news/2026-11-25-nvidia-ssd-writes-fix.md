# NVIDIA تصدر تعريف 621.40 يعالج الكتابة الزايدة على الـ SSD
- التاريخ المكتشف: 2026-11-25 · تاريخ الخبر: 2026-11-24 (621.40) · الدرجة: 7/10 (مشروطة بتحقق المدقق من ملاحظات NVIDIA الرسمية)

## الحقائق المؤكدة
| # | الحقيقة (جملة وحدة) | المصدر الرسمي (رابط + تاريخ) | مصدر مستقل (رابط + تاريخ) |
|---|---|---|---|
| 1 | تعريفا GeForce 621.14 و621.24 تسببا بكتابة مستمرة من NVDisplay.Container.exe على ملف السجل nvlog.nvlgstg | ملاحظات إصدار 621.40 (منقولة؛ لم تُفتح مباشرة، المدقق يفتحها) | [Tom's Hardware 2026-11-18](https://www.tomshardware.com/pc-components/gpu-drivers/nvidia-geforce-driver-bug-reportedly-hammers-ssds-with-up-to-30gb-of-writes-per-hour-users-trace-massive-idle-wear-to-background-service-newer-driver-reportedly-still-affected) · [TweakTown 2026-11-21](https://www.tweaktown.com/news/114808/nvidia-geforce-hotfix-driver-621-35-fixes-bug-that-can-noticeably-reduce-ssd-lifespans/index.html) |
| 2 | NVIDIA أصدرت هوتفكس 621.35 (تجريبي/اختياري) يوم 2026-11-20 مبني على 621.24 لمعالجتها | صفحة NVIDIA للهوتفكس: https://nvidia.custhelp.com/app/answers/detail/a_id/5940 (رجّعت 403، ما انفتحت) | [TweakTown 2026-11-21](https://www.tweaktown.com/news/114808/nvidia-geforce-hotfix-driver-621-35-fixes-bug-that-can-noticeably-reduce-ssd-lifespans/index.html) · [HelpDeskGeek](https://helpdeskgeek.com/nvidia-driver-hotfix-fails-excessive-ssd-writes/) |
| 3 | بعدها نزل تعريف Game Ready WHQL 621.40 وملاحظاته تذكر الإصلاح: "Excessive writes to file nvlog.nvlgstg may occur in background" (رقم الخلل 7116722) | ملاحظات إصدار 621.40 (منقولة، غير مفتوحة مباشرة) | [Wccftech 2026-11-24](https://wccftech.com/nvidia-driver-621-40-whql-fixes-excessive-ssd-writes/) · [Gamers Universe 2026-11-25](https://gamersuniverse.eu/en/nvidias-geforce-621-40-driver-finally-stops-the-ssd-hammering-bug) · عنوان PC Gamer 2026-11-24 |
| 4 | بعض المستخدمين لاحظوا رجوع الكتابة بعد هوتفكس 621.35 (تقارير مستخدمين) | — | [HelpDeskGeek](https://helpdeskgeek.com/nvidia-driver-hotfix-fails-excessive-ssd-writes/) · Wccftech |
| 5 | التحديث من تبويب Drivers في تطبيق NVIDIA أو صفحة التحميل الرسمية nvidia.com/en-us/geforce/drivers | https://www.nvidia.com/en-us/geforce/drivers/ | [Gamers Universe 2026-11-25](https://gamersuniverse.eu/en/nvidias-geforce-621-40-driver-finally-stops-the-ssd-hammering-bug) |

## غير مؤكد / لا تقوله
- رقم "30GB بالساعة" قياسات مستخدمين (تراوحت من أقل من 4 إلى 30GB) مو من NVIDIA؛ لا تقدمه كأمر مؤكد لكل الأجهزة.
- لا تقل إن الـ SSD "تلف/تآكل فعلياً": ما فيه تقارير موثقة عن تلف قياسي، وNVIDIA ما قدّرت العمر المفقود.
- لا تقل "الخلل انحل تماماً": ما فيه اختبار مستقل لـ 621.40؛ وبعض المعلقين يقولون بقايا كتابة قد تجي من FrameView/NVIDIA App.
- مصدر الإصلاح الرسمي (ملاحظات 621.40) منقول عن الصحافة؛ يلزم المدقق يفتحه. إن ما انفتح: ننزّل الدرجة ولا ننشر.
- تاريخ نزول 621.40 بالضبط غير محدد (ظهر في تغطية 24-25 نوفمبر).

## الزاوية للمشاهد السعودي
- أي مستخدم كرت GeForce (أغلب لاعبين الخليج) على 621.14 أو 621.24 ممكن يكون جهازه يكتب على الـ SSD وهو خامل. الحل: حدّث للتعريف الأحدث (تطبيق NVIDIA ← Drivers). لا يلزمه يشتري شي.

## اقتراح الشكل (حزمة 16_quick_explainer)
- سؤال الهوك (2–4 كلمات): تعريفك يأكل SSD؟ · الجواب بجملة: تعريفا 621.14 و621.24 كانا يكتبان على ملف سجل باستمرار، ونزل 621.40 يعالجه.
- العنصر البطل: SSD مرسوم (جماد) مع عدّاد كتابة · 3 عناصر: (1) التعريفان المتأثران 621.14/621.24 (2) الإصلاح 621.40 (3) طريقة التحديث من تطبيق NVIDIA
- رقم الختام بمصدره: 621.40 (NVIDIA، ملاحظات الإصدار) · كلمة الـ CTA: "حدّث"

## تأكيد رسمي (المشغّل، 2026-11-25 09:50 الرياض)
- ملاحظات الإصدار الرسمية فُتحت واستُخرج نصها: https://us.download.nvidia.com/Windows/621.40/621.40-geforce-win11-x64-release-notes.pdf — `RN-08399-621.40_v01 | November 24, 2026`، قسم **3.1.2 Fixed General Bugs**: "Excessive writes to file nvlog.nvlgstg may occur in background. [7116722]".
- مقال NVIDIA الرسمي اللي يعلن 621.40 WHQL: https://www.nvidia.com/en-us/geforce/news/warhammer-40000-dawn-of-war-4-geforce-rtx-spark-game-ready-driver/
- الملاحظات **ما تذكر** أرقام الكتابة ولا إصدارات التعريف المتأثرة — هذي من المصادر المستقلة فقط (تنقال "حسب تقارير").
