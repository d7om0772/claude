# فيديو تيك توك: التجميعات الجاهزة مقابل التجميع

- `src/index.tsx`: مشروع Remotion (موشن جرافيك ولقطات حقيقية وكابشن متزامن مع الصوت)
- `src/words.json`: توقيت كل كلمة في التعليق الصوتي (مستخرج بـ Whisper)
- `public/vo.wav`: التعليق الصوتي من Gemini TTS ‏(gemini-3.8-flash-tts) بصوت Charon
- اللقطات من Pexels (رقم كل مقطع مكتوب في الكود): 34289018، 6755168، 34280528، 8937985، 10470834، 6755162، 36459927، 40316892

للرندر: ضع ملفات Pexels في public/ بأسمائها (ID.mp4) ثم شغّل `npx remotion render src/index.tsx Main out.mp4`
