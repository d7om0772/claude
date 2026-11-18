# أوامر إنشاء العناصر: kie.ai · GPT Image 2

> أوامر جاهزة لتوليد كل عناصر أسلوب «الاستعارة الشارحة».
> الأوامر **بالإنجليزي** (النموذج يفهمها أدق)، والشرح بالعربي. عبّي اللي بين `{{ }}`.
> رموز العناصر (E01…E15) نفسها اللي في `template.md` §7.

---

## 0. إعدادات kie.ai (من التوثيق الرسمي، تم التحقق 2026-11-18)

| البند | القيمة |
|---|---|
| الرابط | `POST https://api.kie.ai/api/v1/jobs/createTask` |
| النتيجة | `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=...` (الحالات: waiting، queuing، generating، success، fail. والروابط في `resultJson` ← `resultUrls`) |
| المصادقة | `Authorization: Bearer $KIE_API_KEY` (المفتاح من متغير بيئة، لا تكتبه بملف) |
| نموذج نص ← صورة | `gpt-image-2-text-to-image` |
| نموذج صورة ← صورة | `gpt-image-2-image-to-image` (‏`input_urls`: حتى **16** صورة مرجعية) |
| `aspect_ratio` | `auto`, `1:1`, `3:2`, `2:3`, `4:3`, `3:4`, `5:4`, `4:5`, `16:9`, `9:16`, `2:1`, `1:2`, `3:1`, `1:3`, `21:9`, `9:21` |
| `resolution` | `1K` / `2K` / `4K`. **حدده دايماً** (التوثيق يطلب كذا). بدقة 2K ما يشتغل: 5:4، 4:5، 3:1، 1:3، 9:21. وبدقة 4K ما يشتغل: 3:1، 1:3، 9:21 |
| `background` | `transparent` / `opaque` / `auto`. **يشتغل بدقة 1K فقط** |
| طول البرومبت | حتى 20,000 حرف |

**مثال طلب:**
```bash
# نص ← صورة
curl -s -X POST "https://api.kie.ai/api/v1/jobs/createTask" \
  -H "Authorization: Bearer $KIE_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-2-text-to-image",
    "input": { "prompt": "<PROMPT>", "aspect_ratio": "9:16", "resolution": "2K" }
  }'
# الرد: {"code":200, "data":{"taskId":"..."}}

# صورة ← صورة (للحفاظ على نفس الأسلوب)
#   "model": "gpt-image-2-image-to-image",
#   "input": { "prompt": "<PROMPT>", "input_urls": ["<STYLE_TILE_URL>", "<HERO_URL>"],
#              "aspect_ratio": "3:4", "resolution": "2K" }

# عنصر شفاف (1K فقط)
#   "input": { "prompt": "<PROMPT>", "aspect_ratio": "1:1", "resolution": "1K", "background": "transparent" }

# النتيجة
curl -s "https://api.kie.ai/api/v1/jobs/recordInfo?taskId=<TASK_ID>" -H "Authorization: Bearer $KIE_API_KEY"
```

> ⚠️ `input_urls` لازم تكون روابط عامة. روابط نتائج kie ممكن تنتهي صلاحيتها، فارفع الصور المعتمدة لمكان دائم (Cloudinary أو Drive عام...) واستخدم روابطها.

---

## 1. طريقة العمل (عشان كل العناصر تطلع من «نفس اليد»)

1. **E01 Style tile أول شي** (text-to-image). اعتمده قبل ما تكمل.
2. **E03 البطل** (image-to-image مع `input_urls: [E01]`).
3. **باقي عناصر عالم القصة** (image-to-image مع `input_urls: [E01, E03]`).
4. **عناصر عالم الفكرة** (text-to-image، بأسلوب UI نظيف، وما تحتاج مرجع).
5. **ولّد 2–4 نسخ لكل عنصر** واختر الأفضل. ما فيه seed، فالثبات يجي من المراجع ومن تكرار «كتل الأسلوب» تحت **حرفياً**.

### ما تولّده بالذكاء الاصطناعي (سوّه بالمونتاج)
| العنصر | ليش |
|---|---|
| كل النصوص والكابشن والعناوين | النموذج يخرّب العربي، والنص لازم يتحرك كلمة كلمة |
| الخط تحت العنوان، وخطوط المخطط النيون، والمسار المتقطع لو بيتحرك | لازم تنرسم (line draw) بالمونتاج |
| التوهج (glow) على البطل والكلمات | أدق وتقدر تحركه كطبقة منفصلة |
| ومضات الانعكاس، والأبيض والأسود، والـblur، والـdip | مؤثرات مونتاج |
| نوافذ الواجهات (UI) وكتابة النص فيها | تسجيل شاشة حقيقي أو تصميم بالمونتاج |
| شعارات تجارية حقيقية | لا تولّدها أبداً. استخدم الملفات الرسمية (لو مسموح لك) أو أيقونات عامة |

---

## 2. كتل الأسلوب (الصقها حرفياً داخل الأوامر)

**`[STORY_STYLE]`**: لعالم القصة (B)
```text
Style: mid-century retro printed illustration in the spirit of vintage travel posters and 1950s magazine ads. Limited rich palette ({{STORY_PALETTE, e.g. muted teal, warm cream, brick red, mustard, deep navy}}), slightly faded inks, visible halftone dots and fine paper grain, confident clean ink outlines, soft cel shading with warm directional light. Flat 2D illustration, not 3D, not photographic.
```

**`[BRAND_BG]`**: لعالم الهوية (A)
```text
Background: a very dark, saturated {{BRAND_HUE, e.g. wine red}} with a soft radial gradient — the center is about three times brighter and fades to almost black at the edges and corners. Subtle film grain. Nothing else in the background.
```

**`[TECH_STYLE]`**: لعالم الفكرة (C)
```text
Style: minimal flat UI graphic, clean vector look, crisp edges, soft subtle drop shadow, premium product-presentation feel. No texture, no illustration style.
```

**`[RULES]`**: تنحط في **كل** أمر
```text
No text, no letters, no numbers, no logos, no brand marks, no watermarks, no signatures. {{NO_LIVING: No people, no faces, no hands, no body parts, no animals, no creatures.}}
```
> احذف سطر `NO_LIVING` لو مجالك يسمح بالأشخاص أو الأيادي.

---

## 3. العناصر

### E01 · لوحة مرجع الأسلوب (Style tile)
**الغرض:** تثبيت الأسلوب والألوان لكل عناصر القصة. ما تظهر في الفيديو.
**الإعدادات:** `gpt-image-2-text-to-image` · `16:9` · `2K` · opaque
```text
A style reference sheet: a clean 3×2 grid of six separate vignettes on plain warm cream paper, all in exactly the same illustration style and palette:
(1) {{HERO_OBJECT}} large and centered;
(2) a small scene of {{PLACE_A}} with generic recognizable cues;
(3) a small scene of {{PLACE_B}} with generic recognizable cues;
(4) one fluffy cumulus cloud;
(5) a small {{GUIDE_OBJECT}} seen from directly above;
(6) a circular rubber-stamp mark with a simple X symbol.
Even spacing, no borders between cells.
[STORY_STYLE]
[RULES]
```

### E02 · خلفية الهوية
**الغرض:** خلفية الهوك والـCTA والقفلة.
**الإعدادات:** `gpt-image-2-text-to-image` · `9:16` · `2K` · opaque
```text
An empty vertical background plate.
[BRAND_BG]
No objects, no shapes, no light rays.
[RULES]
```
> 💡 بديل أسرع: تدرج دائري (radial) بالمونتاج + طبقة grain. ولّدها بس لو تبي ملمس طبيعي أكثر.

### E03 · البطل البصري
**الغرض:** الشي المادي اللي يمسك الاستعارة. يظهر في الهوك والقفلة (وداخل البطاقات).
**الإعدادات (لقطة كاملة):** `gpt-image-2-image-to-image` · `input_urls: [E01]` · `9:16` · `2K` · opaque
**الإعدادات (نسخة للتركيب):** نفس الأمر · `2:3` · `1K` · `background: transparent` (احذف سطر BRAND_BG)
```text
Using the attached style reference, a single {{HERO_OBJECT}} shown large as the hero of a vertical poster.
It rises from the bottom edge of the frame and is cropped by it; its {{KEY_PART}} points straight up and sits slightly below the vertical center.
Centered horizontally, three-quarter front view, slightly angled toward the viewer.
The top third of the image is empty background, reserved for text.
The {{KEY_PART}} is rendered in warm {{ACCENT, e.g. golden amber}} metallic tones; the body in dark muted tones with a thin light rim highlight.
{{HOLD_VARIANT}}
[STORY_STYLE]
[BRAND_BG]
[RULES]
```
- `{{HOLD_VARIANT}}` **بدون كائنات حية (افتراضي):** `It stands on its own, its {{cable/base/stem}} curving down out of the frame.`
- `{{HOLD_VARIANT}}` **مع يد (لو مسموح):** `Held upright from below by a hand in a dark suit sleeve coming in from the bottom-right corner; hand and sleeve are cropped by the frame edges.` (وفي هالحالة احذف `NO_LIVING` من RULES)

### E04 · البطل متوهّج (اختياري)
**الغرض:** لحظة «الضوء = الفهم». **الأفضل** تسويه بالمونتاج (Glow على طبقة منفصلة فوق E03). استخدم هذا الأمر بس لو تبي توهج «مرسوم».
**الإعدادات:** `gpt-image-2-image-to-image` · `input_urls: [E03]` · `9:16` · `2K` · opaque
```text
Keep this exact image unchanged: same composition, framing, object design, colors and grain.
Only add: a soft warm {{ACCENT}} glow emanating from the {{KEY_PART}}, a gentle circular light bloom behind it, and a slightly brighter warm rim light on the edges facing the glow.
Nothing else changes.
[RULES]
```
> ⚠️ ممكن تتغير تفاصيل صغيرة بين E03 وE04. خلّ الانتقال بينهم crossfade في 0.3ث مع push-in عشان يغطي الفرق.

### E05 · لوحة العالم (للسفر)
**الغرض:** اللوحة الكبيرة اللي تتحرك فيها الكاميرا (whip pan وpan طويل) بين الأماكن.
**الإعدادات:** `gpt-image-2-image-to-image` · `input_urls: [E01]` · `16:9` · `4K` · opaque
```text
Using the attached style reference, a wide top-down illustrated {{WORLD_TYPE, e.g. map of continents and ocean | city plan | game board}} used as a camera-travel canvas.
Muted palette: {{e.g. desaturated teal ocean, warm cream land with dark ink coastlines}}, aged paper texture, small ink wave marks on the open areas.
{{AREA_A}} on the right side and {{AREA_B}} on the left side, separated by a wide open area ({{e.g. ocean}}) so a camera can travel between them.
A faint dashed {{dark red}} route line curving between the two areas.
No labels, no place names, no compass text.
[STORY_STYLE]
[RULES]
```
> بدقة 4K (16:9) تقدر تقص منها إطار 1080×1920 وتتحرك أفقياً مسافة كبيرة. لو بتحرك المسار (line draw)، ولّد نسخة **بدون** المسار وارسمه بالمونتاج.

### E06 / E07 · بطاقات الأماكن (مشكلة ثم حل)
**الغرض:** «إطار داخل إطار» فوق لوحة العالم. بطاقة لكل مكان، وكل بطاقة بنسختين.
**الإعدادات (مشكلة):** `gpt-image-2-image-to-image` · `input_urls: [E01, E03]` · `3:4` · `2K` · opaque
```text
Using the attached references (style and hero object), a vertical postcard-style illustration with a white deckled paper border, filling the frame.
Scene: {{PLACE}}, {{interior/exterior}} with clear but generic visual cues of {{PLACE}} ({{cues, e.g. window view, furniture, landmark silhouette}}), {{time of day}} light.
In the foreground, the same {{HERO_OBJECT}} as the reference {{PROBLEM_ACTION, e.g. is pushed toward a {{TARGET}} but clearly does not fit}}. The mismatch is obvious at a glance.
Leave the top 15% of the card calm and uncluttered.
[STORY_STYLE]
[RULES]
```
**الإعدادات (حل):** `gpt-image-2-image-to-image` · `input_urls: [بطاقة المشكلة]` · `3:4` · `2K` · opaque
```text
Same postcard, same scene, same camera angle, colors and grain.
Change only this: the {{HERO_OBJECT}} now fits perfectly into the {{TARGET}}, connected and working, with a few small warm light sparkles around the connection.
[RULES]
```
> لا تحط الأختام ✗/✓ داخل البطاقة. حطها كطبقة (E08) عشان تقدر تحركها.
> مكان A ومكان B: نفس الأمر بتغيير `{{PLACE}}` و`{{cues}}` و`{{TARGET}}`، مع الحفاظ على نفس `{{time of day}}` أو التباين بينهم (نهار/ليل) للتنويع.

### E08 · الأختام ✗ و ✓
**الإعدادات:** `gpt-image-2-text-to-image` · `1:1` · `1K` · `background: transparent` (أمرين)
```text
A single circular rubber-stamp mark: a bold hand-inked {{X symbol | checkmark}} inside a thick circle, {{brick-red | emerald-green}} ink, slightly uneven distressed print texture, flat front view, centered, isolated on a transparent background.
The X is a graphic symbol, not a letter.
[RULES]
```

### E09 · دليل الحركة
**الغرض:** الشي اللي تلحقه الكاميرا في الـwhip pan.
**الإعدادات:** `gpt-image-2-image-to-image` · `input_urls: [E01]` · `1:1` · `1K` · `background: transparent`
```text
Using the attached style reference, a small {{GUIDE_OBJECT, e.g. retro propeller airplane | vintage car | paper plane | arrow}} seen from directly above, pointing to the {{right}}, cream and red tones, isolated on a transparent background, no ground shadow.
[STORY_STYLE]
[RULES]
```
> ولّد نسخة تأشّر للجهة الثانية لرحلة الرجوع، أو اقلبها (flip) بالمونتاج.

### E10 · غيوم / طبقات parallax
**الإعدادات:** `gpt-image-2-image-to-image` · `input_urls: [E01]` · `3:2` · `1K` · `background: transparent`
```text
Using the attached style reference, three separate fluffy cumulus clouds in cream and soft beige with gentle shading, spaced apart with clear gaps between them, isolated on a transparent background.
[STORY_STYLE]
[RULES]
```
> بدّل الغيوم بأي طبقة أمامية تناسب لوحة عالمك (أوراق شجر، بخار، دخان...).

### E11 · خلفية عالم الفكرة
**الإعدادات:** `gpt-image-2-text-to-image` · `9:16` · `2K` · opaque
```text
A completely empty vertical background: near-black neutral charcoal (around #121214), very subtle vignette and ultra-fine grain, no color cast, no shapes, no light effects.
[RULES]
```
> 💡 أسهل بالمونتاج: لون مصمت + noise بنسبة 2–3%.

### E12 · شريحة المركز (Hub chip)
**الغرض:** العنصر المركزي في مخطط الآلية. النص والتوهج النيون يضافون بالمونتاج.
**الإعدادات:** `gpt-image-2-text-to-image` · `3:2` · `1K` · `background: transparent`
```text
A single rounded-rectangle badge, very dark near-black fill, thin {{ACCENT}} metallic border, front view, flat, completely empty center, isolated on a transparent background.
[TECH_STYLE]
[RULES]
```

### E13 · بلاطات الأدوات (Tiles)
**الغرض:** أطراف المخطط. **أمر لكل بلاطة.**
**الإعدادات:** `gpt-image-2-text-to-image` · `1:1` · `1K` · `background: transparent`
```text
A single white rounded-square app tile (squircle) with a soft subtle shadow, and a simple flat generic {{ICON_CONCEPT, e.g. cloud folder | document | 3D cube | paint brush | bar chart | envelope}} glyph centered inside in {{COLOR}}.
A generic icon, not resembling any real company's logo. Isolated on a transparent background.
[TECH_STYLE]
[RULES]
```
> ⚠️ لو المثال عن منتجات حقيقية: استخدم الشعار الرسمي من صفحة الإعلام حقت الشركة (لو سياستك وسياسة المنصة تسمح)، **ولا تولّده**. لو حسابك يمنع الشعارات، خلّ الأيقونة عامة واكتب اسم المنتج نص تحتها.

### E14 · بطاقة النتيجة
**الغرض:** النتيجة اللي تطلع (rise-in) في نهاية المثال.
**الإعدادات:** `gpt-image-2-text-to-image` · `4:3` · `1K` · `background: transparent`
```text
A cream-colored rounded card resembling a summary document: one short thick heading bar aligned to the top-right with a thin {{ACCENT}} underline, and five grey text-line bars of varying lengths aligned to the right below it.
Flat, soft shadow, isolated on a transparent background, no readable text.
[TECH_STYLE]
[RULES]
```
> المحاذاة لليمين مقصودة (عربي). العنوان الحقيقي يُكتب فوقها بالمونتاج.

### E15 · طبقات المؤثرات (Overlays)
**تُستخدم بوضع دمج Screen/Add (للضوء) أو Overlay/Soft Light (للملمس).**

**E15a · توهج:** `text-to-image` · `1:1` · `1K` · opaque
```text
A soft radial {{ACCENT}} light bloom centered on a pure black background, smooth gradual falloff, no hard edges, no shapes, no rays.
[RULES]
```
**E15b · غبار ضوئي:** `text-to-image` · `9:16` · `2K` · opaque
```text
Sparse tiny {{ACCENT}} dust particles and small soft bokeh dots floating on a pure black background, varied sizes and focus, concentrated around the middle of the frame.
[RULES]
```
**E15c · ملمس ورق:** `text-to-image` · `1:1` · `2K` · opaque
```text
A seamless tileable subtle paper texture, neutral mid-grey, fine grain and faint fibers, evenly lit, no shadows, no vignette, no stains.
[RULES]
```
> ملمس الورق فوق عالم القصة بشفافية 10–20%. والغبار الضوئي حول لحظة الحل والـCTA.

---

## 4. ثابت ومتغير في العناصر

| | ثابت | متغير |
|---|---|---|
| الأسلوب | 3 كتل أسلوب (قصة، هوية، فكرة) + RULES بكل أمر | لوحة ألوان القصة، ولون الهوية، ولون التمييز |
| البطل | شي مادي واحد، بالوسط، مقصوص من تحت، الثلث العلوي فاضي، جزء منه بلون التمييز | الشي نفسه وطريقة وقفته |
| القصة | لوحة عالم 16:9 4K + بطاقات 3:4 بإطار + أختام + دليل + طبقة أمامية | نوع العالم والأماكن والدليل |
| الفكرة | بلاطات بيضاء + شريحة مركز داكنة + بطاقة نتيجة، على فحمي | الأيقونات والأدوات |
| الشفافية | كل عنصر يتحرك لحاله: 1K + transparent | — |

---

## 5. فحص كل صورة قبل الاعتماد
- [ ] ما فيها نص أو حروف أو أرقام أو شعارات (حتى المشوّهة).
- [ ] ما فيها كائنات حية (لو قيودك تمنع)، وانتبه للانعكاسات والصور داخل الصور.
- [ ] نفس أسلوب الـStyle tile (الخطوط، والحبيبات، والألوان).
- [ ] البطل بنفس التصميم في كل البطاقات.
- [ ] الثلث العلوي فاضي في اللقطات اللي فوقها كابشن.
- [ ] الحواف الشفافة نظيفة (ما فيها هالة بيضاء أو بقايا خلفية).
- [ ] الدقة كافية للقص والتقريب (اللوحات الكبيرة 4K، والخلفيات 2K).
- [ ] احفظ لكل صورة: الأمر، والإعدادات، والتاريخ، في ملف الحقوق.
