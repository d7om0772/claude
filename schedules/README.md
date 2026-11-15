# المهام المجدولة — تيربو

كل الأوقات بتوقيت الرياض (`Asia/Riyadh`)، مزاحة 5 دقايق عن رأس الساعة. برومبت كل مهمة قصير وثابت؛ الشغل الفعلي في ملف المهمة، فالمدير يعدّل الشغل بتعديل الملف بدون ما يلمس المهمة.

| المهمة | الموعد | cron | البرومبت | الملف |
|---|---|---|---|---|
| `write` الكتابة | يومياً 8:05م | `CRON_TZ=Asia/Riyadh 5 20 * * *` | اقرأ `CLAUDE.md` ثم نفّذ `schedules/write.md` كاملاً. | [write.md](write.md) |
| `produce` الإنتاج | يومياً 1:35ص | `CRON_TZ=Asia/Riyadh 35 1 * * *` | اقرأ `CLAUDE.md` ثم نفّذ `schedules/produce.md` كاملاً. | [produce.md](produce.md) |
| `publish` النشر | يومياً 7:05ص | `CRON_TZ=Asia/Riyadh 5 7 * * *` | اقرأ `CLAUDE.md` ثم نفّذ `schedules/publish.md` كاملاً. | [publish.md](publish.md) |
| `analyze` التحليل | السبت 7:35ص | `CRON_TZ=Asia/Riyadh 35 7 * * 6` | اقرأ `CLAUDE.md` ثم نفّذ `schedules/analyze.md` كاملاً. | [analyze.md](analyze.md) |
| `rescue` الإنقاذ | يومياً 12:15ظ | `CRON_TZ=Asia/Riyadh 15 12 * * *` | اقرأ `CLAUDE.md` ثم نفّذ `schedules/rescue.md` كاملاً. | [rescue.md](rescue.md) |

**إعدادات كل مهمة (نفسها للخمس):**
- **المستودع:** `d7om0772/claude` (الفرع `main`) — والسماح بالدفع على `main` (المهام تحفظ مباشرة عليه).
- **البيئة:** `video` (فيها `GEMINI_API_KEY` و`PEXELS_API_KEY`، والشبكة مفتوحة، وسكربت إعداد يثبت faster-whisper وموديله).
- **الموصلات:** ElevenLabs، schedulin، Cloudinary، tiktok scraper، pexels.
- **نوع التشغيل:** جلسة جديدة كل مرة.

## الحالة
| المهمة | المعرّف (`trig_...`) | أنشئت | ملاحظة |
|---|---|---|---|
| write | — | ⏳ | تُنشأ من claude.ai/code/routines |
| produce | — | ⏳ | |
| publish | — | ⏳ | |
| analyze | — | ⏳ | |
| rescue | — | ⏳ | |

**ليش ما انشأت من جلسة الإعداد؟** أداة الجدولة المتاحة للجلسة تنشئ المهمة **بدون مستودع وبدون موصلات** (ما تقدر ترفق Schedulin ولا Cloudinary ولا ElevenLabs)، فكانت بتشتغل بدون أدوات النشر. لازم تنشأ من واجهة claude.ai/code/routines عشان ترفق المستودع والموصلات. بعد الإنشاء: المدير يحدّث جدول الحالة فوق بالمعرّفات.

**أول تشغيل:** `write` يوم 2026-11-15 الساعة 8:05م ← أول نشر 2026-11-16 الساعة 1:00ظ (`launch_date`).
لو انشأت المهام بعد 8:05م يوم 15، شغّل `write` يدوياً مرة وحدة ("Run now") أو خلّ `produce`/`rescue` تكمّل (هي تكتب الناقص قبل ما تنتج).
