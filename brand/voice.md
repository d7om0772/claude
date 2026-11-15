# الصوت والنطق — تيربو · TURBO PC

> المرجع الوحيد لنبرة الكلام، والصوتين، وقواعد النطق. الإعدادات التقنية (voice_id، الموديل، تعليمات الأسلوب، الاستبدالات) في `brand/voice-providers.json`.
> **ملاحظة:** حزم الستايل الأصلية ما وصلت وقت الإعداد، فالقواعد هنا مكتوبة من البرومبت ومجرّبة على Gemini. لما تتثبت الحزم: أي قاعدة نطق في `04_design_style/` أو `01_prompt.md` تنضاف هنا (والحزمة تغلب لو تعارضت، إلا سطر اختيار الصوت: فهد هو الأساسي دائماً).

## ١. النبرة

- **لهجة سعودية بيضاء**، دافئة وواثقة، كأنك تشرح لصاحبك. بدون مبالغة ولا صراخ ولا نبرة مذيع.
- جمل قصيرة (٦–١٢ كلمة). كل جملة فكرة وحدة.
- خطاب مباشر بصيغة المفرد: "جهازك"، "اضغط"، "لو عندك".
- المصطلحات التقنية بالإنجليزي: GPU وRAM وFPS وSSD وBIOS.
- ممنوع: "يا جماعة الخير" والمقدمات الطويلة. الهوك أول ٣ ثواني.
- الختام قصير: جملة وحدة + "تيربو" (مثلاً: "تابع تيربو عشان ما يفوتك الجاي.").

## ٢. الصوتين

| | الأساسي | الاحتياطي |
|---|---|---|
| المزوّد | ElevenLabs (موصل MCP) | Google AI Studio (Gemini TTS، API بالمفتاح `GEMINI_API_KEY`) |
| الصوت | **Fahad - Saudi, Warm & Confident** | **Charon** |
| المعرّف | `voice_id = rpGHcNQJvO8dFNNFNj1v` (من `creative_list_voices`) | موديل `gemini-3.1-flash-tts-preview` |
| الموديل | `eleven_v4`، `generations_count = 1` | — |
| الإعدادات | افتراضية | تعليمات أسلوب v2 + ضبط السرعة والطبقة تلقائياً |

**قاعدة ثابتة:** الفيديو الواحد كله بصوت واحد. ما نخلط فهد وCharon في نفس الفيديو. ويتسجل في التقويم (عمود "الصوت") أي فيديو استخدم الاحتياطي وسببه.

### متى ننتقل للاحتياطي
1. موصل ElevenLabs رجّع خطأ (أي خطأ: صلاحيات، شبكة، موديل).
2. الرصيد ما يكفي (رسالة "exceeds your quota" في `creative_get_flow_run_status`).
3. الصوت طلع غلط: `voice_pipeline.py` رجّع كود 2 (تطابق Whisper أقل من 0.85) **مرتين** لنفس النص.

### طريقة توليد صوت فهد (صانع الفيديو)
1. `python3 -I studio/tools/voice_pipeline.py --provider elevenlabs --voice-text work/<ID>/voice.txt --out work/<ID>/ --prepare-only` → يطلع `voice_elevenlabs.txt` بعد استبدالات المزوّد.
2. `creative_generate_speech` بـ: `voice_id=rpGHcNQJvO8dFNNFNj1v`، `model_id=eleven_v4`، `generations_count=1`، و`prompt` = نص الملف. **لا تعيد الاستدعاء لو تأخر** — كل استدعاء يصرف رصيد.
3. انتظر بـ `creative_get_flow_run_status` (بالـ `flow_id` و`session_ids`) إلى `all_completed` أو `has_failures`.
4. `creative_get_generations` بالـ `generation_id` → `full_res_url` → `curl -sSL -o work/<ID>/voice_raw.mp3 "<url>"`.
5. `python3 -I studio/tools/voice_pipeline.py --provider elevenlabs --audio work/<ID>/voice_raw.mp3 --voice-text work/<ID>/voice.txt --caption-text work/<ID>/caption.txt --out work/<ID>/`

### طريقة توليد صوت Charon (الاحتياطي)
`python3 -I studio/tools/voice_pipeline.py --provider gemini --voice-text work/<ID>/voice.txt --caption-text work/<ID>/caption.txt --out work/<ID>/`
الأداة تولّد الصوت، وتفرّغه، وتضبط سرعته على سرعة فهد (٢٫٠٥ كلمة/ثانية، ضمن ٠٫٩٢–١٫١٢)، وتنزّل طبقته لو طلعت فوق ١٥٠Hz (حد أقصى سيميتونين).

### تعليمات أسلوب Charon (v2 — مجرّبة 2026-11-15)
```
Voice direction: a warm, confident, middle-aged Saudi man speaking clear white Saudi dialect (لهجة سعودية بيضاء، نجدية خفيفة). Low, relaxed chest register — deep and calm, never high or shouty. Steady, friendly intonation with a slight smile; not dramatic, not a radio announcer. Conversational pace (about two words per second) with short natural pauses only at commas and full stops. Say English tech terms in clear English. Read exactly the text below — do not add, drop or change any word.
```

**نتائج المعايرة (2026-11-15):** المرجع = عينة فهد الرسمية (`preview_url`) لأن رصيد ElevenLabs كان خالص وقت الإعداد.

| النسخة | وسيط الطبقة | المدى (p10–p90) | كلمة/ثانية | تطابق Whisper |
|---|---|---|---|---|
| **فهد (المرجع)** | **133Hz** | 105–186 | **2.06** | — |
| Charon بدون أسلوب | 167Hz | 110–250 | 1.95 | 0.97 |
| Charon أسلوب v2 ✅ | 133–144Hz | 89–229 | 1.78 ← تتضبط 2.05 | 1.00 |
| Charon أسلوب v4 (سريع) | 151Hz | 113–239 | 2.37 | 0.97 |
| Charon أسلوب v5 | 159Hz | 95–235 | 2.18 | 1.00 |

v2 أقرب طبقة لفهد. فرق السرعة يتعالج بـ atempo، والطبقة لو ارتفعت في تشغيل معيّن تنزل تلقائياً.

**قسم فهد ينتظر أول تجربة فعلية:** ما قدرنا نولّد ولا جملة بفهد وقت الإعداد (36 كريدت باقية من 10000، والجملة الوحدة تحتاج 186). أول فيديو ينولد بفهد: سجّل هنا نتيجة التطابق وأي كلمة نطقها غلط، وأضف استبدال في `voice-providers.json → elevenlabs.replacements`.

## ٣. قواعد النطق (نص التعليق الصوتي)

السكربت فيه **نسختين**: نص الكابشن (يظهر على الشاشة كما هو، بالأرقام) ونص التعليق الصوتي (تنطبق عليه القواعد التالية). المعنى لازم يكون نفسه حرفياً.

### ٣.١ الأرقام: بالعامي، بالحروف
| الكابشن | التعليق الصوتي |
|---|---|
| 1–10 | واحد، ثنين، ثلاث، أربع، خمس، ست، سبع، ثمان، تسع، عشر |
| 11–19 | احدعش، اطنعش، ثلطعش، اربعطعش، **خمسطعش**، ستطعش، سبعطعش، ثمنطعش، تسعطعش |
| 20–90 | عشرين، ثلاثين، أربعين، خمسين، ستين، سبعين، ثمانين، تسعين |
| 100–900 | مية، ميتين، ثلاث مية، أربع مية، خمس مية، ست مية، سبع مية، ثمان مية، تسع مية |
| 1000+ | ألف، ألفين، ثلاث آلاف … عشر آلاف، احدعش ألف، خمسطعش ألف، عشرين ألف |
| 1,299 ريال | ألف ومتين وتسعة وتسعين ريال |
| 2,450 ريال | ألفين وأربع مية وخمسين ريال |
| 3.5 | ثلاثة ونص |
| 25% | خمسة وعشرين بالمية |
| ~140 FPS | تقريباً مية وأربعين فريم |

### ٣.٢ أرقام كروت الشاشة: رقمين رقمين
| الكابشن | التعليق الصوتي |
|---|---|
| RTX 5060 | RTX خمسين ستين |
| RTX 4060 Ti | RTX أربعين ستين تي آي |
| RTX 5070 Ti | RTX خمسين سبعين تي آي |
| RX 9070 XT | RX تسعين سبعين XT |
| RX 7600 | RX ستة وسبعين مية (لو الزوج الثاني 00 = "مية") |
| Arc B580 | Arc B خمس مية وثمانين |

### ٣.٣ المعالجات
| الكابشن | التعليق الصوتي |
|---|---|
| Ryzen 5 / 7 / 9 | Ryzen five / seven / nine |
| Core i5 / i7 | Core i five / i seven |
| Core Ultra 5 | Core Ultra five |
| Ryzen 5 7600 | Ryzen five seventy-six hundred |
| Core i5-14400F | Core i five fourteen four hundred F |
| Ryzen 7 9800X3D | Ryzen seven ninety-eight hundred X3D |

### ٣.٤ الأزرار (بالإنجليزي)
| الكابشن | التعليق الصوتي |
|---|---|
| Win | Windows |
| Ctrl | Control |
| Shift / Alt / Tab / Enter | Shift / Alt / Tab / Enter |
| Esc | Escape |
| Del | Delete |
| PrtSc | Print Screen |
| ← → ↑ ↓ | السهم اليسار / اليمين / فوق / تحت |
| `+` بين الأزرار | و (مثل: Windows و Shift و S) |

### ٣.٥ الوحدات والدقة
| الكابشن | التعليق الصوتي |
|---|---|
| 16GB | ستطعش قيقا |
| 1TB | واحد تيرا / تيرا |
| 6000MHz | ستة آلاف ميقاهيرتز |
| 5.0GHz | خمسة قيقاهيرتز |
| 144Hz | مية وأربعة وأربعين هيرتز |
| 650W | ست مية وخمسين واط |
| 1080p / 1440p / 4K | ten eighty p / fourteen forty p / four K |
| 75°C | خمسة وسبعين درجة |
| 20ms | عشرين ملي ثانية |

### ٣.٦ الاختصارات التقنية (تنكتب بالإنجليزي وتنقرأ حرفاً حرفاً أو ككلمة متعارف عليها)
RAM، SSD، NVMe، CPU، GPU، PSU، BIOS، XMP، EXPO، USB، HDMI، DisplayPort، Wi-Fi، DDR5 (= DDR five)، PCIe (= PCI express).
مصطلحات تنقال بالعربي العامي: قيمنق (gaming)، الكيس (case)، الماذربورد، الباور (PSU)، المروحة، الكرت.

### ٣.٧ فروقات المزودين (نسخة قواعد لكل مزوّد)
| القاعدة | فهد (ElevenLabs) | Charon (Gemini) |
|---|---|---|
| أرقام إنجليزية (seventy-six hundred) | بالحروف اللاتينية (الافتراضي — يحتاج تأكيد أول تشغيل) | اللاتيني شغال؛ التجربة بالحروف العربية ("سفنتي سكس هندرد") طلعت أنظف شوي. لو انقرأ رقم غلط → أضف استبدال |
| أسماء المنتجات والأزرار | لاتيني | لاتيني (مجرّب: Ryzen، Core، RTX، Shift، Escape انقرت صح) |
| أرقام عامية (خمسطعش، ستطعش) | — | مجرّبة وصحيحة |
| الاستبدالات الفعّالة | `voice-providers.json → elevenlabs.replacements` (فاضية) | `gemini.replacements` (فاضية) |

**مثال كامل (مجرّب على Charon، تطابق 100%):**
- كابشن: `هلا والله فيكم! اليوم بنجمّع لكم تجميعة قيمنق بـ 15,000 ريال: كرت شاشة RTX 5060، ومعالج Ryzen 5، و16GB RAM. وإذا تبي تصوّر الشاشة بسرعة، اضغط Win + Shift + S مع بعض.`
- تعليق: `هلا والله فيكم! اليوم بنجمّع لكم تجميعة قيمنق بخمسطعش ألف ريال: كرت شاشة RTX خمسين ستين، ومعالج Ryzen five، وستطعش قيقا RAM. وإذا تبي تصوّر الشاشة بسرعة، اضغط Windows و Shift و S مع بعض.`

## ٤. فحص الصوت (إلزامي قبل الرندر)
- `voice_pipeline.py` يطلع `words.json` (توقيت كل كلمة) و`voice_report.json`. المعيار: `match.score ≥ 0.85`.
- Whisper يكتب الأرقام بالأرقام ويكتب بعض كلمات اللهجة بالفصحى (تبي ← تريد، قيقا ← جيجا). الأداة تطبّع هذا (الأرقام كلها NUM + مرادفات في `transcribe.py → ALIASES`). لو الفرق كلمة لهجة صحيحة، أضفها للمرادفات بدل ما تعيد التوليد.
- المدقق يتأكد إن نص التعليق يطابق نص الكابشن في المعنى بعد تحويلات النطق.
