# studio/_trials/coffee-01 — "محاصيل القهوة" بالأسلوب بدون تشبيه

أول فيديو على **الإصدار 2** من نظام الأسلوب (`../style-system/`): انحذفت قصة التشبيه، والأمثلة صارت عالم واحد (خريطة) تتنقل فيه الكاميرا.
الموضوع **مو تيربو** (قهوة) — تجربة إن الأسلوب يشتغل على أي مجال. الألوان من القهوة، وبدون شعار تيربو.

| الملف | وش فيه |
|---|---|
| `script.md` | السكربت، مراجع كل جملة، وملاحظات قبل النشر |
| `build.py` | captions.json → scene.json |
| `index.html` · `style.css` · `scene.js` | المشهد. الخريطة تتحرك بـ viewBox، والمعلومات شارات تحت الخريطة |
| `tighten.py` | قص الفراغات + السرعة المستهدفة |
| `scene.json` · `captions.json` · `voice_report.json` · `credits.md` | بيانات التشغيل والحقوق |

## إعادة الإنتاج
```bash
ID=trial-coffee-01; mkdir -p work/$ID      # caption.txt من script.md، و voice.txt = نفسه مع "أربعين" بدل 40
python3 -I studio/tools/voice_pipeline.py --provider gemini --voice-text work/$ID/voice.txt --caption-text work/$ID/caption.txt --out work/$ID/
( cd work/$ID && python3 -I ../../studio/_trials/coffee-01/tighten.py --keep "الطعم؟=0.34" --target-wps 2.12 )
python3 -I studio/tools/caption_align.py --caption work/$ID/caption.txt --words work/$ID/words_final.json --out work/$ID/captions.json --max-words 5
python3 -I studio/_trials/coffee-01/build.py --captions work/$ID/captions.json --out work/$ID/scene.json
python3 -I studio/tools/audio_mix.py --voice work/$ID/voice_final.wav --scene work/$ID/scene.json --out work/$ID/mix.wav
node studio/render.cjs --series _trials/coffee-01 --data work/$ID/scene.json --audio work/$ID/mix.wav --out work/$ID/video.mp4 --workers 3 --crf 16
python3 -I studio/tools/qa_video.py work/$ID/video.mp4 --qa work/$ID/qa.json --sheets work/$ID/sheets
```
