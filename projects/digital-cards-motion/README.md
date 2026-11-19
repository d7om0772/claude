# موشن تعليمي لمتجر بطاقات رقمية — "قبل تشتري بطاقة رقمية"

فيديو عمودي 1080×1920 · 34.5 ثانية · 30fps · تعليق صوتي سعودي · **بدون موسيقى · بدون ذوات أرواح**.

## الفكرة
دليل سريع بـ 3 خطوات، ينفع لأي متجر يبيع بطاقات رقمية (ألعاب، متاجر تطبيقات، هدايا):
1. **المنطقة:** دولة البطاقة لازم تطابق دولة حسابك (بطاقة سعودية ✓ / بطاقة أمريكية ✗).
2. **الكود = كاش:** لا تصوّره ولا ترسله. اللي يشوفه يقدر يستخدمه قبلك (الرصيد ينزل من 100 إلى 0 وتنختم "تم استخدامه").
3. **اشحن من الرسمي:** أدخل الكود بنفسك من التطبيق أو الموقع الرسمي، مو من رابط وصلك برسالة.
الختام: صندوق هدية + "اختر بطاقتك صح، واشحن وأنت مرتاح" + ملخص الثلاث نقاط.

## الهوية
بنفسجي كهربائي `#7C5CFF` + سماوي `#22D3EE` على كحلي ليلي `#07071F`، وأخضر للصح `#34D399` وأحمر مرجاني للتحذير `#FB7185` وذهبي للكاش `#FBBF24`. الخط Alexandria.

## إعادة البناء
```bash
cd projects/digital-cards-motion
python3 -I tools/kie_image.py --prompts assets/prompts.json --out assets/img          # الصور (KIE_AI_API_KEY)
python3 -I ../../studio/tools/voice_pipeline.py --provider gemini --voice-text work/voice.txt --caption-text work/voice.txt --out work/   # الصوت (GEMINI_API_KEY)
python3 -I ../../studio/tools/caption_align.py --caption work/voice.txt --words work/words.json --out work/captions.json
python3 -I tools/build_scene.py --captions work/captions.json --out work/scene.json   # التوقيتات + المؤثرات
python3 -I ../../studio/tools/audio_mix.py --voice work/voice.wav --scene work/scene.json --out work/mix.wav
node tools/render.cjs --data work/scene.json --snap 0,8,16,24,30 --outdir work/snap  # لقطات
node tools/render.cjs --data work/scene.json --audio work/mix.wav --out work/video.mp4 --workers 4 --crf 17
```
`production/` فيه نسخة من النص والتوقيتات وتقارير الصوت والفحص والحقوق. الفيديو نفسه ما ينحفظ في المستودع.

## تغيير النص لمتجر معيّن
عدّل `work/voice.txt` (والعبارات في `scene/index.html`)، وأعد الخطوات من الصوت. كل الحركة مربوطة بالكلمات المنطوقة (`W("كلمة")` في `scene/scene.js`)، فلو غيّرت كلمة مفتاحية (أولاً/ثانياً/ثالثاً/اختر...) حدّثها هناك وفي `tools/build_scene.py`.
