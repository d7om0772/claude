import json, sys, subprocess, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8", cpu_threads=4)
raw = subprocess.run(["ffmpeg","-v","error","-i",sys.argv[1],"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True,check=True).stdout
audio = np.frombuffer(raw, np.float32)
segs, info = m.transcribe(audio, language="ar", word_timestamps=True, beam_size=5,
                          initial_prompt="المذربورد، الرام، كرت الشاشة، كيابل الباور، الإقلاع")
words = []
for s in segs:
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text}")
    for w in s.words:
        words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)})
json.dump(words, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(words), "words")
