import base64, json, os, sys, urllib.request, wave
text = open(sys.argv[1], encoding="utf-8").read().strip()
out = sys.argv[2]
prompt = ("اقرأ النص التالي بلهجة سعودية بيضاء طبيعية، بصوت صانع محتوى تقني واثق وحماسي، "
          "بإيقاع سريع شوي وواضح، مع وقفات قصيرة بين الخطوات:\n\n" + text)
body = {
  "contents": [{"parts": [{"text": prompt}]}],
  "generationConfig": {"responseModalities": ["AUDIO"],
    "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Charon"}}}},
}
req = urllib.request.Request(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent",
  data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": os.environ["GEMINI_API_KEY"]})
r = json.load(urllib.request.urlopen(req, timeout=300))
part = r["candidates"][0]["content"]["parts"][0]["inlineData"]
print(part.get("mimeType"))
pcm = base64.b64decode(part["data"])
with wave.open(out, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
print("seconds", len(pcm) / 48000)
