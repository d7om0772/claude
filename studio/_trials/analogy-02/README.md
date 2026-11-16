# studio/_trials/analogy-02 — تجربة "الشرح بالتشبيه" الثانية: التصميم 2 "ورق فاتح"

فيديو تجريبي (42.97ث) بنفس نظام الأسلوب (`../analogy-01/style-system/`) لكن بتصميم مختلف كلياً، على سكربت تيربو المعتمد `2026-11-16-02` (Win + Shift + S).
مقارنة التصميمين وجدول المخالفات في `script.md`. **مو قالب عام:** `scene.js` مكتوب لهذا الفيديو.

| الملف | وش فيه |
|---|---|
| `script.md` | السكربت المعدّل، المراجع، مقارنة التصميم 1 و 2، والمخالفات وأسبابها |
| `build.py` | captions.json + words_final.json → scene.json (توقيت ضغطات الأزرار من تفريغ Whisper الخام) |
| `index.html` · `style.css` · `scene.js` | المشهد: DOM + SVG، `window.renderFrame(t)` حتمية |
| `tighten.py` | قص الفراغات + سرعة مستهدفة (`--keep "الحل=0.34" --target-wps 2.12`) |
| `scene.json` · `captions.json` · `voice_report.json` · `credits.md` | بيانات التشغيل والحقوق |

## إعادة الإنتاج
```bash
ID=trial-analogy-02; mkdir -p work/$ID     # caption.txt من script.md، و voice.txt = نفسه بنطق الأزرار
python3 -I studio/tools/voice_pipeline.py --provider gemini --voice-text work/$ID/voice.txt --caption-text work/$ID/caption.txt --out work/$ID/
( cd work/$ID && python3 -I ../../studio/_trials/analogy-02/tighten.py --keep "الحل=0.34" --target-wps 2.12 )
python3 -I studio/tools/caption_align.py --caption work/$ID/caption.txt --words work/$ID/words_final.json --out work/$ID/captions.json --max-words 5
python3 -I studio/_trials/analogy-02/build.py --captions work/$ID/captions.json --words work/$ID/words_final.json --out work/$ID/scene.json
python3 -I studio/tools/audio_mix.py --voice work/$ID/voice_final.wav --scene work/$ID/scene.json --out work/$ID/mix.wav
node studio/render.cjs --series _trials/analogy-02 --data work/$ID/scene.json --audio work/$ID/mix.wav --out work/$ID/video.mp4 --workers 3 --crf 16
python3 -I studio/tools/qa_video.py work/$ID/video.mp4 --qa work/$ID/qa.json --sheets work/$ID/sheets
```

## دروس رندر (Chromium + swiftshader) — مهمة لأي قالب جاي
- **لا `filter` على عالم كامل فيه طبقات كبيرة:** طلع مربعات بيضاء فاضية. التجميد بالأبيض والأسود صار طبقة فوق العالم `mix-blend-mode: saturation` بلون رمادي، والتعتيم طبقة سوداء شفافة.
- **لا تحرّك طبقة أكبر من الشاشة بـ transform:** خلفية الخشب تتحرك بـ `background-position`، وكل قطعة ديكور لحالها.
- **مجموعة SVG فيها فلاتر لا تطلع برا حدود الـ SVG:** رسمت مربع أبيض فوق الشاشة. خفها بـ `display="none"` لما تطلع.
