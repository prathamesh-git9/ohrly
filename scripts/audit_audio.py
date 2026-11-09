"""Checks generated speech by transcribing it and comparing with the text it should say.

Run with the Python of the venv that has faster-whisper:
    python scripts/audit_audio.py --lang de --sample 300

Machine transcription misses some correct clips, so a flagged clip is a prompt to listen, not proof of
a fault. What this reliably catches is audio paired with the wrong text, and clips that are garbled.
"""
import argparse
import difflib
import json
import random
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent


def words(text: str) -> list[str]:
    return re.findall(r"[\w']+", text.lower())


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", required=True, choices=("de", "en"))
    ap.add_argument("--sample", type=int, default=300, help="How many clips to check, 0 for all")
    ap.add_argument("--min-words", type=int, default=2, help="Skip clips with fewer words than this")
    ap.add_argument("--flag-below", type=float, default=0.5, help="Flag clips matching less than this")
    args = ap.parse_args()

    folder = ROOT / "public" / "audio" / args.lang
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    items = [(k, v) for k, v in manifest.items() if len(words(k)) >= args.min_words]
    random.Random(7).shuffle(items)
    if args.sample:
        items = items[: args.sample]

    model = WhisperModel("base", device="cpu", compute_type="int8", cpu_threads=4)
    scores: list[float] = []
    flagged: list[tuple[float, str, str]] = []
    for text, file in items:
        segments, _ = model.transcribe(decode(folder / file), language=args.lang, beam_size=1, vad_filter=False)
        heard = " ".join(s.text for s in segments).strip()
        a, b = words(text), words(heard)
        match = sum(m.size for m in difflib.SequenceMatcher(None, a, b).get_matching_blocks())
        score = match / max(1, len(a))
        scores.append(score)
        if score < args.flag_below:
            flagged.append((score, text, heard))

    print(f"{args.lang}: checked {len(scores)} clips, mean word match {sum(scores) / max(1, len(scores)):.3f}, flagged {len(flagged)}")
    for score, text, heard in sorted(flagged)[:40]:
        print(f"  {score:.2f}  {text}  ->  {heard}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
