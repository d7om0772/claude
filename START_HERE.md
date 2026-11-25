# ابدأ من هنا — نظام تيربو · TURBO PC (فريق وكلاء حساب تيك توك @.torbo)

هذا المجلد هو **النظام كامل**: الدستور، الوكلاء، المهام المجدولة، الأدوات، قوالب الفيديو، حزم التصميم، التقويم، والسجلات.
أي ذكاء اصطناعي يقدر **يشغّل كود** ويوصل للخدمات تحت، يقدر يكمّل الشغل منه مباشرة.

---

## ١. أول رسالة ترسلها للذكاء الاصطناعي (انسخها كما هي)
```
أنت "المدير" لنظام تيربو. المجلد الحالي هو النظام كامل وهو الذاكرة الوحيدة.
1) اقرأ START_HERE.md ثم CLAUDE.md (أو AGENTS.md) كاملين.
2) نفّذ قسم "التشغيل" في START_HERE.md خطوة خطوة، وبعد كل خطوة احفظ (commit + push على main).
3) أي قيمة خاصة بالحساب (قسم ٤) وما تقدر تتأكد منها: اسألني عنها مرة وحدة.
4) في النهاية عطني ملخص: وش اشتغل، وش ناقص، ووش لازم أسويه بنفسي.
```

## ٢. المتطلبات
| النوع | المطلوب | ليش |
|---|---|---|
| **بيئة تشغيل كود** | Linux، Python 3.11+، Node 18+، ffmpeg، Chromium + Playwright، مساحة ~3GB | رندر الفيديو (Three.js/HTML ← فريمات ← ffmpeg)، Whisper للتوقيت |
| **مستودع Git** | GitHub (فرع `main`) | المستودع هو الذاكرة الوحيدة؛ الحاويات السحابية تنمسح |
| **مفاتيح (متغيرات بيئة فقط، لا تنكتب في أي ملف)** | `GEMINI_API_KEY` (الصوت الاحتياطي Gemini TTS) · `PEXELS_API_KEY` (اختياري) | |
| **خدمات/موصلات** | **Schedulin** (جدولة ونشر تيك توك) · **Cloudinary** (رفع الفيديو) · **ElevenLabs** (صوت فهد الأساسي) · **Apify** (`xtdata/tiktok-scraper` + `apify/instagram-scraper`: المفكر اليومي والتحليل الأسبوعي) · **Pexels** (اختياري) | |
| **مجدول مهام** | 7 مهام (قسم ٣) تصحى وترسل برومبت ثابت | التشغيل لحاله |

**الأنسب:** Claude Code (سحابي) — النظام مبني عليه: `CLAUDE.md` و`.claude/agents/` و`.claude/settings.json` تشتغل مباشرة.
**ذكاء اصطناعي ثاني** (Codex، Gemini CLI، Cursor…): `AGENTS.md` يحيله لـ `CLAUDE.md`. الوكلاء في `.claude/agents/*.md` تعليمات نصية عادية: شغّل كل واحد كوكيل فرعي، أو خلّ الوكيل الرئيسي ينفذ تعليماته بنفسه (مكتوب في CLAUDE.md). الموصلات تتبدل بما يقابلها (API أو MCP).
> ⚠️ ذكاء اصطناعي **دردشة فقط** (ما يشغّل كود ولا يوصل لخدمات) يقدر يكتب السكربتات ويدققها، لكن ما يقدر يصنع الفيديو ولا ينشره.

## ٣. المهام المجدولة (بتوقيت الرياض)
كل مهمة ترسل نفس الشكل: **`اقرأ CLAUDE.md ثم نفّذ schedules/<المهمة>.md كاملاً.`**
| المهمة | cron | الملف |
|---|---|---|
| write (الكتابة) | `CRON_TZ=Asia/Riyadh 5 20 * * *` | `schedules/write.md` |
| produce (الإنتاج) | `CRON_TZ=Asia/Riyadh 35 1 * * *` | `schedules/produce.md` |
| publish (النشر) | `CRON_TZ=Asia/Riyadh 5 7 * * *` | `schedules/publish.md` |
| news (الأخبار) | `CRON_TZ=Asia/Riyadh 35 9 * * *` | `schedules/news.md` |
| rescue (الإنقاذ) | `CRON_TZ=Asia/Riyadh 15 12 * * *` | `schedules/rescue.md` |
| ideas (المفكر) | `CRON_TZ=Asia/Riyadh 47 15 * * *` | `schedules/ideas.md` |
| analyze (التحليل، السبت) | `CRON_TZ=Asia/Riyadh 35 7 * * 6` | `schedules/analyze.md` |

**مهم (Claude Code):** المهام اللي تنشأ بخيار "جلسة جديدة كل مرة" ممكن تطلع **بدون المستودع وبدون الموصلات**. الحل المجرّب: **جلسة مشغّل دائمة** فيها المستودع والموصلات، والمهام مربوطة فيها (`persistent_session_id`)، ولا تأرشفها. التفاصيل في `schedules/README.md`.

## ٤. قيم خاصة بالحساب (حدّثها في البيئة الجديدة)
| القيمة | وين | ملاحظة |
|---|---|---|
| معرّف حساب تيك توك في Schedulin | `config.json → account.schedulin_social_account_id` | الناشر يتأكد منه كل تشغيل بـ `list_social_accounts` |
| صوت فهد في ElevenLabs | `brand/voice-providers.json → elevenlabs.voice_id` | |
| جلسة المشغّل ومعرّفات المهام (`session_…`، `trig_…`) | `schedules/README.md`، `CLAUDE.md`، `schedules/dashboard.md` | تتغيّر مع كل بيئة جديدة — أنشئها من جديد |
| روابط صفحات المتابعة (artifacts) | `CLAUDE.md`، `schedules/dashboard.md`، `scripts/build_status_page.py` | انشرها من جديد لو منصة ثانية |
| أسماء أدوات الموصلات بالمعرّف | `CLAUDE.md` § أسماء أدوات الموصلات، `.claude/settings.json` | تختلف من حساب لحساب |
| تاريخ الإطلاق والمراحل وأوقات النشر | `config.json → launch_date / phases / posting` | |
| روابط Cloudinary القديمة في التقويم | `content/calendar.md`، `content/production/*/upload.json` | تاريخية؛ الجديدة تنكتب تلقائياً |

## ٥. التشغيل (خطوة خطوة)
1. ارفع المجلد لمستودع Git جديد (فرع `main`)، وفعّل المفاتيح كمتغيرات بيئة، واربط الخدمات.
2. `bash scripts/bootstrap.sh` (يثبت الناقص: ffmpeg، faster-whisper وموديله، three.js، الخطوط، والمؤثرات).
3. تأكد من الموصلات: Schedulin `list_social_accounts` (حساب تيك توك)، Cloudinary `sign-upload`، ElevenLabs `creative_list_voices` (صوت فهد).
4. اختبار القوالب بدون نشر: `bash studio/tools/selftest.sh` (السلاسل الأربع) — لازم QA بدون issues.
5. حدّث القيم في قسم ٤.
6. أنشئ جلسة المشغّل والمهام السبع (قسم ٣)، وحدّث معرّفاتها في `schedules/README.md`.
7. `python3 scripts/day_info.py` (اليوم والمرحلة والمواعيد) و`python3 scripts/cal.py list --from <اليوم>` (التقويم) — لو التقويم فاضي أو قديم، مهمة write تخطط الأسبوع الجاي.
8. سجّل في `CHANGELOG.md` ("نقل النظام لبيئة جديدة") واحفظ.

## ٦. خريطة المجلد
| المسار | المحتوى |
|---|---|
| `CLAUDE.md` (و`AGENTS.md`) | الدستور: الهدف، القواعد الثابتة، خريطة الملفات، دور المدير |
| `.claude/agents/` | الوكلاء (مع النموذج والجهد لكل واحد): thinker · scriptwriter · fact-checker · video-producer · publisher · analyst · news-editor |
| `schedules/` | تعليمات كل مهمة + المواعيد + سجل التشغيل `runs.md` |
| `config.json` | الإطلاق، المراحل، أوقات النشر، السلاسل، الأخبار، مواصفات الفيديو |
| `content/` | التقويم (حالة كل فيديو)، السكربتات، ملفات الإنتاج، المنشورات، طابور الأخبار |
| `brand/` | الهوية، الصوت وقواعد النطق، السلاسل، حزم التصميم الأربع (`styles/`)، الشعار |
| `studio/` | قوالب الفيديو (4 سلاسل) + أدوات الخط: الصوت، التوقيت، المشهد، المكس، الرندر، الفحص، الرفع |
| `scripts/` | bootstrap · day_info · cal · git_save · sync_times · news_slot · ideas · thinker_plan · install_packs · لوحات المتابعة |
| `docs/team-blueprint.md` | شرح النموذج + برومبت جاهز لبناء فريق مشابه لمشروع ثاني |
| `CHANGELOG.md` | كل تعديل صار على النظام وليش |
