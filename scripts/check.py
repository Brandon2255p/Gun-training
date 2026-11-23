# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = ["faster-whisper>=1.1", "soundfile>=0.12", "numpy>=1.26"]
# ///
"""Listens back to every voiced line with Whisper and flags any that don't say what the script says.

Narration is legal and safety material, so a mispronounced or skipped word matters. Lines whose
word error rate is over the threshold are listed; fix them with pronunciation.json or a "say" field.

Usage: uv run --script scripts/check.py [episode ids...] [--threshold 0.15]
"""

from __future__ import annotations

import json
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOICE = ROOT / "public" / "generated" / "voice"
INDEX = ROOT / "src" / "generated" / "episodes.json"

NUMBERS = {"0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten"}


def norm(text: str) -> list[str]:
    words = re.sub(r"[^a-z0-9' ]", " ", text.lower().replace("-", " ")).split()
    return [NUMBERS.get(w, w) for w in words]


def wer(ref: list[str], hyp: list[str]) -> float:
    m = SequenceMatcher(a=ref, b=hyp, autojunk=False)
    matched = sum(b.size for b in m.get_matching_blocks())
    return 1 - matched / max(1, len(ref))


def main() -> None:
    args = sys.argv[1:]
    threshold = 0.15
    if "--threshold" in args:
        i = args.index("--threshold")
        threshold = float(args[i + 1])
        del args[i : i + 2]
    if not INDEX.exists():
        sys.exit("Run prepare first.")
    from faster_whisper import WhisperModel

    model = WhisperModel("base.en", device="cpu", compute_type="int8", download_root=str(ROOT / ".cache" / "whisper"))
    bad = 0
    total = 0
    for ep in json.loads(INDEX.read_text())["episodes"]:
        if args and ep["id"] not in args:
            continue
        for scene in ep["scenes"]:
            for line in scene.get("lines", []) + scene.get("reveal", []):
                total += 1
                segments, _ = model.transcribe(str(VOICE / f"{line['id']}.wav"), language="en", beam_size=5)
                heard = " ".join(s.text for s in segments).strip()
                ref = line.get("say", line["text"])
                score = wer(norm(ref), norm(heard))
                if score > threshold:
                    bad += 1
                    print(f"✗ {line['id']}  ({score:.0%} off)\n    script: {ref}\n    heard:  {heard}")
    print(f"\n{total - bad}/{total} lines OK" + ("" if bad == 0 else f", {bad} to check"))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
