# Audio mix: voiceover + word-synced SFX (no music), SFX ducked under speech, final -14 LUFS / -2 dBTP.
# usage: python3 -I src/mix.py  (run from the project root)
import json, re, subprocess

VO_SRC, VO_TRIM = "audio/vo_take1.wav", 0.25
cues = json.load(open("audio/sfx_cues.json"))
T_END = cues["end"]
SR = 48000
SFX_TRIM = -5.5  # keeps the SFX stem >= 10 dB under the voice


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, check=True)


def peak_db(path):
    out = run(["ffmpeg", "-i", path, "-af", "volumedetect", "-f", "null", "-"]).stderr
    return float(re.search(r"max_volume: (-?[\d.]+) dB", out).group(1))


# 1) voiceover: trim the leading silence, 48k stereo, pre-level to about -16 LUFS
run(["ffmpeg", "-v", "error", "-y", "-ss", str(VO_TRIM), "-i", VO_SRC, "-af",
     f"aresample={SR},loudnorm=I=-16:TP=-3:LRA=11,apad=whole_dur={T_END}", "-ac", "2", "-t", str(T_END), "audio/stem_vo.wav"])

# 2) SFX bed: every effect peak-normalised to -1 dBFS, then set to its cue gain (-3..-16 dB) and placed at its cue time
inputs, chains = [], []
peaks = {}
for i, (t, name, gain) in enumerate(cues["cues"]):
    base, _, dur = name.partition(":")
    path = f"audio/sfx/{base}.wav"
    if path not in peaks:
        peaks[path] = peak_db(path)
    inputs += ["-i", path]
    norm = -1.0 - peaks[path]
    trim = f"atrim=0:{dur},afade=t=out:st={float(dur) - 0.15}:d=0.15," if dur else ""
    ms = max(0, int(round(t * 1000)))
    chains.append(f"[{i}:a]{trim}aresample={SR},volume={norm + gain + SFX_TRIM:.2f}dB,adelay={ms}|{ms}[s{i}]")
n = len(cues["cues"])
graph = ";".join(chains) + ";" + "".join(f"[s{i}]" for i in range(n)) + f"amix=inputs={n}:normalize=0:dropout_transition=0,apad=whole_dur={T_END}[bed]"
run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[bed]", "-t", str(T_END), "-ac", "2", "audio/stem_sfx.wav"])

# 3) duck the SFX under the voice (~35-40% / about -4 dB while speech is present), sum, then loudness-normalise
duck = ("[1:a]asplit=2[sc][vo];[0:a][sc]sidechaincompress=threshold=0.02:ratio=3:attack=8:release=260:makeup=1[ducked];"
        "[vo][ducked]amix=inputs=2:normalize=0[mix]")
run(["ffmpeg", "-v", "error", "-y", "-i", "audio/stem_sfx.wav", "-i", "audio/stem_vo.wav", "-filter_complex", duck, "-map", "[mix]", "audio/premix.wav"])
first = run(["ffmpeg", "-i", "audio/premix.wav", "-af", "loudnorm=I=-14:TP=-2:LRA=11:print_format=json", "-f", "null", "-"]).stderr
m = json.loads(first[first.rindex("{"):first.rindex("}") + 1])
ln = (f"loudnorm=I=-14:TP=-2:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
run(["ffmpeg", "-v", "error", "-y", "-i", "audio/premix.wav", "-af", f"{ln},aresample={SR}", "-ar", str(SR), "audio/final_mix.wav"])


def loud(path):
    out = run(["ffmpeg", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    i = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", out)[-1])
    tp = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", out)[-1])
    return i, tp


vo_i, _ = loud("audio/stem_vo.wav")
sfx_i, _ = loud("audio/stem_sfx.wav")
fi, ftp = loud("audio/final_mix.wav")
print(f"VO stem {vo_i:.1f} LUFS | SFX stem {sfx_i:.1f} LUFS (gap {vo_i - sfx_i:.1f} dB) | final {fi:.1f} LUFS, true peak {ftp:.1f} dBTP")
