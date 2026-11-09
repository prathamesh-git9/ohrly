"""Synthesizes speech with one model load. Run with the Python of the piper-tts environment.

Reads a JSON list of [text, wav_path] pairs from stdin. Each clip is written to its own named path,
so audio can never be paired with the wrong text the way matching output files by order could.
"""
import json
import sys
import wave

from piper import PiperVoice
from piper.config import SynthesisConfig


def main() -> None:
    model, speaker = sys.argv[1], sys.argv[2]
    config = SynthesisConfig(speaker_id=None if speaker == "none" else int(speaker))
    voice = PiperVoice.load(model)
    jobs = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    for text, path in jobs:
        with wave.open(path, "wb") as out:
            voice.synthesize_wav(text, out, syn_config=config)


if __name__ == "__main__":
    main()
