#!/usr/bin/env python3
"""
qa_video.py — فحص تقني نهائي للفيديو قبل الرفع + ورقة لقطات كل 0.5 ثانية.

  python3 -I studio/tools/qa_video.py work/<ID>/video.mp4 [--qa work/<ID>/qa.json] [--sheets work/<ID>/sheets]

يتحقق من: 1080×1920، 30fps، H.264 yuv420p، صوت AAC ~192k 48kHz، الصوت −14±1 LUFS، الحجم < max_upload_mb،
ونتائج qa.json من الرندر (المناطق الآمنة والتداخل وأخطاء الصفحة).
ينتج أوراق لقطات (كل 0.5ث، 8×4 لكل ورقة = 16 ثانية) عشان تشوفها بعينك وتقارنها بمعاينة الحزمة.
كود الخروج 0 = ناجح، 1 = فيه مشاكل (التفاصيل في الطباعة).
"""
import argparse, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CFG = json.load(open(os.path.join(ROOT, "config.json"), encoding="utf-8"))["video"]

def probe(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", p], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("video"); ap.add_argument("--qa"); ap.add_argument("--sheets")
    a = ap.parse_args()
    info = probe(a.video); issues = []
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    au = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    if not v: issues.append("no video stream")
    else:
        if (v["width"], v["height"]) != (CFG["width"], CFG["height"]): issues.append(f"resolution {v['width']}x{v['height']}")
        num, den = map(int, v["r_frame_rate"].split("/"))
        if abs(num / den - CFG["fps"]) > 0.01: issues.append(f"fps {num/den}")
        if v["codec_name"] != "h264": issues.append(f"codec {v['codec_name']}")
        if v.get("pix_fmt") != "yuv420p": issues.append(f"pix_fmt {v.get('pix_fmt')}")
    if not au: issues.append("no audio stream")
    else:
        if au["codec_name"] != "aac": issues.append(f"audio codec {au['codec_name']}")
        br = int(au.get("bit_rate", 0) or 0)
        if br and not (150_000 <= br <= 230_000): issues.append(f"audio bitrate {br}")
    size_mb = int(info["format"]["size"]) / 1e6
    if size_mb > CFG["max_upload_mb"]: issues.append(f"size {size_mb:.1f}MB > {CFG['max_upload_mb']}MB (أعد الترميز بـ crf أعلى)")
    p = subprocess.run(["ffmpeg", "-nostdin", "-i", a.video, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    I = re.findall(r"I:\s+(-?[\d.]+) LUFS", p.stderr); TP = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", p.stderr)
    lufs = float(I[-1]) if I else None
    if lufs is None or abs(lufs - CFG["loudness_lufs"]) > 1.0: issues.append(f"loudness {lufs} LUFS (target {CFG['loudness_lufs']})")
    rq = {}
    if a.qa and os.path.exists(a.qa):
        rq = json.load(open(a.qa, encoding="utf-8"))
        vio = rq.get("violations", [])
        if vio:
            kinds = {}
            for x in vio: kinds.setdefault(x["type"], []).append(x)
            for k, xs in kinds.items(): issues.append(f"layout {k}: {len(xs)} (أول واحد t={xs[0]['t']}: {json.dumps(xs[0], ensure_ascii=False)})")
        errs = [e for e in rq.get("console_errors", []) if "brand/logo" not in e and "ERR_FILE_NOT_FOUND" not in e and "PCFSoftShadowMap" not in e]
        if errs: issues.append(f"page errors: {errs[:3]}")
    sheets = []
    if a.sheets:
        os.makedirs(a.sheets, exist_ok=True)
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", a.video, "-vf", "fps=2,scale=216:-2,tile=8x4:padding=4:color=white",
                        os.path.join(a.sheets, "sheet_%02d.jpg")], check=True)
        sheets = sorted(os.path.join(a.sheets, f) for f in os.listdir(a.sheets) if f.startswith("sheet_"))
    rep = {"video": a.video, "duration": float(info["format"]["duration"]), "size_mb": round(size_mb, 1), "lufs": lufs,
           "true_peak": float(TP[-1]) if TP else None, "issues": issues, "sheets": sheets}
    print(json.dumps(rep, ensure_ascii=False, indent=1))
    sys.exit(1 if issues else 0)

if __name__ == "__main__":
    main()
