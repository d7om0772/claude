# تحديث لوحة تيربو (آخر خطوة في كل مهمة مجدولة)

**صفحتين يشوف فيها صاحب الحساب الشغل:**
- **متابعة تيربو** (الجوال — **الأهم**): https://claude.ai/artifact/PrWHxTrQfN1GKoUkZFFyKs — صفحة HTML واحدة البيانات داخلها، تنبني من `studio/dashboard/status_template.html`.
- **لوحة تيربو** (الكمبيوتر، لوحة Data — ما تفتح على iOS القديم): https://claude.ai/artifact/8iyutVvJT3xEYyjPpkAyje
- منشورات Schedulin فيها **مباشرة** (تنقرا وقت فتح اللوحة) — ما تحتاج تحديث.
- التقويم وسجل التشغيل والمواعيد **ملفات** ترفعها أنت هنا في نهاية كل مهمة، بعد سطر `runs.md` و`git_save`.

**الفشل هنا ما يوقف شي:** لو أي خطوة فشلت، أضف ملاحظة في سطر `runs.md` ("اللوحة ما تحدثت: <السبب>") واحفظ، وانتهِ.

## الخطوات
1. `python3 -I scripts/build_status_page.py` ← يطلع `work/dashboard/status.html` ومعه `calendar.json` و`runs.json` و`tasks.json`.
2. **صفحة الجوال:** أداة `Artifact` بـ `action: "read"` و`url` = رابط "متابعة تيربو" (لازم قبل النشر من محادثة ما نشرتها)، ثم `Artifact` publish بـ `url` نفسه و`file_path` = `work/dashboard/status.html` (بدون `icon`). لو رجع رفض بنسخة أحدث: انشر ملفك فوقها عادي (الصفحة كلها مولّدة من المستودع).
3. **لوحة Data:** لكل ملف من الثلاثة (الملف ↔ مجموعة البيانات بنفس الاسم: `calendar` / `runs` / `tasks`):
   1. ارفعه للوحة كأصل: أداة `Artifact` بـ `url` = رابط اللوحة، `file_path` = مسار الملف، `asset: true` ← خذ الرابط اللي يرجع (`/_blob/<id>`).
   2. اقرأ وثيقة مجموعة البيانات: `ArtifactData` `get` بـ `collection: "datasets"` و`doc_id: "<الاسم>"` ← خذ `version` والرابط القديم `source.url`.
   3. حدّثها: `ArtifactData` `update` بـ `if_version` = النسخة، و`data`:
      `{"source": {"url": "/_blob/<id الجديد>"}, "updated": {"at": "<UTC ISO الحين>", "by": "المشغّل (<المهمة>)"}, "edit": {"via": "claude", "at": "<UTC ISO الحين>"}}`
      (update يدمج: الباقي من `source` — `kind` و`name` و`format` — يبقى كما هو.)
   4. احذف الأصل القديم: أداة `Artifact` بـ `action: "delete"` و`url` = رابط اللوحة و`path` = المعرّف القديم (الـ 32 حرف بعد `/_blob/`) — **فقط** لو المعرّف القديم يختلف عن الجديد.
4. لا تعدّل `files/index.html` ولا مجموعات البيانات الثانية (`posts`) من المهام المجدولة — تعديل شكل اللوحة شغل المدير بطلب صاحب الحساب.
