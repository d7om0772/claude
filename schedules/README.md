# المهام المجدولة — تيربو

كل الأوقات بتوقيت الرياض (`Asia/Riyadh`)، مزاحة دقايق عن رأس الساعة. **كل مهمة تبدأ بالتوفير** (مهارة `lean-scheduled-runs` + بوابة الميزانية في [lean.md](lean.md)). برومبت كل مهمة قصير وثابت؛ الشغل الفعلي في ملف المهمة، فالمدير يعدّل الشغل بتعديل الملف بدون ما يلمس المهمة.

| المهمة | الموعد | cron | البرومبت | الملف |
|---|---|---|---|---|
| `write` الكتابة | يومياً 8:05م | `CRON_TZ=Asia/Riyadh 5 20 * * *` | اقرأ `CLAUDE.md` ثم نفّذ `schedules/write.md` كاملاً. | [write.md](write.md) |
| `produce` الإنتاج | يومياً 1:35ص | `CRON_TZ=Asia/Riyadh 35 1 * * *` | اقرأ `CLAUDE.md` ثم نفّذ `schedules/produce.md` كاملاً. | [produce.md](produce.md) |
| `publish` النشر | يومياً 7:05ص | `CRON_TZ=Asia/Riyadh 5 7 * * *` | اقرأ `CLAUDE.md` ثم نفّذ `schedules/publish.md` كاملاً. | [publish.md](publish.md) |
| `analyze` التحليل | السبت 7:35ص | `CRON_TZ=Asia/Riyadh 35 7 * * 6` | اقرأ `CLAUDE.md` ثم نفّذ `schedules/analyze.md` كاملاً. | [analyze.md](analyze.md) |
| `news` الأخبار | يومياً 9:35ص | `CRON_TZ=Asia/Riyadh 35 9 * * *` | اقرأ `CLAUDE.md` ثم نفّذ `schedules/news.md` كاملاً. | [news.md](news.md) |
| `rescue` الإنقاذ | يومياً 12:15ظ | `CRON_TZ=Asia/Riyadh 15 12 * * *` | اقرأ `CLAUDE.md` ثم نفّذ `schedules/rescue.md` كاملاً. | [rescue.md](rescue.md) |
| `ideas` المفكر | يومياً 3:47العصر | `CRON_TZ=Asia/Riyadh 47 15 * * *` | اقرأ `CLAUDE.md` ثم نفّذ `schedules/ideas.md` كاملاً. | [ideas.md](ideas.md) |

**وين تشتغل:** كل المهام تنطلق في **جلسة المشغّل** الدائمة:
**"تيربو · المشغّل (المهام المجدولة)"** — `session_01HkQMRN3rFeQBfXgPbeFuEj` (بيئة `video`، المستودع `d7om0772/claude` على `main` مع صلاحية الدفع عليه، وكل الموصلات: Schedulin، Cloudinary، ElevenLabs، pexels، tiktok scraper).
- **لا تأرشف هذه الجلسة ولا تحذفها** — المهام مربوطة فيها. ممكن تفتحها وتشوف وش صار في كل تشغيل.
- كل تشغيل يكمل في نفس المحادثة (السياق يتلخص تلقائياً لما يكبر)، والحاوية تنبني من جديد لو انتهت (المستودع + سكربت إعداد البيئة).
- لو تشغيل جا والجلسة مشغولة بالتشغيل اللي قبله، ينتظر لين يخلص.

**ليش مو "جلسة جديدة كل مرة"؟** أداة الجدولة في هذا الحساب تنشئ المهام الجديدة كل مرة **بدون مستودع وبدون موصلات** (ما تقبل `connectors`)، فكانت بتشتغل بدون Schedulin ولا Cloudinary. الربط بجلسة فيها كل شي يحل المشكلة. لو صار ممكن لاحقاً تنشئها من claude.ai/code/routines مع المستودع والموصلات، احذف هذي واستخدم تلك.

## الحالة
| المهمة | المعرّف (`trig_...`) | أنشئت | أول تشغيل (الرياض) |
|---|---|---|---|
| write | `trig_01DkBdhe365r5mVALNjhwhZQ` | ✅ 2026-11-15 | 2026-11-15 8:05م |
| produce | `trig_018tWLxr5rzjK4wNotb9G1Vh` | ✅ 2026-11-15 | 2026-11-16 1:35ص |
| publish | `trig_01F1cLs88FbqRCBxrEggjeAF` | ✅ 2026-11-15 | 2026-11-16 7:05ص |
| analyze | `trig_01EAcBNY5JNUn9apaknx8Lsu` | ✅ 2026-11-15 | 2026-11-21 7:35ص (السبت) |
| news | `trig_01GAyN7mHXdSXAFmQ6DrAKQL` | ✅ 2026-11-18 | 2026-11-19 9:35ص |
| rescue | `trig_011fPGcosDnebZi1n77JMhRT` | ✅ 2026-11-15 | 2026-11-16 12:15ظ |
| ideas | `trig_01P5wNRwtG8ieEFX1H6YyV9s` | ✅ 2026-11-25 | 2026-11-25 3:47العصر |

البرومبت الفعلي لكل مهمة: `تشغيل مجدول (<المهمة>). اقرأ CLAUDE.md ثم نفّذ schedules/<المهمة>.md كاملاً. ابدأ من آخر main واعتبر ما سبق في هذه المحادثة سياق فقط — المرجع هو ملفات المستودع.`

**أول تشغيل:** `write` يوم 2026-11-15 الساعة 8:05م ← أول نشر 2026-11-16 الساعة 1:00ظ (`launch_date`).
