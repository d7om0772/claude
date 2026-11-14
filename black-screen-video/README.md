# الشاشة سوداء والجهاز شغّال: فيديو بستايل "مكتب 3D (أحمر للمشكلة وأخضر للحل)"

| الملف | المحتوى |
|---|---|
| `black_screen_fix.mp4` | الفيديو النهائي 1080×1920، 30fps، H.264 + AAC |
| `plan.md` | جدول المشاهد |
| `credits.md` | الحقوق وسطر الوصف |
| `src/` | المشهد (`index.html` + `main.js` بـ three.js)، والتصيير (`render.mjs`)، والصوت (`tts.py`, `transcribe.py`, `align.py`, `fetch_sfx.py`, `mix.py`) |
| `audio/` | نص التعليق، والتعليق الأصلي، وتوقيتات Whisper، والمؤثرات |
| `assets/` | الخطوط والشعار |

## إعادة البناء
```bash
python3 -I src/tts.py audio/script_spoken.txt audio/vo_take1.wav            # يحتاج GEMINI_API_KEY
python3 -I src/transcribe.py audio/vo_take1.wav audio/words_take1.json      # faster-whisper large-v3-turbo
python3 -I src/align.py audio/words_take1.json src/words.json 0.25
node src/render.mjs 0 1512 out.mp4 8800 audio/sfx_cues.json                 # Playwright + Chromium
python3 -I src/mix.py
```
