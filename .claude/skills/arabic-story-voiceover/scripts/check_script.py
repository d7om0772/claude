#!/usr/bin/env python3
"""فحص سكريبت التعليق الصوتي قبل التسليم.

الاستخدام:
    python3 scripts/check_script.py <ملف_النص>
    cat script.txt | python3 scripts/check_script.py -

يفحص المقاييس المستخلصة من نصوص المرجع (قناة "العِلم عندي") ويطبع
تقريراً بالمخالفات. الهدف مساعدتك على ضبط الإيقاع، لا رفض النص —
راجع كل تنبيه واحكم عليه، فبعض الأسطر الطويلة مقبولة إذا كانت تُقال
بنفَس واحد مرتاح.
"""

import re
import sys

# كل الأرقام مقاسة من نصوص المرجع الخمسة (١٧٧ سطراً، ٩٢٠ كلمة، ٣٨١ ثانية)
WPM = 145                 # متوسط سرعة الإلقاء
# المرجع ١٤٨-٢٠٩ كلمة، لكن النطاق المفضّل أضيق عمداً: النصف الأدنى
# أوقع، والحد الأعلى سقف لا هدف. الحد الأدنى إشارة على بنية ناقصة فقط.
WORDS_MIN, WORDS_SWEET_MAX, WORDS_MAX = 115, 175, 210
LINE_WORDS_TARGET = 5.2   # متوسط الكلمات لكل سطر
LINE_WORDS_LONG = 7       # ١٢٪ من أسطر المرجع تتجاوزها — مقبول بنسبة قليلة
LINE_WORDS_HARD = 8       # ٨٪ فقط تتجاوزها — هذه تُعرض سطراً سطراً
LONG_RATIO_MAX = 0.20     # فوق هذه النسبة يكون التطويل نمطاً لا استثناء
HOOK_WORDS_MAX = 10
# المعلومات العددية في المرجع: ١-٣ معلومات لكل سكريبت (٠٫٧-١٫٥٪)،
# و٨ في الخامس (٤٫٩٪، شاذ لأن الجدول الزمني نفسه موضوع القصة).
# الحد ~١٫٧ ضعف أكثف نص طبيعي: يسمح بأربع معلومات ويمسك التكديس.
# ملاحظة: هذا يقيس الأعداد فقط. تكديس أسماء الأعلام والاستطرادات
# لا يُقاس آلياً — تمريرة الحذف في SKILL.md هي أداته.
NUM_RATIO_MAX = 0.025

# جذوع ألفاظ الأعداد والأزمنة — مؤشر على كثافة التفاصيل.
# تُطابَق بعد تجريد السوابق (و، ف، ب، ك، ل، ال) لأن اللواصق العربية
# تكسر حدود الكلمة في التعابير النمطية.
NUM_STEMS = (
    "اثنين", "ثنتين", "ثلاث", "أربع", "اربع", "خمس", "ست", "سبع", "ثمان", "تسع",
    "عشر", "عشرين", "ثلاثين", "أربعين", "خمسين", "ستين", "سبعين", "ثمانين", "تسعين",
    "خمستعشر", "مية", "مئة", "مئتين", "ميتين", "ألف", "الف", "آلاف", "مليون", "مليار",
    "سنة", "سنين", "سنوات", "شهر", "شهور", "أشهر", "ساعة", "ساعات",
    "دقيقة", "دقائق", "يوم", "أيام", "عام", "قرن", "عقد",
    "تسعينات", "ثمانينات", "سبعينات", "ستينات", "خمسينات", "أربعينات",
)
STRIP_PREFIX = ("وال", "بال", "كال", "فال", "لل", "ال", "و", "ف", "ب", "ك", "ل")
PUNCT = "،.؟!:؛\"'«»"


def is_number_word(token: str) -> bool:
    """هل هذه الكلمة لفظ عدد أو زمن، بعد تجريد السوابق واللواحق؟"""
    t = token.strip(PUNCT)
    for pre in STRIP_PREFIX:          # السوابق مرتبة من الأطول للأقصر
        if t.startswith(pre) and len(t) > len(pre) + 1:
            t = t[len(pre):]
            break
    return any(t.startswith(s) for s in NUM_STEMS)

# ما يتعثر فيه محرك تحويل النص لصوت
LATIN = re.compile(r"[A-Za-z]")
DIGITS = re.compile(r"[0-9٠-٩]")
NOISE = {
    "…": "نقاط ثلاث",
    "...": "نقاط ثلاث",
    "(": "قوس",
    ")": "قوس",
    "[": "قوس معقوف",
    "]": "قوس معقوف",
    "*": "نجمة ماركداون",
    "#": "هاشتاق",
    "_": "شرطة سفلية",
    "—": "شرطة طويلة",
    "!!": "تعجب مكرر",
}
# فصحى إخبارية تكسر نبرة الراوي
FORMAL = ["يُعتبر", "يعتبر", "حيث أن", "حيث ان", "قام بـ", "قامت بـ",
          "لم يكن", "لن يكون", "سوف", "إذ أن", "اذ ان", "الذي", "التي",
          "هؤلاء", "لقد", "قد تم", "تجدر الإشارة"]
# علامات الأسلوب المميزة
MARKERS = ["عموما", "عموماً", "المهم", "الزبدة", "والصدمة", "المصيبة",
           "النتيجة", "وصدق", "الصدق", "تدري", "والسؤال", "هالـ", "هال"]


def main() -> int:
    src = sys.argv[1] if len(sys.argv) > 1 else "-"
    raw = sys.stdin.read() if src == "-" else open(src, encoding="utf-8").read()

    lines = [ln.strip() for ln in raw.strip().splitlines() if ln.strip()]
    if not lines:
        print("لا يوجد نص.")
        return 1

    words = sum(len(ln.split()) for ln in lines)
    dur = words / WPM * 60
    avg = words / len(lines)

    print("=" * 52)
    print(f"الأسطر: {len(lines)}   الكلمات: {words}   الزمن المتوقع: {dur:.0f} ثانية")
    print(f"متوسط الكلمات/سطر: {avg:.1f}   (هدف المرجع ~{LINE_WORDS_TARGET})")
    print("=" * 52)

    warns: list[str] = []

    # الحد الأدنى إشارة على مقطع ناقص، لا دعوة لإضافة كلمات.
    # الحشو لتبليغ عدد معين هو نفسه سبب التمطيط الذي نحاربه.
    if words < WORDS_MIN:
        warns.append(
            f"{words} كلمة (≈{dur:.0f} ث) — قصير. راجع إن كان سقط مقطع من "
            "البنية (تعريف؟ نتيجة؟ درس؟). إذا كانت المقاطع كلها موجودة "
            "فالنص سليم ولا يحتاج حشواً."
        )
    elif words > WORDS_SWEET_MAX:
        warns.append(
            f"{words} كلمة (≈{dur:.0f} ث) — أطول من النطاق المفضّل "
            f"({WORDS_MIN}-{WORDS_SWEET_MAX}). المرجع يصل {WORDS_MAX}، لكن الأقصر أوقع: "
            "دوّر على إعادة صياغة الفكرة مرتين، أو درسين بدل درس، أو أسطر ربط فارغة."
        )
    if avg > LINE_WORDS_TARGET + 0.6:
        warns.append(
            f"متوسط الكلمات/سطر {avg:.1f} أعلى من المرجع — قسّم الأسطر الطويلة."
        )
    elif avg < LINE_WORDS_TARGET - 1.4:
        warns.append(
            f"متوسط الكلمات/سطر {avg:.1f} أقل من المرجع — النص مقطّع زيادة، "
            "ادمج الأسطر القصيرة عشان السرد ما يصير متقطعاً."
        )

    hook = len(lines[0].split())
    if hook > HOOK_WORDS_MAX:
        warns.append(f"الخطاف {hook} كلمات — قصّره إلى {HOOK_WORDS_MAX} أو أقل.")

    # سطر طويل واحد أو اثنان طبيعي في المرجع؛ المشكلة لما يصير التطويل نمطاً
    longs = [ln for ln in lines if len(ln.split()) > LINE_WORDS_LONG]
    ratio = len(longs) / len(lines)
    if ratio > LONG_RATIO_MAX:
        warns.append(
            f"{len(longs)} من {len(lines)} سطر ({ratio*100:.0f}٪) أطول من "
            f"{LINE_WORDS_LONG} كلمات — في المرجع النسبة ١٢٪. التطويل صار نمطاً، "
            "اكسر الأسطر عند أول واو أو فاصلة."
        )

    hard = [(i + 1, ln) for i, ln in enumerate(lines) if len(ln.split()) > LINE_WORDS_HARD]
    if hard:
        warns.append(f"{len(hard)} سطر يصعب قوله بنفَس واحد (أكثر من {LINE_WORDS_HARD} كلمات):")
        for n, ln in hard:
            warns.append(f"      سطر {n} ({len(ln.split())} كلمة): {ln}")

    for i, ln in enumerate(lines, 1):
        if LATIN.search(ln):
            warns.append(f"سطر {i}: حروف لاتينية — اكتب الاسم بحروف عربية.")
        if DIGITS.search(ln):
            warns.append(f"سطر {i}: أرقام — اكتبها حروفاً.")
        for sym, name in NOISE.items():
            if sym in ln:
                warns.append(f"سطر {i}: {name} ({sym}) — يربك محرك الصوت.")

    # كثافة التفاصيل: أكثر انحراف يشتكي منه المستخدمون هو حشو النص بالمعلومات
    # تُدمج الألفاظ المتتالية في تعبير واحد، فالسنة المكتوبة حروفاً
    # ("ألف وتسعمية وخمسة وتسعين") معلومة واحدة لا خمس.
    nums, run = [], []
    for tok in raw.split():
        if is_number_word(tok):
            run.append(tok.strip(PUNCT))
        elif run:
            nums.append(" ".join(run))
            run = []
    if run:
        nums.append(" ".join(run))
    nratio = len(nums) / words
    if nratio > NUM_RATIO_MAX:
        warns.append(
            f"{len(nums)} معلومة عددية ({nratio*100:.1f}٪): "
            f"{'، '.join(nums[:6])} — في المرجع ١-٣ فقط. طبّق تمريرة الحذف: "
            "كل تفصيلة ما تبني المفارقة ولا تصعّد التوتر ولا تجهّز الانقلاب، احذفها."
        )

    hits = [w for w in FORMAL if w in raw]
    if hits:
        warns.append("فصحى إخبارية تكسر نبرة الراوي: " + "، ".join(hits))

    found = sorted({m for m in MARKERS if m in raw})
    if len(found) < 3:
        warns.append(
            "علامات الأسلوب قليلة — استخدم كلمات مفصلية مثل: "
            "عموماً / الزبدة / والصدمة إن / النتيجة / والسؤال."
        )

    # السؤال الختامي هو العنصر الوحيد الموجود في نصوص المرجع الخمسة كلها
    tail = lines[-3:]
    asks = ("وش", "هل", "من ", "ليش", "كم ", "قد ", "أيهم", "ايهم")
    if not any("والسؤال" in ln or "؟" in ln or ln.startswith(asks) for ln in tail):
        warns.append("ما فيه سؤال ختامي واضح في آخر الأسطر — لا يخلو منه أي نص مرجعي.")

    if warns:
        print("\nتنبيهات:")
        for w in warns:
            print("  • " + w if not w.startswith("      ") else w)
    else:
        print("\nما فيه تنبيهات — النص مطابق لمقاييس المرجع.")

    print(f"\nعلامات الأسلوب الموجودة: {'، '.join(found) if found else 'لا شيء'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
