# studio/_trials/analogy-01 — تجربة أسلوب "الشرح بالتشبيه"

فيديو تجريبي واحد (39.8ث) بأسلوب مستخرج من فيديو مرجعي، مطبّق على سكربت تيربو المعتمد `2026-11-16-03` (الجهاز شغال والشاشة سوداء).
**مو سلسلة ولا قالب عام:** `scene.js` فيه رسومات ومشاهد هذا الفيديو بالذات. لو انعتمد الأسلوب، ينبني منه قالب `studio/<series>/` بمكتبة عناصر.

| الملف | وش فيه |
|---|---|
| `../style-system/` | دليل الأسلوب (صار الإصدار 2 بدون تشبيه؛ الإصدار 1 اللي انبنت عليه هالتجربة في تاريخ git) |
| `script.md` | السكربت المعدّل، مراجع كل ادعاء، وجدول وين خالفنا الدليل وليش |
| `build.py` | captions.json → scene.json (كل قص وحدث ومؤثر مربوط برقم كلمة) |
| `index.html` · `style.css` · `scene.js` | المشهد: DOM + SVG، `window.renderFrame(t)` حتمية (نفس عقد `render.cjs`) |
| `tighten.py` | يقص فراغات التعليق لـ 0.20ث ويعيد حساب توقيت الكلمات |
| `scene.json` · `captions.json` · `voice_report.json` | بيانات التشغيل الفعلي |
| `credits.md` | الحقوق |

## إعادة الإنتاج
```bash
ID=trial-analogy-01; mkdir -p work/$ID
# 1) النصين (من script.md) → work/$ID/caption.txt و voice.txt، ثم الصوت:
python3 -I studio/tools/voice_pipeline.py --provider gemini --voice-text work/$ID/voice.txt --caption-text work/$ID/caption.txt --out work/$ID/
# 2) قص الفراغات + تبطيء 0.94 (يشتغل من داخل مجلد العمل) → voice_final.wav / words_final.json
( cd work/$ID && python3 -I ../../studio/_trials/analogy-01/tighten.py )
# 3) التوقيت والمشهد
python3 -I studio/tools/caption_align.py --caption work/$ID/caption.txt --words work/$ID/words_final.json --out work/$ID/captions.json --max-words 5
python3 -I studio/_trials/analogy-01/build.py --captions work/$ID/captions.json --out work/$ID/scene.json
# 4) المكس والرندر والفحص (الرندر ~8 دقايق: 1ث/فريم بسبب الـ blur)
python3 -I studio/tools/audio_mix.py --voice work/$ID/voice_final.wav --scene work/$ID/scene.json --out work/$ID/mix.wav
node studio/render.cjs --series _trials/analogy-01 --data work/$ID/scene.json --audio work/$ID/mix.wav --out work/$ID/video.mp4 --workers 3 --crf 16
python3 -I studio/tools/qa_video.py work/$ID/video.mp4 --qa work/$ID/qa.json --sheets work/$ID/sheets
```
`build.py` يفترض 89 كلمة كابشن بترتيب هذا السكربت (أرقام الكلمات مكتوبة فيه). أي تغيير في النص يحتاج تحديث الأرقام.
