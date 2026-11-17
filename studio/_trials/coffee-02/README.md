# studio/_trials/coffee-02 — "مغسولة ولا طبيعية؟" بتصميم "طباعة ريزو"

ثاني فيديو على **الإصدار 2** من نظام الأسلوب (`../style-system/`، بدون تشبيه)، بتصميم جديد كلياً.

## التصميم: طباعة ريزو (Risograph)
| | coffee-01 (ورق وخريطة) | coffee-02 (ريزو) |
|---|---|---|
| الألوان | كريمي + إسبريسو + أحمر حبة البن | ورق + 4 أحبار بس: أسود، أحمر، تركوازي، أصفر |
| الظل والتدرج | ظلال ناعمة | نقاط هافتون، وطبقة لون ثانية مزاحة (misregistration) |
| الكابشن | كبسولة كريمية | شريط حبر أسود مائل بظل أحمر (وكريمي على خلفية الشرح السوداء) |
| ظهور الكلمة | تطلع من تحت | "تنختم": تنزل كبيرة ومايلة وتستقر |
| العوالم | كريمي / أحمر / محمّص / كرافت | ورق / تركوازي / حبر أسود / أرض صفراء (شمس) |
| البطل | كيس قهوة + دبوس | ثمرة بن تنكشف بالأشعة وتنقطف |
| عالم الأمثلة | خريطة بلدان | 3 مناشر تجفيف تتنقل بينها الكاميرا |
| تفاصيل الطباعة | — | علامات تسجيل (registration marks) وشمس هافتون تدور |

| الملف | وش فيه |
|---|---|
| `script.md` | السكربت ومراجع كل جملة وملاحظات قبل النشر |
| `build.py` | captions.json + words_final.json → scene.json |
| `index.html` · `style.css` · `scene.js` | المشهد |
| `tighten.py` · `scene.json` · `captions.json` · `voice_report.json` · `credits.md` | التشغيل والحقوق |

## إعادة الإنتاج
```bash
ID=trial-coffee-02; mkdir -p work/$ID      # caption.txt من script.md، و voice.txt = نفسه مع "ست" بدل 6
python3 -I studio/tools/voice_pipeline.py --provider gemini --voice-text work/$ID/voice.txt --caption-text work/$ID/caption.txt --out work/$ID/
( cd work/$ID && python3 -I ../../studio/_trials/coffee-02/tighten.py --keep "بينها؟=0.34" --target-wps 2.12 )
python3 -I studio/tools/caption_align.py --caption work/$ID/caption.txt --words work/$ID/words_final.json --out work/$ID/captions.json --max-words 5
python3 -I studio/_trials/coffee-02/build.py --captions work/$ID/captions.json --words work/$ID/words_final.json --out work/$ID/scene.json
python3 -I studio/tools/audio_mix.py --voice work/$ID/voice_final.wav --scene work/$ID/scene.json --out work/$ID/mix.wav
node studio/render.cjs --series _trials/coffee-02 --data work/$ID/scene.json --audio work/$ID/mix.wav --out work/$ID/video.mp4 --workers 3 --crf 16
python3 -I studio/tools/qa_video.py work/$ID/video.mp4 --qa work/$ID/qa.json --sheets work/$ID/sheets
```
