#!/usr/bin/env python3
"""
voice_pipeline.py — من نص التعليق الصوتي إلى صوت جاهز + توقيت كل كلمة. أداة صانع الفيديو.

الحالتين:
  A) ElevenLabs (الأساسي): صانع الفيديو يولّد الصوت بموصل ElevenLabs وينزّله، ثم:
     python3 -I studio/tools/voice_pipeline.py --audio work/<ID>/voice_raw.mp3 --provider elevenlabs \
         --voice-text work/<ID>/voice.txt --caption-text work/<ID>/caption.txt --out work/<ID>/
  B) Gemini (الاحتياطي، Charon):
     python3 -I studio/tools/voice_pipeline.py --provider gemini \
         --voice-text work/<ID>/voice.txt --caption-text work/<ID>/caption.txt --out work/<ID>/

الخطوات: (TTS لو gemini) ← قص السكوت من الأطراف ← تفريغ Whisper + مطابقة النص ← (gemini: ضبط السرعة لتطابق فهد)
         ← تصحيح بدايات الجمل بـ silencedetect ← حفظ:
  out/voice.wav (48kHz mono)، out/words.json (الكلمات بتوقيتها + نتيجة المطابقة)، out/voice_report.json
كود الخروج: 0 = نجح والتطابق >= 0.85 ؛ 2 = التطابق ضعيف (أعد التوليد مرة، وبعدها انتقل للاحتياطي) ؛ 1 = خطأ.
"""
import argparse, base64, json, os, re, subprocess, sys, time, urllib.request, urllib.error, wave

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import transcribe as T  # noqa: E402

PROV = json.load(open(os.path.join(ROOT, "brand", "voice-providers.json"), encoding="utf-8"))
MATCH_OK = 0.85

def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)

def gemini_tts(text, out_wav):
    g = PROV["gemini"]
    key = os.environ.get(g["api_key_env"])
    if not key: raise SystemExit("GEMINI_API_KEY missing")
    body = {"contents": [{"parts": [{"text": g["style"] + "\n\n" + text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": g["voice"]}}}}}
    url = g["api"].format(model=g["model"])
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                         headers={"Content-Type": "application/json", "x-goog-api-key": key})
            r = json.load(urllib.request.urlopen(req, timeout=300))
            data = r["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
            pcm = base64.b64decode(data)
            w = wave.open(out_wav, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(g["sample_rate"])
            w.writeframes(pcm); w.close()
            return
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}: {e.read().decode()[:300]}"
            if e.code not in (429, 500, 502, 503, 504): break
        except Exception as e:  # noqa: BLE001
            last = str(e)
        time.sleep(5 * (attempt + 1))
    raise SystemExit(f"gemini TTS failed: {last}")

def provider_text(text, provider):
    """يطبّق استبدالات النطق الخاصة بالمزوّد (brand/voice-providers.json → <provider>.replacements)."""
    for rule in PROV.get(provider, {}).get("replacements", []):
        if rule.get("regex"): text = re.sub(rule["from"], rule["to"], text)
        else: text = text.replace(rule["from"], rule["to"])
    return text

def split_chunks(text, limit=1100):
    """نقسم النصوص الطويلة على حدود الجمل (Gemini يتعامل أفضل مع مقاطع أقصر)."""
    if len(text) <= limit: return [text]
    parts = re.split(r"(?<=[\.\!\؟\?…])\s+|\n+", text)
    chunks, cur = [], ""
    for p in parts:
        if cur and len(cur) + len(p) + 1 > limit: chunks.append(cur.strip()); cur = ""
        cur += " " + p
    if cur.strip(): chunks.append(cur.strip())
    return chunks

def trim_and_resample(src, dst, tempo=1.0, pitch=1.0):
    """pitch < 1 ينزّل طبقة الصوت بدون ما يغيّر المدة (asetrate ثم atempo يعوّض)."""
    af = ["silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05",
          "areverse", "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05", "areverse",
          "apad=pad_dur=0.25"]
    if abs(pitch - 1.0) > 0.005:
        af[0:0] = ["aresample=48000", f"asetrate={48000 * pitch:.1f}", "aresample=48000", f"atempo={tempo / pitch:.4f}"]
    elif abs(tempo - 1.0) > 0.005:
        af.insert(0, f"atempo={tempo:.4f}")
    run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-af", ",".join(af), "-ac", "1", "-ar", "48000",
         "-c:a", "pcm_s16le", dst])

def silence_onsets(wav, noise="-38dB", d=0.12):
    p = subprocess.run(["ffmpeg", "-nostdin", "-i", wav, "-af", f"silencedetect=noise={noise}:d={d}", "-f", "null", "-"],
                       capture_output=True, text=True)
    return [float(m) for m in re.findall(r"silence_end: ([\d.]+)", p.stderr)]

def refine_starts(words, onsets, window=0.35):
    """أول كلمة في كل جملة (بعد سكتة) تنضبط على نهاية السكتة اللي حددها silencedetect."""
    fixed = 0
    for i, w in enumerate(words):
        sentence_start = i == 0 or (w["start"] - words[i - 1]["end"] > 0.2) or re.search(r"[\.\!\؟\?،,:]$", words[i - 1]["w"])
        if not sentence_start or not onsets: continue
        near = min(onsets, key=lambda o: abs(o - w["start"]))
        if abs(near - w["start"]) <= window and near < w["end"] - 0.05:
            w["start"] = round(near, 3); fixed += 1
    return fixed

def words_per_s(words):
    if len(words) < 2: return 0
    return len(words) / max(0.1, words[-1]["end"] - words[0]["start"])

def transcribe(wav, voice_text, caption_text, model):
    audio = T.load_audio(wav)
    segs, info = model.transcribe(audio, language="ar", word_timestamps=True, beam_size=5,
                                  condition_on_previous_text=False, vad_filter=False)
    words, text = [], []
    for s in segs:
        text.append(s.text.strip())
        for w in (s.words or []):
            words.append({"w": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3), "p": round(w.probability, 3)})
    full = " ".join(text)
    m = T.match(voice_text, full)
    if caption_text:
        mc = T.match(caption_text, full)
        if mc["score"] > m["score"]: m = dict(mc, against="caption")
    return words, full, m

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--provider", choices=["elevenlabs", "gemini"], required=True)
    ap.add_argument("--audio", help="ملف الصوت المنزّل من ElevenLabs")
    ap.add_argument("--voice-text", required=True); ap.add_argument("--caption-text")
    ap.add_argument("--out", required=True); ap.add_argument("--no-tempo", action="store_true")
    ap.add_argument("--prepare-only", action="store_true",
                    help="يكتب out/voice_<provider>.txt بعد استبدالات المزوّد ويطلع (استخدمه قبل ElevenLabs)")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    voice_text = open(a.voice_text, encoding="utf-8").read().strip()
    caption_text = open(a.caption_text, encoding="utf-8").read().strip() if a.caption_text else ""
    tts_text = provider_text(voice_text, a.provider)
    open(os.path.join(a.out, f"voice_{a.provider}.txt"), "w", encoding="utf-8").write(tts_text)
    if a.prepare_only:
        print(tts_text); return
    raw = a.audio
    if a.provider == "gemini":
        chunks = split_chunks(tts_text)
        parts = []
        for i, c in enumerate(chunks):
            p = os.path.join(a.out, f"gemini_part{i}.wav"); gemini_tts(c, p); parts.append(p)
        raw = os.path.join(a.out, "voice_raw.wav")
        if len(parts) == 1: os.replace(parts[0], raw)
        else:
            lst = os.path.join(a.out, "parts.txt")
            open(lst, "w").write("".join(f"file '{os.path.abspath(p)}'\n" for p in parts))
            run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", raw])
    if not raw or not os.path.exists(raw): raise SystemExit("no audio")

    from faster_whisper import WhisperModel
    model = WhisperModel(os.environ.get("WHISPER_MODEL", "large-v3-turbo"), device="cpu", compute_type="int8",
                         cpu_threads=os.cpu_count() or 4)
    out_wav = os.path.join(a.out, "voice.wav")
    trim_and_resample(raw, out_wav)
    words, full, m = transcribe(out_wav, voice_text, caption_text, model)
    tempo = 1.0
    if a.provider == "gemini" and not a.no_tempo and words:
        g = PROV["gemini"]; wps = words_per_s(words)
        tempo = max(g["tempo_clamp"][0], min(g["tempo_clamp"][1], g["target_words_per_s"] / max(0.5, wps)))
        if abs(tempo - 1.0) > 0.02:
            trim_and_resample(raw, out_wav, tempo)
            words, full, m = transcribe(out_wav, voice_text, caption_text, model)
        else:
            tempo = 1.0
    pitch = 1.0
    if a.provider == "gemini" and not a.no_tempo:
        import voice_profile as VP
        x, sr = VP.load(out_wav)
        f0 = VP.f0_track(x, sr)
        g = PROV["gemini"]
        if len(f0) > 50:
            med = float(sorted(f0)[len(f0) // 2])
            if med > g.get("pitch_max_hz", 150):
                pitch = max(g.get("pitch_min_ratio", 0.89), min(1.0, g.get("pitch_target_hz", 140) / med))
                trim_and_resample(raw, out_wav, tempo, pitch)
                words, full, m = transcribe(out_wav, voice_text, caption_text, model)
    fixed = refine_starts(words, silence_onsets(out_wav))
    dur = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out_wav]).stdout)
    res = {"provider": a.provider, "duration": round(dur, 3), "tempo": round(tempo, 4), "pitch_ratio": round(pitch, 4), "text": full,
           "match": m, "starts_refined": fixed, "words_per_s": round(words_per_s(words), 2), "words": words}
    json.dump(res, open(os.path.join(a.out, "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    rep = {k: v for k, v in res.items() if k != "words"}
    json.dump(rep, open(os.path.join(a.out, "voice_report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps(rep, ensure_ascii=False, indent=1))
    sys.exit(0 if m["score"] >= MATCH_OK else 2)

if __name__ == "__main__":
    main()
