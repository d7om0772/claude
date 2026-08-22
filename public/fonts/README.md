# الخطوط

```
thmanyah-serif-display-Black.woff2     الوزن 900 — السطر الضخم
thmanyah-serif-display-Medium.woff2    الوزن 500 — السطر الصغير والكابشن
```

عائلة واحدة (`thmanyah serif display`) بوزنين، لا عائلتان منفصلتان.

المصدر الرسمي: font.thmanyah.com — الأصل بصيغة `.otf`، وحُوّل إلى `woff2`
لتقليل الحجم (٢٤٨ك ← ٧٩ك، و ٢٤٩ك ← ٨٢ك) بلا أي فقد في الشكل.

**الملفات مستثناة من git** احتراماً لرخصة ثمانية التي تمنع إعادة الاستضافة
العلنية. بدونها القالب يشتغل لكن بخط عربي بديل مع تحذير في السجل، والضبط
يختلف عن التصميم الأصلي لأن قياسات `measureText` تتغيّر فتنزاح محطات الوقوف.

## إعادة التحويل من otf

```bash
pip install fonttools brotli
python3 -c "
from fontTools.ttLib import TTFont
f = TTFont('thmanyahserifdisplayBlack.otf'); f.flavor='woff2'
f.save('public/fonts/thmanyah-serif-display-Black.woff2')
"
```
