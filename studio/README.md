# studio — خط إنتاج الفيديو (مرجع صانع الفيديو)

كل المشاهد مبنية بالكود: Three.js (كاميرا Orthographic) + طبقة HTML/CSS، ودالة حتمية `window.renderFrame(t)`.
مجلد العمل لكل فيديو: `work/<ID>/` (مستبعد من git). اللي ينحفظ في المستودع: `content/production/<ID>/` فقط.

```
studio/
  common/            base.css (التوكنز والتخطيط) · core.js (المحرك، الترجمة، فحص الجودة) · kit3d.js (أدوات 3D)
  <series>/          index.html · scene.js · style.css · ELEMENTS.md (مكتبة العناصر) · sample.json · test/ (اختبار ذاتي)
  sfx/               مؤثرات مولّدة بالكود + manifest.json + LICENSES.md
  vendor/            three.js 0.186 (نسخة ثابتة) · fonts/ Baloo Bhaijaan 2 + Inter (OFL)
  render.cjs         الرندر: Playwright فريم فريم → ffmpeg
  tools/             voice_pipeline · transcribe · caption_align · scene_build · audio_mix · qa_video · snap · pexels · cloudinary_upload · selftest
```

## الخطوات (فيديو واحد = ID مثل `2026-11-16-02`)

| # | الخطوة | الأمر / الأداة | الناتج |
|---|---|---|---|
| 0 | تجهيز | `mkdir -p work/<ID> content/production/<ID>` ← انسخ من السكربت: نص الكابشن → `work/<ID>/caption.txt`، نص التعليق → `work/<ID>/voice.txt` | |
| 1 | الصوت | فهد (ElevenLabs) أو Charon (Gemini) — التفاصيل في `brand/voice.md §٢` ← `python3 -I studio/tools/voice_pipeline.py ...` | `voice.wav`, `words.json`, `voice_report.json` |
| 2 | الترجمة | `python3 -I studio/tools/caption_align.py --caption work/<ID>/caption.txt --words work/<ID>/words.json --out work/<ID>/captions.json` | `captions.json` (اطبع الكلمات بأرقامها عشان تستخدمها في المسودة) |
| 3 | جدول المشاهد | اقرأ `01_prompt.md` للحزمة (أو `ELEMENTS.md` للقالب المؤقت) ← اكتب `content/production/<ID>/scenes.md` (المقاطع، تصنيفها، العنصر، التوقيت) ← حوّله إلى `work/<ID>/scene_draft.json` | |
| 4 | المشهد | `python3 -I studio/tools/scene_build.py --draft work/<ID>/scene_draft.json --captions work/<ID>/captions.json --voice-report work/<ID>/voice_report.json --out work/<ID>/scene.json` | `scene.json` (المدة والختام والمؤثرات تلقائياً) |
| 5 | معاينة سريعة | `node studio/tools/snap.cjs --series <s> --data work/<ID>/scene.json --t 1,5,12,20 --out work/<ID>/snap --debug` ← شوف الصور | |
| 6 | المكس | `python3 -I studio/tools/audio_mix.py --voice work/<ID>/voice.wav --scene work/<ID>/scene.json --out work/<ID>/mix.wav` | `mix.wav` (−14 LUFS، مؤثرات −12dB تحت الكلام، بدون موسيقى) |
| 7 | الرندر | `node studio/render.cjs --series <s> --data work/<ID>/scene.json --audio work/<ID>/mix.wav --out work/<ID>/video.mp4 --workers 3 --crf 16` (Bash بـ `timeout: 600000`). **فيديو > 40ث:** أضف `--parts 3 --part 1` ثم `--part 2` ثم `--part 3` (كل واحد أمر مستقل) ثم نفس الأمر بـ `--assemble` | `video.mp4`, `qa.json` (~0.27ث/فريم ≈ 8 دقايق لفيديو 60ث) |
| 8 | الفحص | `python3 -I studio/tools/qa_video.py work/<ID>/video.mp4 --qa work/<ID>/qa.json --sheets work/<ID>/sheets` ← **افتح كل ورقة لقطات وشوفها** | تقرير + أوراق لقطات كل 0.5ث |
| 9 | الغلاف | `node studio/tools/snap.cjs --series <s> --data work/<ID>/scene.json --t <لحظة الهوك> --out work/<ID>/cover --cover` | `cover.jpg` |
| 10 | الرفع | موصل Cloudinary `sign-upload` ← `bash studio/tools/cloudinary_upload.sh work/<ID>/sign.json work/<ID>/video.mp4 video` (وبعدها الغلاف بـ `image`) | رابط `secure_url` |
| 11 | الحفظ | انسخ `scene_draft.json` و`scene.json` و`voice_report.json` و`captions.json` و`qa_video` (التقرير) إلى `content/production/<ID>/` + `credits.md` ← حدّث التقويم ← `bash scripts/git_save.sh "..."` | |

### صيغة scene_draft.json
```json
{ "id": "2026-11-16-02", "series": "shortcuts", "style": "interim", "camera": { "variant": 2 },
  "title": "لقطة شاشة لجزء **محدد**", "hook": { "text": "انسَ **Print Screen**", "start": 0, "end": "w3.end" },
  "events": [
    { "el": "E01", "start": "w5", "end": {"find": "وحدد", "shift": 1.0}, "params": { "keys": ["Win","Shift","S"], "times": ["w6","w8","w10"] } },
    { "el": "E02", "start": {"find": "وحدد"}, "end": "w20.end", "params": { "screen": "left", "demo": "snip" } }
  ],
  "sfx": [ { "t": {"find": "بثانية"}, "name": "ding" } ],
  "auto_sfx": true }
```
التوقيتات: رقم بالثواني، أو `"w12"`/`"w12.end"` (رقم كلمة الكابشن)، أو `{"find": "نص", "nth": 1, "edge": "start|end", "shift": 0}`. **كل ظهور مربوط بكلمته.**

## قواعد الجودة (قبل الرفع — كلها لازم تنجح)
- `voice_report.json → match.score ≥ 0.85`، و`caption_align → match_ratio ≥ 0.7`.
- `qa_video.py` بدون issues: 1080×1920، 30fps، H.264 yuv420p، AAC 192k، −14±1 LUFS، الحجم < 95MB، **صفر** مخالفات مناطق آمنة/تداخل.
- بعينك على أوراق اللقطات: لا تداخل، النص العربي مو مقلوب، الأرقام اللاتينية معزولة صح، التزامن مع الكلام، **لا ذوات أرواح**، ومقارنة بـ `03_preview.mp4` للحزمة (`brand/styles/<series>/_preview_frames/contact_sheet.jpg`) لو موجودة.
- لو الحجم > 95MB: أعد الرندر بـ `--crf 18`.

## الاختبار الذاتي للقوالب
`bash studio/tools/selftest.sh [series]` — صوت قصير + رندر 5 ثواني + فحص (يصرف طلب Gemini TTS واحد لكل سلسلة). استخدمه بعد أي تعديل على قالب أو بعد تثبيت حزمة.
