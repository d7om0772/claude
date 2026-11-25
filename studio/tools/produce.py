#!/usr/bin/env python3
"""produce.py — خط إنتاج الفيديو الآلي (بطلب صاحب الحساب 2026-11-25: تقليل التوكنز).
صانع الفيديو يسوي الجزء الإبداعي بس (جدول المشاهد + scene_draft.json + مراجعة ورقة لقطات وحدة)،
والباقي هنا بأوامر قصيرة ومخرجات مختصرة. كل الخطوات تكمل من وين وقفت (لو ناتجها موجود وأحدث، تتخطاها).

  python3 -I studio/tools/produce.py prep  <ID> [--provider gemini|elevenlabs --audio F] [--redo-voice]
      ← السكربت ← caption.txt/voice.txt ← الصوت (voice_pipeline) ← captions.json
      ← يطبع الكلمات بأرقامها وتوقيتها (للربط في scene_draft.json) + ملخص سطر واحد
  python3 -I studio/tools/produce.py build <ID> [--cover-t 1.0] [--max-minutes 9]
      ← scene_build ← audio_mix ← render (أجزاء لو > 40ث) ← qa ← ورقة لقطات وحدة ≤ 900px ← الغلاف ← credits
      ← ينسخ الملفات لـ content/production/<ID>/ ويطبع ملخص JSON. كود 3 = الرندر ما خلص بالوقت: أعد نفس الأمر.
  python3 -I studio/tools/produce.py upload <ID> --sign work/<ID>/sign.json --cover-sign work/<ID>/sign_cover.json
                                       [--voice "gemini (السبب)"] [--note "..."]
      ← يرفع الفيديو والغلاف ← upload.json ← cal.py set (فيديو جاهز) ← git_save

السجلات الكاملة في work/logs/<ID>-<step>.log (اقرأ آخر 30 سطر فقط لو فشل).
"""
import argparse, glob, json, os, re, shutil, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import cal  # noqa: E402

PY, T0 = sys.executable, time.time()
TOOLS = os.path.join(ROOT, "studio", "tools")


def p(*a): return os.path.join(ROOT, *a)


def newer(a, *bs):
    """a موجود وأحدث من كل bs الموجودة."""
    if not os.path.exists(a): return False
    return all(not os.path.exists(b) or os.path.getmtime(a) >= os.path.getmtime(b) for b in bs)


def run(step, rid, cmd, ok=(0,)):
    os.makedirs(p("work", "logs"), exist_ok=True)
    log = p("work", "logs", f"{rid}-{step}.log")
    with open(log, "w", encoding="utf-8") as f:
        r = subprocess.run(cmd, cwd=ROOT, stdout=f, stderr=subprocess.STDOUT)
    if r.returncode not in ok:
        tail = open(log, encoding="utf-8", errors="replace").read().splitlines()[-30:]
        print(f"✗ {step} فشل (كود {r.returncode}) — آخر 30 سطر من {os.path.relpath(log, ROOT)}:", *tail, sep="\n")
        sys.exit(1)
    return r.returncode


def row_of(rid):
    _, rows, _ = cal.load()
    r = next((x for x in rows if x["id"] == rid), None)
    if not r: sys.exit(f"ID مو في التقويم: {rid}")
    return r


def script_of(rid, r):
    if r.get("script") and os.path.exists(p(r["script"])): return p(r["script"])
    m = sorted(glob.glob(p("content", "scripts", f"{rid}-*.md")))
    if not m: sys.exit(f"ما لقيت سكربت {rid}")
    return m[-1]


def section(md, title):
    m = re.search(rf"^## {re.escape(title)}\s*\n(.*?)(?=^## |\Z)", md, re.M | re.S)
    if not m: sys.exit(f"القسم '{title}' مو موجود في السكربت")
    lines = [l.strip() for l in m.group(1).splitlines()]
    return "\n".join(l for l in lines if l and not l.startswith(("```", ">", "<!--")))


# ---------------------------------------------------------------- prep
def prep(a):
    rid = a.id; r = row_of(rid); series = r["series"]
    w = p("work", rid); os.makedirs(w, exist_ok=True); os.makedirs(p("content", "production", rid), exist_ok=True)
    md = open(script_of(rid, r), encoding="utf-8").read()
    open(os.path.join(w, "caption.txt"), "w", encoding="utf-8").write(section(md, "نص الكابشن") + "\n")
    open(os.path.join(w, "voice.txt"), "w", encoding="utf-8").write(section(md, "نص التعليق الصوتي") + "\n")
    rep = os.path.join(w, "voice_report.json")
    if a.redo_voice or not newer(rep, os.path.join(w, "voice.txt")):
        cmd = [PY, "-I", os.path.join(TOOLS, "voice_pipeline.py"), "--provider", a.provider,
               "--voice-text", os.path.join(w, "voice.txt"), "--caption-text", os.path.join(w, "caption.txt"), "--out", w]
        if a.audio: cmd += ["--audio", a.audio]
        if series == "tech-news": cmd += ["--max-gap", "0.25"]
        rc = run("voice", rid, cmd, ok=(0, 2))
        if rc == 2: print("⚠ voice_pipeline رجّع 2 (تطابق ضعيف) — راجع work/logs/%s-voice.log قبل ما تكمل" % rid)
    cap = os.path.join(w, "captions.json")
    if not newer(cap, os.path.join(w, "words.json"), os.path.join(w, "caption.txt")):
        run("align", rid, [PY, "-I", os.path.join(TOOLS, "caption_align.py"), "--caption", os.path.join(w, "caption.txt"),
                           "--words", os.path.join(w, "words.json"), "--out", cap])
    vr, cj = json.load(open(rep, encoding="utf-8")), json.load(open(cap, encoding="utf-8"))
    i, out = 0, []
    for li, line in enumerate(cj["lines"]):
        ws = []
        for x in line["words"]:
            ws.append(f"{i}:{x['w']}@{x['start']:.2f}"); i += 1
        out.append(f"L{li} " + " ".join(ws))
    open(os.path.join(w, "words_index.txt"), "w", encoding="utf-8").write("\n".join(out) + "\n")
    print("\n".join(out))
    print(json.dumps({"id": rid, "series": series, "provider": vr.get("provider"), "model": vr.get("model"),
                      "voice_s": vr.get("duration"), "tempo": vr.get("tempo"), "match": cj.get("match_ratio"),
                      "next": f"اكتب content/production/{rid}/scenes.md و work/{rid}/scene_draft.json ثم: produce.py build {rid}"},
                     ensure_ascii=False))


# ---------------------------------------------------------------- build
def build(a):
    rid = a.id; r = row_of(rid); series = r["series"]; w = p("work", rid)
    draft, cap, vr = (os.path.join(w, n) for n in ("scene_draft.json", "captions.json", "voice_report.json"))
    scene, mix, video = (os.path.join(w, n) for n in ("scene.json", "mix.wav", "video.mp4"))
    for f in (draft, cap, vr, os.path.join(w, "voice.wav")):
        if not os.path.exists(f): sys.exit(f"ناقص: {os.path.relpath(f, ROOT)} (شغّل prep واكتب scene_draft.json)")
    # 1) المشهد
    if not newer(scene, draft, cap, vr):
        run("scene", rid, [PY, "-I", os.path.join(TOOLS, "scene_build.py"), "--draft", draft, "--captions", cap,
                           "--voice-report", vr, "--out", scene])
    sc = json.load(open(scene, encoding="utf-8"))
    errs = sc.get("errors") or []
    if errs: print("✗ scene_build errors:", *errs[:10], sep="\n"); sys.exit(1)
    dur = float(sc.get("duration") or 0)
    # 2) المكس
    if not newer(mix, scene, os.path.join(w, "voice.wav")):
        run("mix", rid, [PY, "-I", os.path.join(TOOLS, "audio_mix.py"), "--voice", os.path.join(w, "voice.wav"),
                         "--scene", scene, "--out", mix])
    # 3) الرندر (يكمل من وين وقف)
    if not newer(video, mix, scene):
        base = ["node", p("studio", "render.cjs"), "--series", series, "--data", scene, "--audio", mix,
                "--out", video, "--workers", "3", "--crf", "16"]
        n = 1 if dur <= 40 else 3
        if n == 1:
            run("render", rid, base)
        else:
            pdir = os.path.join(w, ".parts")
            for k in range(1, n + 1):
                if os.path.exists(os.path.join(pdir, f"p{k}.mp4")): continue
                if (time.time() - T0) / 60 > a.max_minutes - 3.5:
                    print(json.dumps({"id": rid, "status": "incomplete", "rendered_parts": k - 1, "of": n,
                                      "next": f"أعد نفس الأمر: produce.py build {rid}"}, ensure_ascii=False)); sys.exit(3)
                run(f"render-p{k}", rid, base + ["--parts", str(n), "--part", str(k)])
            run("render-assemble", rid, base + ["--assemble"])
    # 4) الفحص + ورقة لقطات وحدة (≤ 900px)
    qa, rqa = os.path.join(w, "qa_video.json"), os.path.join(w, "qa.json")  # qa.json = تقرير الرندر (violations)
    if not newer(qa, video):
        # qa_video يقرأ تقرير الرندر (--qa) ويطبع التقرير النهائي على stdout
        r_ = subprocess.run([PY, "-I", os.path.join(TOOLS, "qa_video.py"), video, "--qa", rqa, "--sheets", os.path.join(w, "sheets")],
                            cwd=ROOT, capture_output=True, text=True)
        m_ = re.search(r"\{.*\}", r_.stdout, re.S)
        if not m_: print("✗ qa_video فشل:", (r_.stdout + r_.stderr)[-800:]); sys.exit(1)
        open(qa, "w", encoding="utf-8").write(m_.group(0))
    sheet = os.path.join(w, "sheet.jpg")
    if not newer(sheet, video):
        n_frames = 24; fps = n_frames / max(1.0, dur)
        run("sheet", rid, ["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", video, "-vf",
                           f"fps={fps:.5f},scale=225:-2,tile=4x6:padding=2:color=black", "-frames:v", "1", "-q:v", "4", sheet])
    # 5) الغلاف
    cover = os.path.join(w, "cover.jpg")
    if not newer(cover, scene) or a.cover_t is not None:
        ct = a.cover_t if a.cover_t is not None else 1.0
        run("cover", rid, ["node", os.path.join(TOOLS, "snap.cjs"), "--series", series, "--data", scene,
                           "--t", str(ct), "--out", os.path.join(w, "cover"), "--cover"])
        json.dump({"cover_t": ct}, open(os.path.join(w, "cover_t.json"), "w"))
    # 6) الحقوق + النسخ للمستودع
    run("credits", rid, [PY, "-I", os.path.join(TOOLS, "make_credits.py"), "--id", rid, "--voice-report", vr,
                         "--mix-report", mix + ".report.json", "--scene", scene])
    prod = p("content", "production", rid); os.makedirs(prod, exist_ok=True)
    for src, dst in (("scene_draft.json", "scene_draft.json"), ("scene.json", "scene.json"), ("captions.json", "captions.json"),
                     ("voice_report.json", "voice_report.json"), ("qa_video.json", "qa_report.json")):
        if os.path.exists(os.path.join(w, src)): shutil.copyfile(os.path.join(w, src), os.path.join(prod, dst))
    q = json.load(open(qa, encoding="utf-8"))
    rq = json.load(open(rqa, encoding="utf-8")) if os.path.exists(rqa) else {}
    mr = json.load(open(mix + ".report.json", encoding="utf-8")) if os.path.exists(mix + ".report.json") else {}
    print(json.dumps({"id": rid, "status": "built", "duration": q.get("duration"), "size_mb": q.get("size_mb"),
                      "lufs": q.get("lufs", mr.get("lufs")), "true_peak": q.get("true_peak", mr.get("true_peak")),
                      "issues": q.get("issues"), "violations": rq.get("violations"),
                      "console_errors": len(rq.get("console_errors") or []), "sheet": os.path.relpath(sheet, ROOT), "cover": os.path.relpath(cover, ROOT),
                      "minutes": round((time.time() - T0) / 60, 1),
                      "next": "افتح sheet.jpg (صورة وحدة) وتأكد، ثم sign-upload مرتين ثم produce.py upload"}, ensure_ascii=False))


# ---------------------------------------------------------------- upload
def upload(a):
    rid = a.id; r = row_of(rid); w = p("work", rid)
    def up(sign, f, kind):
        out = subprocess.run(["bash", os.path.join(TOOLS, "cloudinary_upload.sh"), sign, f, kind], cwd=ROOT,
                             capture_output=True, text=True)
        try: j = json.loads(out.stdout)
        except Exception: j = {}
        if out.returncode != 0 or not j.get("secure_url"):
            print(f"✗ رفع {kind} فشل:", (out.stdout + out.stderr)[-600:]); sys.exit(1)
        return j
    v = up(a.sign, os.path.join(w, "video.mp4"), "video")
    c = up(a.cover_sign, os.path.join(w, "cover.jpg"), "image") if a.cover_sign else {}
    q = json.load(open(os.path.join(w, "qa_video.json"), encoding="utf-8"))
    ct = json.load(open(os.path.join(w, "cover_t.json"))).get("cover_t") if os.path.exists(os.path.join(w, "cover_t.json")) else 1.0
    vr = json.load(open(os.path.join(w, "voice_report.json"), encoding="utf-8"))
    voice = a.voice or (f"{vr.get('provider')} ({vr.get('model')})" if vr.get("provider") == "gemini" else vr.get("provider"))
    upj = {"video_url": v["secure_url"], "video_asset_id": v.get("asset_id"), "cover_url": c.get("secure_url"),
           "cover_asset_id": c.get("asset_id"), "cover_t": ct, "duration": q.get("duration"), "size_mb": q.get("size_mb"), "voice": voice}
    json.dump(upj, open(p("content", "production", rid, "upload.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    note = f"مدة {q.get('duration')}ث، QA بدون issues" + (f"، {a.note}" if a.note else "")
    subprocess.run([PY, p("scripts", "cal.py"), "set", rid, "status=فيديو جاهز", f"cloudinary={v['secure_url']}",
                    f"voice={voice}", f"notes+={note}"], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
    subprocess.run(["bash", p("scripts", "git_save.sh"), f"فيديو جاهز {rid}"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(json.dumps({"id": rid, "status": "فيديو جاهز", "video": v["secure_url"], "cover": c.get("secure_url")}, ensure_ascii=False))


def main():
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
    x = sub.add_parser("prep"); x.add_argument("id"); x.add_argument("--provider", default="gemini", choices=["gemini", "elevenlabs"])
    x.add_argument("--audio"); x.add_argument("--redo-voice", action="store_true")
    x = sub.add_parser("build"); x.add_argument("id"); x.add_argument("--cover-t", type=float); x.add_argument("--max-minutes", type=float, default=9)
    x = sub.add_parser("upload"); x.add_argument("id"); x.add_argument("--sign", required=True); x.add_argument("--cover-sign")
    x.add_argument("--voice"); x.add_argument("--note")
    a = ap.parse_args()
    {"prep": prep, "build": build, "upload": upload}[a.cmd](a)


if __name__ == "__main__":
    main()
