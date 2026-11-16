#!/usr/bin/env python3
"""
make_credits.py — يولّد content/production/<ID>/credits.md من تقارير الإنتاج (بدون كتابة يدوية للرخص).

  python3 -I studio/tools/make_credits.py --id <ID> --voice-report work/<ID>/voice_report.json \
      --mix-report work/<ID>/mix.wav.report.json --scene work/<ID>/scene.json [--clips "سطر Pexels" ...]

يكتب: مصدر ورخصة الصوت، المشاهد، الخطوط، كل مؤثر صوتي مستخدم (من manifest.json)، اللقطات،
و**سطر الإسناد الجاهز للوصف** (مطلوب لرخص CC BY — مؤثرات Gravity Sound من Wikimedia Commons).
"""
import argparse, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", required=True); ap.add_argument("--voice-report", required=True)
    ap.add_argument("--mix-report", required=True); ap.add_argument("--scene", required=True)
    ap.add_argument("--clips", nargs="*", default=[])
    a = ap.parse_args()
    vr = json.load(open(a.voice_report, encoding="utf-8")); mr = json.load(open(a.mix_report, encoding="utf-8"))
    sc = json.load(open(a.scene, encoding="utf-8"))
    man = json.load(open(os.path.join(ROOT, "studio", "sfx", "manifest.json"), encoding="utf-8"))
    voice = ("ElevenLabs — Fahad - Saudi, Warm & Confident" if vr.get("provider") == "elevenlabs" else f"Google Gemini TTS ({vr.get('model') or 'gemini-3.1-flash-tts-preview'}) — Charon")
    used = sorted({s["name"] for s in mr.get("sfx", [])})
    lines = [f"# الحقوق — {a.id}", "",
             f"- **التعليق الصوتي:** {voice} — صوت مولّد بالذكاء الاصطناعي.",
             f"- **المشاهد:** مبنية بالكود (Three.js — MIT) — قالب `studio/{sc.get('series')}` (حزمة `{sc.get('style', 'interim')}`).",
             "- **الخطوط:** Baloo Bhaijaan 2، Inter — SIL Open Font License 1.1.",
             "- **الموسيقى:** لا يوجد.", "", "## المؤثرات الصوتية", "| المؤثر | المصدر | الرخصة | الرابط |", "|---|---|---|---|"]
    attributions = []
    for n in used:
        m = man.get(n, {})
        lines.append(f"| {m.get('description', n)} | {m.get('creator', m.get('source', '—'))} | {m.get('license', '—')} | {m.get('landing_url', m.get('source', '—'))} |")
        if "BY" in str(m.get("license", "")).upper() and m.get("attribution"): attributions.append(m["attribution"])
    lines += ["", "## اللقطات", *(a.clips or ["- لا يوجد"]), ""]
    if attributions:
        creators = sorted({m.get("creator", "") for n in used for m in [man.get(n, {})] if "BY" in str(m.get("license", "")).upper()})
        short = f"🔊 مؤثرات صوتية: {', '.join(c for c in creators if c)} (CC BY 4.0) via Wikimedia Commons"
        lines += ["## سطر الإسناد للوصف (مطلوب — CC BY)", f"`{short}`", "", "<details><summary>الإسناد الكامل</summary>", "", *[f"- {x}" for x in attributions], "", "</details>"]
    else:
        lines += ["## سطر الإسناد للوصف", "لا يوجد (كل المؤثرات CC0/إنتاج داخلي)."]
    out = os.path.join(ROOT, "content", "production", a.id, "credits.md"); os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write("\n".join(lines) + "\n"); print(out)

if __name__ == "__main__":
    main()
