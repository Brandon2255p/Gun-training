# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = ["kokoro-onnx>=0.6.1", "soundfile>=0.12", "numpy>=1.26", "faster-whisper>=1.1", "pillow>=10"]
# ///
"""Voices every episode in episodes/*.json and writes what the videos need.

- public/generated/voice/<line>.wav   one voiced line each
- public/generated/music.wav          a quiet, synthesised music bed (nothing to license)
- src/generated/episodes.json         every episode with each line's duration, mouth cues and word timings

Backends (series.json "backend"):
- "kokoro" (default): Kokoro-82M runs here, on the CPU. It reports each phoneme's duration, so the
  mouth and the captions follow the voice exactly. Run scripts/setup.sh once first.
- "openai": any OpenAI-compatible speech server, e.g. your Unsloth server. It returns audio only, so
  Whisper times the words and the phonemes are spread across each word (looser sync).
  The key is read from the environment variable named in series.json ("keyEnv"), never from a file.

Lines that haven't changed aren't voiced again.

Usage: uv run --script scripts/prepare.py [episode ids...]
"""

from __future__ import annotations

import io
import json
import os
import re
import sys
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"
MODEL = CACHE / "kokoro-ts" / "model_quantized.onnx"
VOICES = CACHE / "voices-v1.0.bin"
OUT = ROOT / "public" / "generated"
GEN = ROOT / "src" / "generated"
# Bump when the timing logic changes, so every line is prepared again
TIMING_VERSION = 1
LANG = "en-gb"

# Phonemes (espeak IPA, as Kokoro speaks them) to mouth shapes, named after Rhubarb Lip Sync's:
# https://github.com/DanielSWolf/rhubarb-lip-sync#mouth-shapes
SHAPES = {
    **dict.fromkeys("pbm", "A"),  # lips pressed
    **dict.fromkeys("aɑɒ", "D"),  # wide open
    **dict.fromkeys("ɛeæʌɐəᵻ", "C"),  # open
    **dict.fromkeys("ɔoɜɚɝ", "E"),  # rounded
    **dict.fromkeys("uʊw", "F"),  # puckered
    **dict.fromkeys("fv", "G"),  # teeth on lip
    "l": "H",  # tongue up
}
STRESS = "ˈˌ"
LONG = "ː"
PAUSE = 0.12
MIN_CUE = 0.05
VISIBILITY = "XBHGAFECD"
LEAD = 0.03


@dataclass
class Timing:
    phoneme: str
    start: float
    end: float


def shape_of(phoneme: str) -> str | None:
    if phoneme in SHAPES:
        return SHAPES[phoneme]
    return "B" if phoneme.isalpha() else None


def mouth_cues(timings: list[Timing]) -> list[dict]:
    segments: list[list] = []
    carry = None
    for t in timings:
        if t.phoneme in STRESS:
            carry = t.start if carry is None else carry
            continue
        if t.phoneme == LONG and segments:
            segments[-1][1] = t.end
            continue
        start = carry if carry is not None else t.start
        carry = None
        segments.append([start, t.end, shape_of(t.phoneme)])

    cues: list[list] = []
    for start, end, shape in segments:
        if shape is None:
            short = end - start < PAUSE and cues and cues[-1][2] != "X"
            shape = cues[-1][2] if short else "X"
        if cues and cues[-1][2] == shape:
            cues[-1][1] = end
        else:
            cues.append([start, end, shape])

    def merge(i: int, j: int) -> None:
        a, b = cues[i], cues[j]
        keep = a[2] if VISIBILITY.index(a[2]) >= VISIBILITY.index(b[2]) else b[2]
        cues[i] = [min(a[0], b[0]), max(a[1], b[1]), keep]
        del cues[j]

    i = 0
    while i < len(cues) and len(cues) > 1:
        s, e, v = cues[i]
        if e - s >= MIN_CUE or v == "X":
            i += 1
            continue
        prev_ok = i > 0 and cues[i - 1][2] != "X"
        next_ok = i + 1 < len(cues) and cues[i + 1][2] != "X"
        if not (prev_ok or next_ok):
            i += 1
            continue
        if prev_ok and (
            not next_ok
            or cues[i - 1][1] - cues[i - 1][0] <= cues[i + 1][1] - cues[i + 1][0]
        ):
            merge(i - 1, i)
            i -= 1
        else:
            merge(i, i + 1)
        while i + 1 < len(cues) and cues[i][2] == cues[i + 1][2]:
            merge(i, i + 1)
        while i > 0 and cues[i - 1][2] == cues[i][2]:
            merge(i - 1, i)
            i -= 1

    if not cues or cues[0][0] > 0:
        cues.insert(0, [0.0, cues[0][0] if cues else 0.0, "X"])
    if cues[-1][2] != "X":
        cues.append([cues[-1][1], cues[-1][1] + 0.5, "X"])
    return [
        {"start": round(max(0.0, s - LEAD), 3), "end": round(max(0.0, e - LEAD), 3), "value": v}
        for s, e, v in cues
    ]


# ---------- pronunciation ----------

def load_lexicon() -> dict[str, str]:
    path = ROOT / "pronunciation.json"
    if not path.exists():
        return {}
    return {k: v for k, v in json.loads(path.read_text()).items() if not k.startswith("_")}


def spoken_words(words: list[str], lexicon: dict[str, str]) -> list[str]:
    """Each displayed word as it should be said (lexicon swaps, punctuation kept)."""
    out = []
    for w in words:
        m = re.match(r"^(\W*)(.*?)(\W*)$", w)
        pre, core, post = m.groups() if m else ("", w, "")
        out.append(pre + lexicon.get(core, core) + post)
    return out


# ---------- word timings ----------

def word_timings(phonemize, words: list[str], said: list[str], timings: list[Timing]) -> list[dict]:
    """When each displayed word is spoken, from Kokoro's phoneme timings."""
    chunks: list[list[float]] = []
    current = None
    for t in timings:
        if t.phoneme == " ":
            current = None
            continue
        if not (t.phoneme.isalpha() or t.phoneme in STRESS + LONG):
            continue
        if current is None:
            current = [t.start, t.end]
            chunks.append(current)
        else:
            current[1] = t.end
    counts = [max(1, len(phonemize(s).split())) for s in said]
    if sum(counts) != len(chunks):
        counts = [1] * len(words)
    if sum(counts) != len(chunks):
        total = timings[-1].end if timings else 1.0
        return spread(words, total)
    out, i = [], 0
    for word, n in zip(words, counts):
        out.append({"text": word, "start": round(chunks[i][0], 3), "end": round(chunks[i + n - 1][1], 3)})
        i += n
    return out


def spread(words: list[str], total: float) -> list[dict]:
    n = max(1, len(words))
    return [
        {"text": w, "start": round(i / n * total, 3), "end": round((i + 1) / n * total, 3)}
        for i, w in enumerate(words)
    ]


# ---------- backends ----------

class KokoroBackend:
    def __init__(self, voice: str, speed: float):
        if not (MODEL.exists() and VOICES.exists()):
            sys.exit("Run scripts/setup.sh first to download the Kokoro model.")
        import onnxruntime as ort
        from kokoro_onnx import Kokoro

        self.kokoro = Kokoro.from_session(ort.InferenceSession(str(MODEL)), str(VOICES))
        # kokoro-onnx looks for an output called "duration"; this export names it "durations"
        self.kokoro.has_timings = [o.name for o in self.kokoro.sess.get_outputs()][1:] == ["durations"]
        self.voice, self.speed = voice, speed
        self.key = f"kokoro|{voice}|{speed}"

    def phonemize(self, text: str) -> str:
        return self.kokoro.tokenizer.phonemize(text, LANG)

    def voice_line(self, words: list[str], said: list[str]):
        samples, rate, timings = self.kokoro.create_timed(" ".join(said), voice=self.voice, speed=self.speed, lang=LANG)
        if not timings:
            sys.exit("The Kokoro model reported no phoneme timings. Run scripts/setup.sh.")
        ts = [Timing(t.phoneme, t.start, t.end) for t in timings]
        return samples, rate, mouth_cues(ts), word_timings(self.phonemize, words, said, ts)


class OpenAIBackend:
    """An OpenAI-compatible /audio/speech server; Whisper recovers the word timings."""

    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.api_key = os.environ.get(cfg.get("keyEnv", "UNSLOTH_API_KEY"), "")
        if not self.api_key:
            sys.exit(f"Set {cfg.get('keyEnv', 'UNSLOTH_API_KEY')} to use the openai backend.")
        from faster_whisper import WhisperModel
        from kokoro_onnx.tokenizer import Tokenizer

        self.tokenizer = Tokenizer()
        self.whisper = WhisperModel("base.en", device="cpu", compute_type="int8", download_root=str(CACHE / "whisper"))
        self.key = f"openai|{cfg['baseUrl']}|{cfg['model']}|{cfg['voice']}"

    def phonemize(self, text: str) -> str:
        return self.tokenizer.phonemize(text, LANG)

    def voice_line(self, words: list[str], said: list[str]):
        body = json.dumps({"model": self.cfg["model"], "voice": self.cfg["voice"], "input": " ".join(said), "response_format": "wav"})
        req = urllib.request.Request(
            self.cfg["baseUrl"].rstrip("/") + "/audio/speech",
            data=body.encode(),
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=300) as r:
            samples, rate = sf.read(io.BytesIO(r.read()), dtype="float32")
        if samples.ndim > 1:
            samples = samples.mean(axis=1)
        segments, _ = self.whisper.transcribe(samples if rate == 16000 else resample(samples, rate, 16000), word_timestamps=True, language="en")
        heard = [w for s in segments for w in (s.words or [])]
        total = len(samples) / rate
        if len(heard) == len(words):
            spans = [(w.start, w.end) for w in heard]
        else:  # Whisper split or merged words: fall back to an even spread
            spans = [(x["start"], x["end"]) for x in spread(words, total)]
        timings: list[Timing] = []
        for (start, end), s in zip(spans, said):
            phones = [p for p in self.phonemize(s) if p.strip()]
            step = (end - start) / max(1, len(phones))
            timings += [Timing(p, start + k * step, start + (k + 1) * step) for k, p in enumerate(phones)]
            timings.append(Timing(" ", end, end))
        wt = [{"text": w, "start": round(a, 3), "end": round(b, 3)} for w, (a, b) in zip(words, spans)]
        return samples, rate, mouth_cues(timings), wt


def resample(x: np.ndarray, src: int, dst: int) -> np.ndarray:
    n = int(len(x) * dst / src)
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


# ---------- lines ----------

def voice(backend, lexicon: dict, line_id: str, line: dict) -> dict:
    """Voices one line (cached) and returns it with duration, mouth cues and word timings."""
    text = line["text"]
    words = text.split()
    said = line["say"].split() if "say" in line else spoken_words(words, lexicon)
    wav = OUT / "voice" / f"{line_id}.wav"
    timing = OUT / "voice" / f"{line_id}.json"
    stamp = OUT / "voice" / f"{line_id}.txt"
    key = f"{TIMING_VERSION}|{backend.key}|{text}|{' '.join(said)}"
    if not (wav.exists() and timing.exists() and stamp.exists() and stamp.read_text() == key):
        samples, rate, cues, wt = backend.voice_line(words, said)
        if "say" in line:  # different words from the caption: spread the caption over the audio
            wt = spread(words, len(samples) / rate)
        sf.write(wav, samples, rate, subtype="PCM_16")
        timing.write_text(json.dumps({"mouthCues": cues, "words": wt}))
        stamp.write_text(key)
        print(f"  voiced {line_id}: {text}")
    info = sf.info(wav)
    data = json.loads(timing.read_text())
    return {
        **line,
        "id": line_id,
        "duration": round(info.frames / info.samplerate, 3),
        "cues": data["mouthCues"],
        "words": data["words"],
    }


def as_line(x) -> dict:
    return {"text": x} if isinstance(x, str) else dict(x)


def crop_figure(ep_id: str, si: int, fig: dict) -> str:
    """Crops a figure out of a scanned page (source/pages/<page>) into public/generated/figures/."""
    from PIL import Image

    src = ROOT / "source" / "pages" / fig["page"]
    dest = OUT / "figures" / f"{ep_id}-s{si:02d}.jpg"
    dest.parent.mkdir(parents=True, exist_ok=True)
    img = Image.open(src).convert("RGB")
    if fig.get("rotate"):
        img = img.rotate(-fig["rotate"], expand=True)
    if fig.get("crop"):
        x, y, w, h = fig["crop"]
        W, H = img.size
        img = img.crop((int(x * W), int(y * H), int((x + w) * W), int((y + h) * H)))
    img.save(dest, quality=92)
    return f"generated/figures/{dest.name}"


def synth_music(path: Path, seconds: float = 64.0, rate: int = 44100) -> None:
    """A calm, slow pad loop (Am - F - C - G) with a soft pulse. Sits well under narration."""
    n = int(seconds * rate)
    t = np.arange(n) / rate
    bar = 4.0
    chords = [[45, 52, 57, 60, 64], [41, 48, 57, 60, 65], [48, 55, 60, 64, 67], [43, 50, 59, 62, 67]]

    def hz(m: float) -> float:
        return 440.0 * 2 ** ((m - 69) / 12)

    out = np.zeros(n)
    for b in range(int(seconds / bar) + 1):
        chord = chords[b % 4]
        start, end = int(b * bar * rate), min(n, int((b + 1) * bar * rate + 0.6 * rate))
        if start >= n:
            break
        seg = t[start:end] - t[start]
        env = np.minimum(1, seg / 1.2) * np.clip((bar + 0.6 - seg) / 1.0, 0, 1)
        pad = sum(np.sin(2 * np.pi * hz(m) * seg) + 0.25 * np.sin(2 * np.pi * hz(m) * 1.002 * 2 * seg) for m in chord)
        out[start:end] += 0.04 * env * pad
        for i in range(8):  # soft plucked eighths on the top notes
            ns = start + int(i * 0.5 * rate)
            ne = min(n, ns + int(0.8 * rate))
            if ns >= n:
                break
            s = t[ns:ne] - t[ns]
            note = chord[2:][i % 3] + 12
            out[ns:ne] += 0.035 * np.exp(-s * 5) * np.sin(2 * np.pi * hz(note) * s)
    fade = int(2 * rate)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    out /= np.max(np.abs(out)) / 0.7
    stereo = np.stack([out, np.roll(out, int(0.015 * rate))], axis=1)
    sf.write(path, stereo.astype(np.float32), rate, subtype="PCM_16")


def main() -> None:
    cfg = json.loads((ROOT / "series.json").read_text())
    only = set(sys.argv[1:])
    (OUT / "voice").mkdir(parents=True, exist_ok=True)
    GEN.mkdir(parents=True, exist_ok=True)
    backend = (
        OpenAIBackend(cfg["openai"]) if cfg.get("backend") == "openai" else KokoroBackend(cfg.get("voice", "bm_george"), float(cfg.get("speed", 1.0)))
    )
    lexicon = load_lexicon()

    index = GEN / "episodes.json"
    previous = {e["id"]: e for e in json.loads(index.read_text())["episodes"]} if index.exists() else {}
    episodes = []
    for path in sorted((ROOT / "episodes").glob("*.json")):
        ep = json.loads(path.read_text())
        if only and ep["id"] not in only:
            if ep["id"] in previous:
                episodes.append(previous[ep["id"]])
            continue
        print(f"{ep['id']}: {ep['title']}")
        for si, scene in enumerate(ep["scenes"]):
            if scene.get("figure"):
                scene["figureFile"] = crop_figure(ep["id"], si, scene["figure"])
            for key in ("lines", "reveal"):
                scene[key] = [
                    voice(backend, lexicon, f"{ep['id']}-s{si:02d}-{key[0]}{li:02d}", as_line(x))
                    for li, x in enumerate(scene.get(key, []))
                ]
        episodes.append(ep)

    music = OUT / "music.wav"
    if not music.exists():
        synth_music(music)
        print("  synthesised music.wav")
    index.write_text(json.dumps({"series": cfg.get("title", ""), "episodes": episodes}))
    print(f"Wrote {index} ({len(episodes)} episodes)")


if __name__ == "__main__":
    main()
