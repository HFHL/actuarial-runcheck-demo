"""Build Mandarin narration and timed captions from the walkthrough script."""
import json
import math
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parent
script = json.loads((root / "script.json").read_text())
shots = json.loads((root / "capture.json").read_text())
assert len(script) == len(shots)
fps = 24
frame = 0
captions = []
scenes = []

def run(*args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL)

with tempfile.TemporaryDirectory(prefix="actuarial-narration-") as path:
    temp = Path(path)
    wavs = []
    for i, (shot, (chapter, title, text, narration)) in enumerate(zip(shots, script)):
        source = temp / f"{i}.aiff"
        wav = temp / f"{i}.wav"
        run("say", "-v", "Tingting", "-r", "205", "-o", str(source), narration)
        duration = float(subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(source),
        ]))
        frames = max(72, math.ceil((duration + 0.65) * fps))
        run("ffmpeg", "-loglevel", "error", "-i", str(source), "-af",
            "adelay=220,apad", "-t", f"{frames/fps:.6f}", "-ar", "48000",
            "-ac", "1", str(wav))
        wavs.append(f"file '{wav}'")
        scenes.append({**shot, "chapter": chapter, "title": title, "from": frame, "frames": frames})
        captions.append({"text": text, "startMs": round(frame * 1000 / fps),
                         "endMs": round((frame + frames) * 1000 / fps),
                         "timestampMs": None, "confidence": None})
        frame += frames
    concat = temp / "concat.txt"
    concat.write_text("\n".join(wavs))
    run("ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", str(concat), "-c:a", "aac", "-b:a", "128k", str(root / "public/narration.m4a"))

(root / "timeline.json").write_text(json.dumps(
    {"fps": fps, "frames": frame, "scenes": scenes, "captions": captions},
    ensure_ascii=False, indent=2
))
