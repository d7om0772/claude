# مثال تطبيقي: «الاستعارة الشارحة» على فيديو تيربو

> **مثال فقط (مو منشور ولا داخل التقويم).** موضوعه من فكرة التقويم `2026-11-27-01` (troubleshooting): «البنق عالي بالألعاب: الواي فاي ولا الكيبل؟».
> نظام الأسلوب: `brand/style-systems/metaphor-explainer/` · القالب: `studio/metaphor/` · انعمل 2026-11-18 بطلب صاحب الحساب.

## الاستعارة
- **البطل:** مضرب وكورة بنق بونق (جماد): «البنق = رحلة رايح جاي لبيانات لعبتك».
- **لوحة العالم:** خريطة حي من فوق. **المكان A:** غرفة بعيدة عن الراوتر وبينها جدارين. **المكان B:** صالة مزحومة أجهزة وشبكات.
- **الحل:** «ممر خاص» (أنبوب زجاج) = كيبل Ethernet.
- **التنويع عن المرجع:** الحل يرجع على A ثم B (بنفس ترتيب الكلام: «لا جدار… ولا زحمة») بدل الترتيب العكسي، لأن التزامن مع الكلام أهم.

## نص الكابشن (= التعليق الصوتي، والأرقام والمصطلحات بالإنجليزي)
`caption.txt` · نص التعليق بقواعد النطق: `voice.txt` (Wi-Fi ← «الواي فاي»، Ethernet ← «الإيثرنت»، 5GHz ← «الخمسة قيقاهيرتز»).

## الادعاءات والمراجع (تاريخ الوصول 2026-11-18)
| # | الادعاء | المصدر |
|---|---|---|
| 1 | البنق = الوقت (بالملي ثانية) اللي ياخذه الطلب يروح للوجهة ويرجع، والـping أداة تقيسه | Cloudflare — What is round-trip time (RTT): https://www.cloudflare.com/learning/cdn/glossary/round-trip-time-rtt/ |
| 2 | على الواي فاي: التداخل، والبعد عن الراوتر، وضعف الإشارة ممكن تسبب فقد حزم (packet loss)، وهذا يسبب lag spikes | Intel — How to Fix Packet Loss: https://www.intel.com/content/www/us/en/gaming/resources/how-to-fix-packet-loss.html |
| 3 | «جرّب كيبل Ethernet وقارن النتيجة» | Intel (نفس الصفحة): "Try switching to a wired connection using an ethernet cable, then compare results." |
| 4 | الجدران تضعف الإشارة (خصوصاً الترددات الأعلى) | Netgear — 2.4 GHz vs 5 GHz vs 6 GHz: https://www.netgear.com/hub/wifi/routers/difference-2-4-ghz-5-ghz-and-6-ghz/ |
| 5 | 5GHz أقل زحمة (قنوات أكثر وتداخل أقل)، بس مداها أقصر، عشان كذا الشرط «وقريب منه؟» | Netgear (نفس الصفحة) |
| 6 | اللعب يهمه البنق والاستقرار، مو بس السرعة | Intel — Wired vs Wi-Fi gaming: https://www.intel.com/content/www/us/en/gaming/resources/wired-vs-wifi-gaming.html |

**حذفت لعدم الدقة:** ادعاء إن الواي فاي «دايماً» أسوأ. صفحة Intel نفسها تقول إن الواي فاي الحديث صار قريب من الكيبل لو الإشارة قوية، فالسكربت يربط المشكلة بالبعد والجدران والزحمة فقط.
**ما مر على `fact-checker`:** هذا مثال؛ لو انعتمد للنشر لازم يمر على المدقق مثل أي سكربت.

## الإنتاج
| البند | القيمة |
|---|---|
| المدة | 45.8ث (القالب 45ث في `template.md`) |
| الصوت | Gemini Charon (`gemini-3.8-flash-tts`) — ElevenLabs ما كان متصل. تطابق Whisper 0.839 (أقل من 0.85 بسبب لهجة: «بنق←بنك»، «قيقا←جيجا»، «زحمة←سحمة»)؛ الكلام نفسه صحيح |
| الصور | kie.ai · GPT Image 2 — 6 صور = 62 كريدت (البطل 1K شفاف، اللوحة 4K، 4 بطاقات 2K؛ نسختين الحل image-to-image من نسخة المشكلة). الأوامر في `prompts/` |
| الرندر | `studio/render.cjs --series metaphor` · 30fps · crf 18 · 55MB |
| الفحص | `qa_video.py` بدون issues: −14.0 LUFS، True Peak −3.0، صفر مخالفات مناطق آمنة |
| المؤثرات | 40 مؤثر من `studio/sfx` (whoosh/thud/ding/pop/chime) — بدون موسيقى |

## إعادة الإنتاج
```bash
mkdir -p work/EX-ping/assets   # الصور من kie.ai (prompts/ + kie.py) بأسماء: hero.png canvas.jpg cardA.jpg cardA_fix.jpg cardB.jpg cardB_fix.jpg logo_crop.png
python3 -I studio/tools/voice_pipeline.py --provider gemini --voice-text work/EX-ping/voice.txt --caption-text work/EX-ping/caption.txt --out work/EX-ping/ --max-gap 0.32
python3 -I studio/tools/caption_align.py --caption work/EX-ping/caption.txt --words work/EX-ping/words.json --out work/EX-ping/captions.json
python3 -I work/EX-ping/build_scene.py        # نسخة من content/examples/EX-ping/build_scene.py
python3 -I studio/tools/audio_mix.py --voice work/EX-ping/voice.wav --scene work/EX-ping/scene.json --out work/EX-ping/mix.wav
node studio/render.cjs --series metaphor --data work/EX-ping/scene.json --audio work/EX-ping/mix.wav --out work/EX-ping/video.mp4 --workers 3 --crf 18 --parts 2 --part 1   # ثم --part 2 ثم --assemble
```
